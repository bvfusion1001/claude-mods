import { test, expect } from 'claude-code/testing'

const PANE = { component: 'Pane', requestId: 'plan-pane', props: {} } as const

function base(on: any, branch: string, sent: string[]) {
  on('session.cwd', () => ({ value: '/r' }))
  on('session.repo', () => ({ value: { root: '/r', remote: null, internal: false } }))
  on('fs.exists', (_$: any, e: any) => ({ value: e.path === '/r/.git' || e.path === '/r/.git/HEAD' }))
  on('fs.stat', () => ({ value: { kind: 'dir', size: 1, mtimeMs: 1, isLink: false } }))
  on('fs.read', () => ({ value: `ref: refs/heads/${branch}\n` }))
  on('fs.list', () => ({ value: [] }))
  on('command.register', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { opened: true } }))
  on('clock.sleep', () => new Promise(() => {}))
  on('ui.render', () => null)
  on('command.run', (_$: any, e: any) => { sent.push(e.command); return {} })
}

test('no plan: a button starts one', async ($, on) => {
  const sent: string[] = []
  base(on, 'main', sent)
  await $.command.run({ command: 'plan-pane', args: '' })
  const ui = await $.ui.mount({ plugin: 'plan-pane', surface: 'desktop', ...PANE })
  expect(await ui.find({ type: 'Markdown', text: /Discover, Design, Test, Build, Verify/ })).toBeDefined()
  expect(await ui.find({ type: 'Markdown', text: /Parking Lot/ })).toBeDefined()
  await ui.press({ key: 'plan-init' })
  expect(sent).toEqual(['build-plan:init'])
  await ui.unmount()
})

test('no ledger on a ticket branch: a button starts one', async ($, on) => {
  const sent: string[] = []
  base(on, 'd/PROJ-42-x', sent)
  await $.command.run({ command: 'plan-pane', args: '' })
  const ui = await $.ui.mount({ plugin: 'plan-pane', surface: 'desktop', ...PANE })
  await ui.press({ key: 'tab-dod' })
  expect(await ui.find({ type: 'Markdown', text: /No DoD ledger for PROJ-42/ })).toBeDefined()
  expect(await ui.find({ type: 'Markdown', text: /verified, weak or missing/ })).toBeDefined()
  await ui.press({ key: 'dod-init' })
  expect(sent).toEqual(['dod:init'])
  await ui.unmount()
})

test('no ticket in the branch: no DoD button, and says why', async ($, on) => {
  base(on, 'main', [])
  await $.command.run({ command: 'plan-pane', args: '' })
  const ui = await $.ui.mount({ plugin: 'plan-pane', surface: 'desktop', ...PANE })
  await ui.press({ key: 'tab-dod' })
  expect(await ui.find({ type: 'Markdown', text: /no ticket/i })).toBeDefined()
  expect(await ui.find({ type: 'Markdown', text: /PROJ-1234/ })).toBeDefined()
  expect(await ui.find({ key: 'dod-init' })).toBeUndefined()
  await ui.unmount()
})
