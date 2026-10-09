import { test, expect } from 'claude-code/testing'

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false } } as const
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)) }
const TURN = { answer: '', durationMs: 0, isAborted: false, turnId: 't', reason: 'answer' } as const

function base(on: any, sent: string[], lastText: string, clearFails = false) {
  on('session.usage', () => ({ value: { startedAt: 0, rateLimits: [], context: { tokens: 450_000, window: 1_000_000 } } }))
  on('session.id', () => ({ value: 'sid-1' }))
  on('session.messages', () => ({ value: [{ role: 'assistant', text: lastText, toolUses: [] }] }))
  on('turn.complete', () => ({ text: '' }))
  on('session.end', (_$: any, e: any) => ({ sessionId: e.sessionId }))
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>host</Text>
  })
  on('command.run', (_$: any, e: any) => {
    sent.push(`${e.command} ${e.args}`.trim())
    if (clearFails && e.command === 'clear') throw new Error('not allowed')
    return {}
  })
}

async function stashThenFinish($: any) {
  await $.turn.complete(TURN)
  const ui = await $.ui.mount({ plugin: 'context-band', surface: 'desktop', ...BAND })
  await ui.press({ key: 'handoff' })
  await $.turn.complete(TURN)
  await settle()
  return ui
}

test('one press: stash, then clear and resume by themselves', async ($, on) => {
  const sent: string[] = []
  base(on, sent, '**Stashed as `band-phase-two`** -> ~/.claude/stash/band-phase-two.md')
  const ui = await stashThenFinish($)
  expect(await ui.find({ key: 'clear-resume' })).toBeUndefined()
  expect(sent).toEqual(['stash session=sid-1 auto', 'clear', 'stash:resume band-phase-two auto'])
  await ui.unmount()
})

test('when the mod cannot clear, a manual /clear still resumes the right stash', async ($, on) => {
  const sent: string[] = []
  base(on, sent, '**Stashed as `band-phase-two`**', true)
  const ui = await stashThenFinish($)
  expect(await ui.find({ type: 'Text', text: /Run \/clear/ })).toBeDefined()
  await $.session.end({ reason: 'clear', sessionId: 'sid-1', resume: {} as any })
  expect(sent.at(-1)).toBe('stash:resume band-phase-two auto')
  await ui.unmount()
})

test('a stash turn with no confirmation line goes back to the normal band', async ($, on) => {
  const sent: string[] = []
  base(on, sent, 'Something went wrong writing the stash.')
  const ui = await stashThenFinish($)
  expect(sent).toEqual(['stash session=sid-1 auto'])
  expect(await ui.find({ key: 'handoff' })).toBeDefined()
  await ui.unmount()
})

test('a plain /clear with no stash pending resumes nothing', async ($, on) => {
  const sent: string[] = []
  base(on, sent, '')
  await $.turn.complete(TURN)
  await $.session.end({ reason: 'clear', sessionId: 'sid-1', resume: {} as any })
  expect(sent).toEqual([])
})
