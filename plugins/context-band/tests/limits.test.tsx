import { test, expect } from 'claude-code/testing'
import { limitsToShow } from '../hooks/register'

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false } } as const

function usage(tokens: number, rateLimits: any[]) {
  return () => ({ value: { startedAt: 0, rateLimits, context: { tokens, window: 1_000_000 } } })
}

async function finishTurn($: any, on: any) {
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>host prompt</Text>
  })
  await $.turn.complete({ answer: '', durationMs: 0, isAborted: false, turnId: 't1', reason: 'answer' })
}

test('only windows at or past the line are shown', () => {
  const shown = limitsToShow([
    { kind: 'five_hour', percentUsed: 69.9 },
    { kind: 'seven_day', percentUsed: 70 },
  ], 70)
  expect(shown.map((l) => l.kind)).toEqual(['seven_day'])
})

test('a limit past 70% shows early in the green, without Handoff', async ($, on) => {
  on('session.usage', usage(50_000, [{ kind: 'five_hour', percentUsed: 82, resetsAt: '2026-10-07T23:30:00Z' }]))
  await finishTurn($, on)
  const ui = await $.ui.mount({ plugin: 'context-band', surface: 'desktop', ...BAND })
  expect(await ui.find({ type: 'Text', text: /5-hour limit 82% used/ })).toBeDefined()
  expect(await ui.find({ key: 'handoff' })).toBeUndefined()
  await ui.unmount()
})

test('limits under 70% show nothing', async ($, on) => {
  on('session.usage', usage(50_000, [{ kind: 'seven_day', percentUsed: 40 }]))
  await finishTurn($, on)
  const ui = await $.ui.mount({ plugin: 'context-band', surface: 'desktop', ...BAND })
  expect(await ui.find({ type: 'Text', text: /limit/ })).toBeUndefined()
  expect(await ui.find({ key: 'toggle-pane' })).toBeDefined()
  await ui.unmount()
})

test('both lines show together', async ($, on) => {
  on('session.usage', usage(600_000, [{ kind: 'seven_day', percentUsed: 91 }]))
  await finishTurn($, on)
  const ui = await $.ui.mount({ plugin: 'context-band', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /weekly limit 91% used/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /600k.*plan a handoff/ })).toBeDefined()
  await ui.unmount()
})
