import { test, expect } from 'claude-code/testing'

const BINDING = '/home/b/.claude/stash/.bindings/sid-9.json'
const FREE = '/work/repo/docs/_local/plans/idea-x/build-plan.md'
const TURN = { answer: '', durationMs: 0, isAborted: false, turnId: 't', reason: 'answer' } as const
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)) }

function base(on: any, files: Record<string, string>, writes: string[], cwd = '/work/repo') {
  on('session.usage', () => ({ value: { startedAt: 0, rateLimits: [], context: { tokens: 60_000, window: 1_000_000 } } }))
  on('session.id', () => ({ value: 'sid-9' }))
  on('session.cwd', () => ({ value: cwd }))
  on('session.repo', () => ({ value: { root: '/work/repo', remote: null, internal: false } }))
  on('session.messages', () => ({ value: [{ role: 'user', text: 'go', toolUses: [] }] }))
  on('env.get', () => ({ value: '/home/b' }))
  on('fs.exists', (_$: any, e: any) => ({ value: e.path in files }))
  on('fs.read', (_$: any, e: any) => ({ value: files[e.path] }))
  on('fs.write', (_$: any, e: any) => { files[e.path] = e.text; writes.push(e.path); return { value: undefined } })
  on('model.complete', () => ({ value: { isAnswered: true, text: '## Completed\n- x', usage: {} } }))
  on('tool.call', () => ({ result: 'ok', text: 'ok' }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', () => null)
  on('clock.now', () => ({ value: Date.UTC(2026, 9, 8) }))
  on('ui.log', () => ({}))
}

const write = (path: string, extra: object = {}) =>
  ({ tool: 'Write', tool_use_id: 'u1', file_path: path, content: 'x', ...extra })

test('writing a file in a plan folder ties this chat to that plan', async ($, on) => {
  const files: Record<string, string> = {}
  const writes: string[] = []
  base(on, files, writes)
  await $.tool.call(write('/work/repo/docs/_local/plans/idea-x/build-plan.md'))
  expect(writes).toEqual([BINDING])
  expect(JSON.parse(files[BINDING])).toMatchObject({ plan: FREE, root: '/work/repo' })
})

test('an edit in a ticket folder ties to the ticket plan', async ($, on) => {
  const files: Record<string, string> = {}
  base(on, files, [])
  await $.tool.call({ tool: 'Edit', tool_use_id: 'u2', file_path: '/work/repo/docs/pay/specs/PROJ-7/_local/dod-checklist.md', old_string: 'a', new_string: 'b' })
  expect(JSON.parse(files[BINDING]).plan).toBe('/work/repo/docs/pay/specs/PROJ-7/_local/build-plan.md')
})

test('files outside a plan folder, and subagent edits, tie nothing', async ($, on) => {
  const writes: string[] = []
  base(on, {}, writes)
  await $.tool.call(write('/work/repo/src/app.ts'))
  await $.tool.call(write(FREE, { agentId: 'a1' }))
  expect(writes).toEqual([])
})

test('the same plan again leaves the binding alone', async ($, on) => {
  const writes: string[] = []
  base(on, { [BINDING]: JSON.stringify({ plan: FREE, root: '/work/repo' }) }, writes)
  await $.tool.call(write(FREE))
  expect(writes).toEqual([])
})

test('the rolling draft records the bound plan', async ($, on) => {
  const files: Record<string, string> = {
    [BINDING]: JSON.stringify({ plan: FREE, root: '/work/repo' }),
    [FREE]: '## Phase 1: Ideas\n\n- [ ] Freeform item\n',
    '/work/repo/docs/BUILD-PLAN.md': '## Phase 9: Legacy\n\n- [ ] legacy item\n',
  }
  base(on, files, [])
  for (let i = 0; i < 10; i++) await $.turn.complete(TURN)
  await settle()
  const draft = files['/home/b/.claude/stash/.drafts/sid-9.md']
  expect(draft).toContain(`build_plan: ${FREE}`)
  expect(draft).toContain('plan_item: "Phase 1: Ideas: Freeform item"')
})

test('in a worktree, the tie uses the worktree root, not the main checkout', async ($, on) => {
  const wt = '/work/repo/.claude/worktrees/w1'
  const files: Record<string, string> = { [`${wt}/.git`]: 'gitdir: /work/repo/.git/worktrees/w1\n' }
  base(on, files, [], wt)
  await $.tool.call(write(`${wt}/docs/_local/plans/idea-x/notes.md`))
  expect(JSON.parse(files[BINDING])).toMatchObject({ plan: `${wt}/docs/_local/plans/idea-x/build-plan.md`, root: wt })
})
