import { test, expect } from 'claude-code/testing'

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false } } as const
const SURFACES = ['terminal', 'desktop'] as const

function usageAt(tokens: number) {
  return () => ({ value: { startedAt: 0, rateLimits: [], context: { tokens, window: 1_000_000, percent: Math.round(tokens / 10_000) } } })
}

async function finishTurn($: any, on: any) {
  on('turn.complete', () => ({ text: '' }))
  // stands in for the host's own AbovePrompt
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>host prompt</Text>
  })
  await $.turn.complete({ answer: '', durationMs: 0, isAborted: false, turnId: 't1', reason: 'answer' })
}

test('early in the green: the band shows, with the pane toggle but no Handoff', async ($, on) => {
  on('session.usage', usageAt(390_000))
  await finishTurn($, on)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'context-band', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /390k/ })).toBeDefined()
    expect(await ui.find({ key: 'toggle-pane' })).toBeDefined()
    expect(await ui.find({ key: 'handoff' })).toBeUndefined()
    await ui.unmount()
  }
})

test('shows in late green, before yellow, with Handoff', async ($, on) => {
  on('session.usage', usageAt(420_000))
  await finishTurn($, on)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'context-band', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /420k.*hand off when ready/ })).toBeDefined()
    expect(await ui.find({ key: 'handoff' })).toBeDefined()
    await ui.unmount()
  }
})

test('yellow shows the Handoff button', async ($, on) => {
  on('session.usage', usageAt(560_000))
  await finishTurn($, on)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'context-band', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /560k.*plan a handoff/ })).toBeDefined()
    expect(await ui.find({ key: 'handoff' })).toBeDefined()
    await ui.unmount()
  }
})

test('red, and pressing Handoff runs the handoff command', async ($, on) => {
  const sent: string[] = []
  on('session.usage', usageAt(710_000))
  on('session.id', () => ({ value: 'sid-1' }) as any)
  on('command.run', ($, e) => { sent.push(`${e.command} ${e.args}`); return {} })
  await finishTurn($, on)
  const ui = await $.ui.mount({ plugin: 'context-band', surface: 'desktop', ...BAND })
  expect(await ui.find({ type: 'Text', text: /710k.*hand off now/ })).toBeDefined()
  await ui.press({ key: 'handoff' })
  expect(sent).toEqual(['stash session=sid-1 auto'])
  await ui.unmount()
})


test('the pane toggle runs /plan-pane', async ($, on) => {
  const sent: string[] = []
  on('session.usage', usageAt(120_000))
  on('command.run', ($: any, e: any) => { sent.push(e.command); return {} })
  await finishTurn($, on)
  const ui = await $.ui.mount({ plugin: 'context-band', surface: 'desktop', ...BAND })
  await ui.press({ key: 'toggle-pane' })
  expect(sent).toEqual(['plan-pane'])
  await ui.unmount()
})
