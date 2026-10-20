import { test, expect } from 'claude-code/testing'

const PANE = { component: 'Pane', requestId: 'plan-pane', props: {} } as const
const FILES: Record<string, string> = {
  '/r/.git': '',
  '/r/.git/HEAD': 'ref: refs/heads/d/PROJ-12-thing\n',
  '/r/docs/billing/specs/PROJ-12/_local/build-plan.md': '## Phase 1: Do\n\n- [x] a\n- [ ] Next thing\n\n## Phase 2: Later\n\n- [ ] b\n',
  '/r/docs/billing/specs/PROJ-12/_local/dod-checklist.md': '### Acceptance criteria\n- [x] AC1 works\n- [ ] AC2 tested\n',
}

function base(on: any, repoFails = false, sent: string[] = []) {
  on('session.cwd', () => {
    if (repoFails) throw new Error('no cwd here')
    return { value: '/r' }
  })
  on('session.repo', () => {
    if (repoFails) throw new Error('no repo here')
    return { value: { root: '/r', remote: null, internal: false } }
  })
  on('fs.exists', (_$: any, e: any) => ({ value: e.path in FILES || e.path === '/r/docs' }))
  on('fs.stat', (_$: any, e: any) => ({ value: { kind: e.path === '/r/.git' ? 'dir' : 'file', size: 1, mtimeMs: 1, isLink: false } }))
  on('fs.read', (_$: any, e: any) => ({ value: FILES[e.path] }))
  on('fs.list', (_$: any, e: any) => ({
    value: e.path === '/r/docs' ? [{ name: 'billing', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] : [],
  }))
  on('command.register', () => ({ value: undefined }))
  on('ui.open', (_$: any, e: any) => { sent.push(`open ${e.id}`); return { value: { opened: true } } })
  on('ui.close', (_$: any, e: any) => { sent.push(`close ${e.id}`); return { value: undefined } })
  on('command.run', (_$: any, e: any) => { sent.push(e.command); return {} })
  on('clock.sleep', () => new Promise(() => {}))
  // stands in for whatever the host draws above the prompt
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>host</Text>
  })
}

test('/plan-pane opens the pane on the Plan tab at the current phase', async ($, on) => {
  base(on)
  await $.command.run({ command: 'plan-pane', args: '' })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'plan-pane', surface, ...PANE })
    expect(await ui.find({ type: 'Text', text: /PROJ-12\/_local\/build-plan\.md/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Phase 1: Do · 1\/2/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /▶ Next thing/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Phase 2: Later · 0\/1/ })).toBeDefined()
    await ui.unmount()
  }
})

test('a failure still answers the command, with the reason', async ($, on) => {
  base(on, true)
  const r: any = await $.command.run({ command: 'plan-pane', args: '' })
  expect(r.text).toMatch(/^Plan pane failed to open: ./)
})

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false } } as const

test('/plan-pane toggles: open, then closed', async ($, on) => {
  const sent: string[] = []
  base(on, false, sent)
  await $.command.run({ command: 'plan-pane', args: '' })
  const r: any = await $.command.run({ command: 'plan-pane', args: '' })
  expect(sent).toEqual(['open plan-pane', 'close plan-pane'])
  expect(r.text).toBe('Plan pane closed.')
})

test('no band row of its own: the context band hosts the toggle', async ($, on) => {
  base(on)
  const band = await $.ui.mount({ plugin: 'plan-pane', surface: 'desktop', ...BAND })
  expect(await band.find({ key: 'toggle-pane' })).toBeUndefined()
  await band.unmount()
})

test('a progress bar sits under the tabs: drawn on desktop, text in the terminal', async ($, on) => {
  base(on)
  await $.command.run({ command: 'plan-pane', args: '' })
  const desk = await $.ui.mount({ plugin: 'plan-pane', surface: 'desktop', ...PANE })
  expect(await desk.find({ type: 'Svg' })).toBeDefined()
  expect(await desk.find({ type: 'Text', text: /1 of 3 done · 33%/ })).toBeDefined()
  await desk.unmount()
  const term = await $.ui.mount({ plugin: 'plan-pane', surface: 'terminal', ...PANE })
  expect(await term.find({ type: 'Svg' })).toBeUndefined()
  expect(await term.find({ type: 'Text', text: /█+░+ 1 of 3 done · 33%/ })).toBeDefined()
  await term.unmount()
})

test('the DoD tab says it is not built yet, with no buttons', async ($, on) => {
  base(on)
  await $.command.run({ command: 'plan-pane', args: '' })
  const ui = await $.ui.mount({ plugin: 'plan-pane', surface: 'desktop', ...PANE })
  await ui.press({ key: 'tab-dod' })
  expect(await ui.find({ type: 'Markdown', text: /not implemented yet/i })).toBeDefined()
  expect(await ui.find({ key: 'dod-init' })).toBeUndefined()
  expect(await ui.find({ key: 'dod-check' })).toBeUndefined()
  await ui.unmount()
})

test('no Check off button; Resume plan shows only before the chat has started', async ($, on) => {
  const sent: string[] = []
  const msgs: any[] = []
  base(on, false, sent)
  on('session.messages', () => ({ value: msgs }))
  on('turn.complete', () => ({ text: '' }))
  await $.command.run({ command: 'plan-pane', args: '' })
  const ui = await $.ui.mount({ plugin: 'plan-pane', surface: 'desktop', ...PANE })
  expect(await ui.find({ key: 'plan-next' })).toBeUndefined()
  await ui.press({ key: 'plan-resume' })
  expect(sent).toContain('build-plan:start')
  msgs.push({ role: 'user', text: 'go', toolUses: [] }, { role: 'assistant', text: 'ok', toolUses: [] })
  await $.turn.complete({ answer: '', durationMs: 0, isAborted: false, turnId: 't', reason: 'answer' })
  expect(await ui.find({ key: 'plan-resume' })).toBeUndefined()
  expect(await ui.find({ key: 'full-view' })).toBeDefined()
  await ui.unmount()
})
