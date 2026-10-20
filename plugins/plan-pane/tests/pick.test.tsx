import { test, expect } from 'claude-code/testing'

const PANE = { component: 'Pane', requestId: 'plan-pane', props: {} } as const
const BINDING = '/home/b/.claude/stash/.bindings/sid-1.json'
const TICKET = '/r/docs/billing/specs/PROJ-12/_local/build-plan.md'
const OTHER = '/r/docs/billing/specs/PROJ-40/_local/dod-checklist.md'
const FREE = '/r/docs/_local/plans/idea-x/build-plan.md'

function repo(extra: Record<string, string> = {}): Record<string, string> {
  return {
    '/r/.git/HEAD': 'ref: refs/heads/d/PROJ-12-thing\n',
    [TICKET]: '## Phase 1: Ticket work\n\n- [ ] ticket item\n',
    '/r/docs/billing/specs/PROJ-12/_local/dod-checklist.md': '### AC\n- [ ] AC1\n',
    [OTHER]: '### AC\n- [ ] other AC\n',
    [FREE]: '## Phase 1: Ideas\n\n- [x] sketch\n- [ ] freeform item\n',
    '/r/docs/BUILD-PLAN.md': '## Phase 1: Legacy\n\n- [ ] legacy item\n',
    ...extra,
  }
}

const isDir = (files: Record<string, string>, p: string) => Object.keys(files).some((k) => k.startsWith(`${p}/`))

function base(on: any, files: Record<string, string>, writes: string[] = []) {
  on('session.cwd', () => ({ value: '/r' }))
  on('session.id', () => ({ value: 'sid-1' }))
  on('env.get', () => ({ value: '/home/b' }))
  on('session.repo', () => ({ value: { root: '/r', remote: null, internal: false } }))
  on('fs.exists', (_$: any, e: any) => ({ value: e.path in files || isDir(files, e.path) }))
  on('fs.stat', (_$: any, e: any) => ({ value: { kind: isDir(files, e.path) ? 'dir' : 'file', size: 1, mtimeMs: 1, isLink: false } }))
  on('fs.read', (_$: any, e: any) => ({ value: files[e.path] }))
  on('fs.write', (_$: any, e: any) => { files[e.path] = e.text; writes.push(e.path); return { value: undefined } })
  on('fs.list', (_$: any, e: any) => {
    const names = new Set<string>()
    for (const k of Object.keys(files)) if (k.startsWith(`${e.path}/`)) names.add(k.slice(e.path.length + 1).split('/')[0])
    return { value: [...names].map((name) => ({ name, kind: isDir(files, `${e.path}/${name}`) ? 'dir' : 'file', size: 0, mtimeMs: 0, isLink: false })) }
  })
  on('command.register', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { opened: true } }))
  on('command.run', () => ({}))
  on('clock.sleep', () => new Promise(() => {}))
  on('ui.render', () => null)
}

async function openPane($: any) {
  await $.command.run({ command: 'plan-pane', args: '' })
  return $.ui.mount({ plugin: 'plan-pane', surface: 'desktop', ...PANE })
}

test('a picked plan beats the branch ticket', async ($, on) => {
  base(on, repo({ [BINDING]: JSON.stringify({ plan: FREE, root: '/r' }) }))
  const ui = await openPane($)
  expect(await ui.find({ key: 'pick', text: /Working on: idea-x$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /▶ freeform item/ })).toBeDefined()
  await ui.unmount()
})

test('no binding: the branch ticket, labelled as from the branch', async ($, on) => {
  base(on, repo())
  const ui = await openPane($)
  expect(await ui.find({ key: 'pick', text: /Working on: PROJ-12 \(branch\)/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /▶ ticket item/ })).toBeDefined()
  await ui.unmount()
})

test('a binding from another repo is ignored', async ($, on) => {
  base(on, repo({ [BINDING]: JSON.stringify({ plan: '/x/docs/BUILD-PLAN.md', root: '/x' }) }))
  const ui = await openPane($)
  expect(await ui.find({ key: 'pick', text: /PROJ-12 \(branch\)/ })).toBeDefined()
  await ui.unmount()
})

test('the picker lists every plan in the repo, and picking one ties this chat to it', async ($, on) => {
  const writes: string[] = []
  const files = repo()
  base(on, files, writes)
  const ui = await openPane($)
  await ui.press({ key: 'pick' })
  for (const name of ['PROJ-12', 'PROJ-40', 'idea-x', 'BUILD-PLAN.md']) {
    expect(await ui.find({ key: `pick-${name}` })).toBeDefined()
  }
  await ui.press({ key: 'pick-idea-x' })
  expect(writes).toEqual([BINDING])
  expect(JSON.parse(files[BINDING])).toMatchObject({ plan: FREE, root: '/r' })
  expect(await ui.find({ key: 'pick-PROJ-40' })).toBeUndefined()
  expect(await ui.find({ key: 'pick', text: /Working on: idea-x$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /▶ freeform item/ })).toBeDefined()
  await ui.unmount()
})

test('nothing to show: the header offers a pick', async ($, on) => {
  base(on, { '/r/.git/HEAD': 'ref: refs/heads/main\n' })
  const ui = await openPane($)
  expect(await ui.find({ key: 'pick', text: /Working on: nothing yet/ })).toBeDefined()
  await ui.unmount()
})

test('no plan for this chat, but the repo has some: the empty state lists them to pick', async ($, on) => {
  const files: Record<string, string> = {
    '/r/.git/HEAD': 'ref: refs/heads/main\n',
    [TICKET]: '## Phase 1: Ticket work\n\n- [ ] ticket item\n',
    [FREE]: '## Phase 1: Ideas\n\n- [ ] freeform item\n',
  }
  base(on, files)
  const ui = await openPane($)
  expect(await ui.find({ type: 'Markdown', text: /2 build plans in this repo/ })).toBeDefined()
  expect(await ui.find({ key: 'found-PROJ-12' })).toBeDefined()
  expect(await ui.find({ key: 'plan-init' })).toBeDefined()
  await ui.press({ key: 'found-idea-x' })
  expect(JSON.parse(files[BINDING])).toMatchObject({ plan: FREE, root: '/r' })
  expect(await ui.find({ type: 'Text', text: /▶ freeform item/ })).toBeDefined()
  await ui.unmount()
})

test('an item with a link draws as markdown, so the link can be pressed', async ($, on) => {
  base(on, repo({ [BINDING]: JSON.stringify({ plan: FREE, root: '/r' }), [FREE]: '## Phase 1: Ideas\n\n- [ ] Ship [PROJ-395](https://example.com/proj-395)\n- [ ] plain item\n' }))
  const ui = await openPane($)
  expect(await ui.find({ type: 'Markdown', text: /▶ Ship \[PROJ-395\]\(https:\/\/example\.com\/proj-395\)/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /○ plain item/ })).toBeDefined()
  await ui.unmount()
})

test('phases read as levels: done ones checked and dim, the current one marked open', async ($, on) => {
  const plan = '## Phase 1: Done\n\n- [x] a\n\n## Phase 2: Now\n\n- [x] done one\n- [ ] b\n- [ ] b2\n\n## Phase 3: Later\n\n- [ ] c\n'
  base(on, repo({ [BINDING]: JSON.stringify({ plan: FREE, root: '/r' }), [FREE]: plan }))
  const ui = await openPane($)
  expect(await ui.find({ type: 'Text', text: /^✓ Phase 1: Done · 1\/1$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^▾ Phase 2: Now · 1\/3$/ })).toBeDefined()
  // the first open item is the one being worked
  expect(await ui.find({ type: 'Text', text: /^▶ b$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^○ b2$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^ {2}Phase 3: Later · 0\/1$/ })).toBeDefined()
  await ui.unmount()
})

test('typing an idea into the Parking Lot box adds it to the plan file', async ($, on) => {
  const files = repo({ [BINDING]: JSON.stringify({ plan: FREE, root: '/r' }) })
  base(on, files)
  const ui = await openPane($)
  await ui.input({ key: 'parking', text: 'Slack digest', kind: 'submit' })
  expect(files[FREE]).toContain('## Parking Lot\n\n- Slack digest\n')
  await ui.unmount()
})

test('Open full view writes the page beside the plan and opens it', async ($, on) => {
  const writes: string[] = []
  const ran: string[][] = []
  const files = repo({ [BINDING]: JSON.stringify({ plan: FREE, root: '/r' }) })
  base(on, files, writes)
  on('process.run', (_$: any, e: any) => { ran.push([...e.argv]); return { value: { exitCode: 0, stdout: '', stderr: '' } } })
  on('clock.now', () => ({ value: Date.UTC(2026, 9, 16, 20, 30) }))
  const ui = await openPane($)
  await ui.press({ key: 'full-view' })
  const page = '/r/docs/_local/plans/idea-x/full-view.html'
  expect(writes).toContain(page)
  expect(files[page]).toContain('freeform item')
  expect(ran).toEqual([['open', page]])
  await ui.unmount()
})

test('Parking Lot ideas show at the bottom of the pane', async ($, on) => {
  const plan = '## Phase 1: Now\n\n- [ ] a\n\n## Parking Lot\n\n- Slack digest\n- Calendar view\n'
  base(on, repo({ [BINDING]: JSON.stringify({ plan: FREE, root: '/r' }), [FREE]: plan }))
  const ui = await openPane($)
  expect(await ui.find({ type: 'Text', text: /^Parking Lot · 2$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Slack digest/ })).toBeDefined()
  await ui.unmount()
})
