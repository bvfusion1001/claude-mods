import { test, expect } from 'claude-code/testing'

const PANE = { component: 'Pane', requestId: 'plan-pane', props: {} } as const
const PLUGIN = ['build-plan:init', 'build-plan:resume']
const REPO_SKILLS = ['/r/.claude/skills/build-plan-init/SKILL.md', '/r/.claude/skills/build-plan-resume/SKILL.md']

function base(on: any, branch: string, sent: string[], plugin: string[] = PLUGIN, repoFiles: string[] = []) {
  on('session.cwd', () => ({ value: '/r' }))
  on('session.repo', () => ({ value: { root: '/r', remote: null, internal: false } }))
  on('fs.exists', (_$: any, e: any) => ({ value: e.path === '/r/.git' || e.path === '/r/.git/HEAD' || repoFiles.includes(e.path) }))
  on('fs.stat', () => ({ value: { kind: 'dir', size: 1, mtimeMs: 1, isLink: false } }))
  on('fs.read', () => ({ value: `ref: refs/heads/${branch}\n` }))
  on('fs.list', () => ({ value: [] }))
  on('command.register', () => ({ value: undefined }))
  on('command.list', () => ({ value: plugin.map((name) => ({ name, description: '', source: 'plugin', plugin: 'build-plan' })) }))
  on('ui.open', () => ({ value: { opened: true } }))
  on('clock.sleep', () => new Promise(() => {}))
  on('ui.render', () => null)
  on('command.run', (_$: any, e: any) => { sent.push(e.command); return {} })
}

async function openPane($: any) {
  await $.command.run({ command: 'plan-pane', args: '' })
  return $.ui.mount({ plugin: 'plan-pane', surface: 'desktop', ...PANE })
}

test('no plan: a button starts one', async ($, on) => {
  const sent: string[] = []
  base(on, 'main', sent)
  const ui = await openPane($)
  expect(await ui.find({ type: 'Markdown', text: /Discover, Design, Test, Build, Verify/ })).toBeDefined()
  expect(await ui.find({ type: 'Markdown', text: /Parking Lot/ })).toBeDefined()
  await ui.press({ key: 'plan-init' })
  expect(sent).toEqual(['build-plan:init'])
  await ui.unmount()
})

test('the repo ships its own build-plan skills: Start runs the repo skill', async ($, on) => {
  const sent: string[] = []
  base(on, 'main', sent, PLUGIN, REPO_SKILLS)
  const ui = await openPane($)
  await ui.press({ key: 'plan-init' })
  expect(sent).toEqual(['build-plan-init'])
  await ui.unmount()
})

test('repo skills and no build-plan plugin: Start still works', async ($, on) => {
  const sent: string[] = []
  base(on, 'main', sent, [], REPO_SKILLS)
  const ui = await openPane($)
  await ui.press({ key: 'plan-init' })
  expect(sent).toEqual(['build-plan-init'])
  await ui.unmount()
})

test('no build-plan skills anywhere: no Start button, a one-line hint instead', async ($, on) => {
  const sent: string[] = []
  base(on, 'main', sent, [])
  const ui = await openPane($)
  expect(await ui.find({ key: 'plan-init' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /No build-plan skills here/ })).toBeDefined()
  expect(sent).toEqual([])
  await ui.unmount()
})
