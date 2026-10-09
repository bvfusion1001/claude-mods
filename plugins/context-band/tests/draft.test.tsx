import { test, expect } from 'claude-code/testing'
import { currentPlanItem, shouldDraft, transcriptSince } from '../hooks/draft'

const TURN = { answer: '', durationMs: 0, isAborted: false, turnId: 't', reason: 'answer' } as const
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)) }

function base(on: any, tokens: { n: number }, msgs: any[], writes: Array<[string, string]>, asks: string[]) {
  on('session.usage', () => ({ value: { startedAt: 0, rateLimits: [], context: { tokens: tokens.n, window: 1_000_000 } } }))
  on('session.id', () => ({ value: 'sid-9' }))
  on('session.cwd', () => ({ value: '/work/repo' }))
  on('session.messages', () => ({ value: msgs }))
  on('env.get', () => ({ value: '/home/b' }))
  on('session.repo', () => ({ value: { root: '/work/repo', remote: null, internal: false } }))
  on('fs.exists', (_$: any, e: any) => ({ value: e.path === '/work/repo/docs/BUILD-PLAN.md' }))
  on('fs.read', () => ({ value: '## Phase 3: Rolling\n\n- [x] done\n- [ ] Live check\n' }))
  on('fs.write', (_$: any, e: any) => { writes.push([e.path, e.text]); return { value: undefined } })
  on('model.complete', (_$: any, e: any) => {
    asks.push(typeof e.prompt === 'string' ? e.prompt : JSON.stringify(e.prompt))
    return { value: { isAnswered: true, text: '## Completed\n- built the band', usage: {} } }
  })
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', () => null)
  on('clock.now', () => ({ value: Date.UTC(2026, 9, 7, 21, 30) }))
  on('ui.log', () => ({}))
}

test('turn count or a zone change starts a draft', () => {
  expect(shouldDraft(9, 10, false)).toBe(false)
  expect(shouldDraft(10, 10, false)).toBe(true)
  expect(shouldDraft(2, 10, true)).toBe(true)
})

test('transcript keeps main-thread text only, from the checkpoint on', () => {
  const t = transcriptSince([
    { role: 'user', text: 'old', toolUses: [] },
    { role: 'user', text: 'fix the band', toolUses: [] },
    { role: 'assistant', text: 'subagent noise', toolUses: [], agentId: 'a1' },
    { role: 'assistant', text: 'done', toolUses: [] },
  ], 1)
  expect(t).toBe('USER: fix the band\n\nCLAUDE: done')
})

test('ten turns write a draft for this session', async ($, on) => {
  const writes: Array<[string, string]> = []
  const asks: string[] = []
  const msgs = [{ role: 'user', text: 'build phase three', toolUses: [] }]
  base(on, { n: 60_000 }, msgs, writes, asks)
  for (let i = 0; i < 9; i++) await $.turn.complete(TURN)
  await settle()
  expect(writes).toEqual([])
  await $.turn.complete(TURN)
  await settle()
  expect(asks.length).toBe(1)
  expect(asks[0]).toContain('build phase three')
  expect(writes.length).toBe(1)
  expect(writes[0][0]).toBe('/home/b/.claude/stash/.drafts/sid-9.md')
  expect(writes[0][1]).toContain('session_id: sid-9')
  expect(writes[0][1]).toContain('cwd: /work/repo')
  expect(writes[0][1]).toContain('## Completed')
  expect(writes[0][1]).toContain('build_plan: /work/repo/docs/BUILD-PLAN.md')
  expect(writes[0][1]).toContain('plan_item: "Phase 3: Rolling: Live check"')
})

test('a zone change drafts early', async ($, on) => {
  const writes: Array<[string, string]> = []
  const asks: string[] = []
  const tokens = { n: 60_000 }
  base(on, tokens, [{ role: 'user', text: 'hi', toolUses: [] }], writes, asks)
  await $.turn.complete(TURN)
  await settle()
  expect(writes).toEqual([])
  tokens.n = 600_000
  await $.turn.complete(TURN)
  await settle()
  expect(writes.length).toBe(1)
})

test('current plan item is the first unchecked box under its phase', () => {
  const plan = '# Plan\n\n## Phase 1: Band\n\n- [x] built\n\n## Phase 2: Resume\n\n- [x] a\n- [ ] Two-session check,\n      wrapped line\n- [ ] later\n'
  expect(currentPlanItem(plan)).toBe('Phase 2: Resume: Two-session check,')
  expect(currentPlanItem('## Done\n- [x] all\n')).toBeUndefined()
})
