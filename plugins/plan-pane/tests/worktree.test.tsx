import { test, expect } from 'claude-code/testing'

const PANE = { component: 'Pane', requestId: 'plan-pane', props: {} } as const
const BINDING = '/home/b/.claude/stash/.bindings/sid-1.json'
const WT = '/m/.claude/worktrees/w1'
const PLAN = `${WT}/docs/sdlc/specs/TK-7/_local/build-plan.md`
const OTHER = `${WT}/docs/sdlc/specs/TK-9/_local/build-plan.md`

const isDir = (files: Record<string, string>, p: string) => Object.keys(files).some((k) => k.startsWith(`${p}/`))

// session.repo() answers the main checkout; the chat runs in a worktree of it
function base(on: any, files: Record<string, string>) {
  on('session.cwd', () => ({ value: WT }))
  on('session.id', () => ({ value: 'sid-1' }))
  on('env.get', () => ({ value: '/home/b' }))
  on('session.repo', () => ({ value: { root: '/m', remote: null, internal: false } }))
  on('fs.exists', (_$: any, e: any) => ({ value: e.path in files || isDir(files, e.path) }))
  on('fs.stat', (_$: any, e: any) => ({ value: { kind: isDir(files, e.path) ? 'dir' : 'file', size: 1, mtimeMs: 1, isLink: false } }))
  on('fs.read', (_$: any, e: any) => ({ value: files[e.path] }))
  on('fs.list', (_$: any, e: any) => {
    const names = new Set<string>()
    for (const k of Object.keys(files)) if (k.startsWith(`${e.path}/`)) names.add(k.slice(e.path.length + 1).split('/')[0])
    return { value: [...names].map((name) => ({ name, kind: isDir(files, `${e.path}/${name}`) ? 'dir' : 'file', size: 0, mtimeMs: 0, isLink: false })) }
  })
  on('command.register', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { opened: true } }))
  on('clock.sleep', () => new Promise(() => {}))
  on('ui.render', () => null)
}

function repo(extra: Record<string, string> = {}): Record<string, string> {
  return {
    '/m/.git/HEAD': 'ref: refs/heads/main\n',
    [`${WT}/.git`]: 'gitdir: /m/.git/worktrees/w1\n',
    '/m/.git/worktrees/w1/HEAD': 'ref: refs/heads/chore/TK-7-rollout\n',
    [PLAN]: '## Phase 1: Rollout\n\n- [ ] worktree item\n',
    [OTHER]: '## Phase 1: Other\n\n- [ ] other item\n',
    ...extra,
  }
}

async function openPane($: any) {
  await $.command.run({ command: 'plan-pane', args: '' })
  return $.ui.mount({ plugin: 'plan-pane', surface: 'desktop', ...PANE })
}

test('in a worktree, the branch ticket plan is found in the worktree', async ($, on) => {
  base(on, repo())
  const ui = await openPane($)
  expect(await ui.find({ type: 'Text', text: /▶ worktree item/ })).toBeDefined()
  await ui.unmount()
})

test('in a worktree, a binding made there is honored', async ($, on) => {
  base(on, repo({ [BINDING]: JSON.stringify({ plan: OTHER, root: WT }) }))
  const ui = await openPane($)
  expect(await ui.find({ key: 'pick', text: /Working on: TK-9$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /▶ other item/ })).toBeDefined()
  await ui.unmount()
})
