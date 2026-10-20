import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Doc, Section, Tab, Working } from '../types'
import { bindingPath, dodFor, parseBinding, planName, workRoot } from './binding'
import { addToParkingLot, fullViewHtml, fullViewPath, parseFull } from './fullview'
import { branchFromHead, currentIndex, parseChecklist, progress, progressBarSvg, progressBarText, ticketFromBranch } from './parse'

const PANE = 'plan-pane'

const PLAN_HOW = `**No build plan here yet.**

A build plan is the roadmap for work that takes more than one sitting. It's a local file, gitignored, so it never gets committed.

1. **Start.** Claude asks up to three questions, then writes phases. Each phase says what "done" looks like.
2. **Work.** Every item runs the same loop: Discover, Design, Test, Build, Verify. The failing test comes before the build.
3. **Check off.** An item is checked only once it's verified. *Check off & next* does that and moves on.
4. **Park new ideas.** Anything that comes up mid-phase goes to the Parking Lot, not the current phase.
5. **Come back.** After a \`/clear\` or a new chat, *Resume plan* picks up at the first open item.`

const DOD_SOON = `**Definition of Done is not implemented yet.**

This tab will show the ticket's DoD ledger: the checklist that proves a ticket is really done, with each item marked verified, weak or missing. It's coming in a later version.`
const POLL_MS = 3_000

const plan = atom({ plugin: 'plan-pane', key: 'plan' } as const, null as Doc)
const dod = atom({ plugin: 'plan-pane', key: 'dod' } as const, null as Doc)
const tab = atom({ plugin: 'plan-pane', key: 'tab' } as const, 'plan' as Tab)
const ticketAtom = atom({ plugin: 'plan-pane', key: 'ticket' } as const, null as string | null)
const openAtom = atom({ plugin: 'plan-pane', key: 'isOpen' } as const, false)
const NOTHING: Working = { name: 'nothing yet', source: 'none', isFreeform: false }
const workingAtom = atom({ plugin: 'plan-pane', key: 'working' } as const, NOTHING)
const pickerAtom = atom({ plugin: 'plan-pane', key: 'picker' } as const, null as string[] | null)
// plans elsewhere in the repo, offered when this chat has none
const foundAtom = atom({ plugin: 'plan-pane', key: 'found' } as const, [] as string[])
// a chat with no reply yet is where Resume plan helps
const freshAtom = atom({ plugin: 'plan-pane', key: 'isFresh' } as const, true)

let isOpen = false
let isPolling = false
let seen = ''
// the plan on screen, for the Parking Lot box and the full view
let shown: { plan: string; root: string } | undefined

async function rootOf($: EngineInterface): Promise<string> {
  const cwd = await $.session.cwd()
  return (await workRoot(cwd, (p) => $.fs.exists(p))) ?? (await $.session.repo())?.root ?? cwd
}

async function existing($: EngineInterface, paths: string[]): Promise<string | undefined> {
  for (const p of paths) if (await $.fs.exists(p)) return p
  return undefined
}

async function branch($: EngineInterface, root: string): Promise<string | undefined> {
  const git = `${root}/.git`
  if (!(await $.fs.exists(git))) return undefined
  const stat = await $.fs.stat(git)
  if (stat.kind === 'dir') return branchFromHead(await $.fs.read(`${git}/HEAD`))
  // a worktree's .git is a file pointing at its own git dir
  const dir = /^gitdir:\s*(.+)$/m.exec(await $.fs.read(git))?.[1]?.trim()
  return dir ? branchFromHead(await $.fs.read(`${dir}/HEAD`)) : undefined
}

async function myBinding($: EngineInterface): Promise<string | undefined> {
  try {
    const home = await $.env.get('HOME')
    return home ? bindingPath(home, await $.session.id()) : undefined
  } catch {
    return undefined
  }
}

async function ticketAreas($: EngineInterface, root: string): Promise<string[]> {
  if (!(await $.fs.exists(`${root}/docs`))) return []
  return (await $.fs.list(`${root}/docs`)).filter((d) => d.kind === 'dir' && d.name !== '_local').map((d) => d.name)
}

type Found = { root: string; ticket?: string; plan?: string; dod?: string; working: Working; stamp: string }

// picked, then the branch's ticket, then the legacy file
async function locate($: EngineInterface): Promise<Found> {
  const root = await rootOf($)
  const legacy = `${root}/docs/BUILD-PLAN.md`
  const bPath = await myBinding($)
  const bText = bPath && (await $.fs.exists(bPath)) ? await $.fs.read(bPath) : undefined
  const bound = parseBinding(bText, root)
  if (bound) {
    const dod = dodFor(bound.plan)
    return {
      root,
      ticket: dod ? planName(bound.plan) : undefined,
      plan: await existing($, [bound.plan]),
      dod: dod ? await existing($, [dod]) : undefined,
      working: { name: planName(bound.plan), source: 'picked', isFreeform: !dod },
      stamp: bText ?? '',
    }
  }
  const ticket = ticketFromBranch(await branch($, root))
  const areas = ticket ? await ticketAreas($, root) : []
  const ticketDir = (file: string) => areas.map((a) => `${root}/docs/${a}/specs/${ticket}/_local/${file}`)
  const plan = await existing($, [...ticketDir('build-plan.md'), legacy])
  const working: Working = ticket ? { name: `${ticket} (branch)`, source: 'branch', isFreeform: false }
    : plan ? { name: planName(plan), source: 'legacy', isFreeform: false }
    : NOTHING
  return { root, ticket, plan, dod: await existing($, ticketDir('dod-checklist.md')), working, stamp: '' }
}

// every plan in the repo: ticket folders, freeform folders, the legacy file
async function listPlans($: EngineInterface, root: string): Promise<string[]> {
  const plans: string[] = []
  for (const area of await ticketAreas($, root)) {
    const specs = `${root}/docs/${area}/specs`
    if (!(await $.fs.exists(specs))) continue
    for (const t of await $.fs.list(specs)) {
      const dir = `${specs}/${t.name}/_local`
      if (t.kind !== 'dir' || !(await $.fs.exists(dir))) continue
      const names = (await $.fs.list(dir)).map((f) => f.name)
      if (names.includes('build-plan.md') || names.includes('dod-checklist.md')) plans.push(`${dir}/build-plan.md`)
    }
  }
  const free = `${root}/docs/_local/plans`
  if (await $.fs.exists(free)) {
    for (const d of await $.fs.list(free)) if (d.kind === 'dir') plans.push(`${free}/${d.name}/build-plan.md`)
  }
  if (await $.fs.exists(`${root}/docs/BUILD-PLAN.md`)) plans.push(`${root}/docs/BUILD-PLAN.md`)
  return plans
}

async function pick($: EngineInterface, plan: string) {
  const path = await myBinding($)
  if (!path) return $.ui.toast('Could not find this chat\'s id, so the pick was not saved.')
  const root = await rootOf($)
  await $.fs.write(path, JSON.stringify({ plan, root }) + '\n')
  await update($, pickerAtom, () => null)
  seen = ''
  await refresh($)
}

async function togglePicker($: EngineInterface) {
  if (await read($, pickerAtom)) return update($, pickerAtom, () => null)
  const root = await rootOf($)
  const plans = await listPlans($, root)
  await update($, pickerAtom, () => plans)
}

async function load($: EngineInterface, path: string | undefined, root: string): Promise<Doc> {
  if (!path) return null
  const md = await $.fs.read(path)
  return { path: path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path, sections: parseChecklist(md), parking: parseFull(md).parking }
}

// redraws only when a file's mtime moved, so polling stays cheap
async function refresh($: EngineInterface) {
  const found = await locate($)
  const others = found.plan ? [] : await listPlans($, found.root)
  const isFresh = await freshChat($)
  const stamps: string[] = [String(isFresh), found.stamp, found.working.name, found.ticket ?? '', found.plan ?? '', found.dod ?? '', ...others]
  for (const p of [found.plan, found.dod]) if (p) stamps.push(String((await $.fs.stat(p)).mtimeMs))
  const key = stamps.join('|')
  if (key === seen) return
  seen = key
  const nextPlan = await load($, found.plan, found.root)
  const nextDod = await load($, found.dod, found.root)
  await update($, plan, () => nextPlan)
  await update($, dod, () => nextDod)
  await update($, ticketAtom, () => found.ticket ?? null)
  await update($, workingAtom, () => found.working)
  await update($, foundAtom, () => others)
  await update($, freshAtom, () => isFresh)
  shown = found.plan ? { plan: found.plan, root: found.root } : undefined
  // keep an open full view current
  if (shown && (await $.fs.exists(fullViewPath(shown.plan, shown.root)))) await writeFullView($)
}

async function freshChat($: EngineInterface): Promise<boolean> {
  try {
    return !(await $.session.messages()).some((m) => m.role === 'assistant')
  } catch {
    return true
  }
}

async function writeFullView($: EngineInterface): Promise<string | undefined> {
  if (!shown) return undefined
  const path = fullViewPath(shown.plan, shown.root)
  const rel = shown.plan.startsWith(`${shown.root}/`) ? shown.plan.slice(shown.root.length + 1) : shown.plan
  const updated = new Date(await $.clock.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const html = fullViewHtml(parseFull(await $.fs.read(shown.plan)), { name: planName(shown.plan), path: rel, updated })
  await $.fs.write(path, html)
  return path
}

async function openFullView($: EngineInterface) {
  const path = await writeFullView($)
  if (!path) return
  try {
    await $.process.run(['open', path])
  } catch {
    await $.ui.toast(`Full view saved to ${path}`)
  }
}

async function park($: EngineInterface, text: string) {
  const idea = text.trim()
  if (!shown || !idea) return
  await $.fs.write(shown.plan, addToParkingLot(await $.fs.read(shown.plan), idea))
  seen = ''
  await refresh($)
}

async function poll($: EngineInterface) {
  if (isPolling) return
  isPolling = true
  try {
    while (isOpen) {
      await $.clock.sleep(POLL_MS)
      if (isOpen) await refresh($)
    }
  } finally {
    isPolling = false
  }
}

async function setOpen($: EngineInterface, next: boolean) {
  isOpen = next
  await update($, openAtom, () => next)
}

async function close($: EngineInterface) {
  await setOpen($, false)
  await $.ui.close({ id: PANE })
}

async function runSkill($: EngineInterface, command: string) {
  await $.command.run({ command })
}

async function toggle($: EngineInterface): Promise<string> {
  if (isOpen) {
    await close($)
    return 'Plan pane closed.'
  }
  await open($)
  return 'Plan pane opened.'
}

async function open($: EngineInterface) {
  await setOpen($, true)
  seen = ''
  await refresh($)
  await $.ui.open({ id: PANE, title: 'Build Plan & DoD' })
  poll($).catch(() => {})
}

export const register: Register = (on) => {
  isOpen = false
  isPolling = false
  seen = ''

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'plan-pane', description: 'Show the build plan and DoD ledger in a side pane' })
    return next(e)
  })

  on('command.run', { command: 'plan-pane' }, async ($) => {
    try {
      return { text: await toggle($) }
    } catch (err: any) {
      return { text: `Plan pane failed to open: ${err?.message ?? err}` }
    }
  })

  // only watches the close; never stands in its way
  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) await setOpen($, false)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (isOpen && !e.agentId) await refresh($)
    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text, Markdown } = ui
    // only some surfaces draw Svg
    const Svg = 'Svg' in ui ? ui.Svg : undefined
    const Input = 'Input' in ui ? ui.Input : undefined
    const current = await read($, tab)
    const doc = current === 'plan' ? await read($, plan) : null
    const ticket = await read($, ticketAtom)
    const working = await read($, workingAtom)
    const picker = await read($, pickerAtom)
    const others = await read($, foundAtom)
    const isFresh = await read($, freshAtom)
    const run = (command: string) => () => runSkill($, command)
    const action = (key: string, label: string, command: string) => (
      <Button key={key} label={label} onPress={run(command)} />
    )

    let empty: any = null
    let actions: any = null
    if (current === 'plan') {
      const start = action('plan-init', 'Start a build plan', 'build-plan:init')
      empty = others.length
        ? <Box flexDirection="column" gap={1}>
            <Markdown text={`**No build plan tied to this chat.** ${others.length} build plan${others.length === 1 ? '' : 's'} in this repo. Pick one, or start a new one.`} />
            {others.map((p) => <Button key={`found-${planName(p)}`} label={planName(p)} onPress={() => pick($, p)} />)}
            {start}
          </Box>
        : <Box flexDirection="column" gap={1}><Markdown text={PLAN_HOW} />{start}</Box>
      // progress happens in chat; Resume only helps before the chat has started
      actions = (
        <Box>
          {isFresh ? <>{action('plan-resume', 'Resume plan', 'build-plan:start')}<Text> </Text></> : null}
          <Button key="full-view" label="Open full view" plain onPress={() => openFullView($)} />
        </Box>
      )
    } else {
      empty = <Markdown text={DOD_SOON} />
      actions = null
    }

    return (
      <Box flexDirection="column">
        <Box gap={2}>
          <Button key="tab-plan" label="Build Plan" plain={current !== 'plan' || undefined} dimColor={current !== 'plan'}
            variant={current === 'plan' ? 'primary' : undefined} onPress={() => update($, tab, () => 'plan')} />
          <Button key="tab-dod" label="DoD" plain={current !== 'dod' || undefined} dimColor={current !== 'dod'}
            variant={current === 'dod' ? 'primary' : undefined} onPress={() => update($, tab, () => 'dod')} />
        </Box>
        <Button key="pick" label={`Working on: ${working.name}`} plain onPress={() => togglePicker($)} />
        {picker ? pickerView(picker, (p) => pick($, p), Box, Button, Text) : null}
        {doc ? progressView(doc.sections, e.surface, Svg, Text, Box) : null}
        {doc ? <Text dimColor>{doc.path}</Text> : empty}
        {doc ? actions : null}
        {doc ? sectionsView(doc.sections, Box, Text, Markdown, current === 'plan') : null}
        {doc && doc.parking.length ? parkingView(doc.parking, Box, Text) : null}
        {doc && current === 'plan' && Input
          ? <Input key="parking" placeholder="Add to Parking Lot…" submitLabel="add" onSubmit={(v: string) => { park($, v) }} />
          : null}
      </Box>
    )
  })
}

function count(s: Section): string {
  return `${s.items.filter((i) => i.isDone).length}/${s.items.length}`
}

const HAS_LINK = /\[[^\]]+\]\([^)]+\)|https?:\/\//

// three levels: done phases dim, the current one boxed with its items, later ones plain
function sectionsView(sections: Section[], Box: any, Text: any, Markdown: any, marksActive: boolean) {
  const at = currentIndex(sections)
  return sections.map((s, i) => {
    const title = `${s.title} · ${count(s)}`
    if (i < at) return <Text dimColor>{`✓ ${title}`}</Text>
    if (i > at) return <Text>{`  ${title}`}</Text>
    return (
      <Box flexDirection="column" borderStyle="round" paddingX={1} marginY={1}>
        <Text bold color="cyan">{`▾ ${title}`}</Text>
        {s.items.map((it, j) => {
          // the first open item is what build-plan:start resumes at
          const isActive = marksActive && j === s.items.findIndex((x) => !x.isDone)
          const line = `${it.isDone ? '✓' : isActive ? '▶' : '○'} ${it.text}`
          // Text can't press a link; Markdown can
          return (
            <Box paddingLeft={2}>
              {HAS_LINK.test(it.text) ? <Markdown text={isActive ? `**${line}**` : line} /> : <Text bold={isActive} color={isActive ? 'yellow' : undefined} dimColor={it.isDone}>{line}</Text>}
            </Box>
          )
        })}
      </Box>
    )
  })
}

function progressView(sections: Section[], surface: string, Svg: any, Text: any, Box: any) {
  const { done, total } = progress(sections)
  const label = `${done} of ${total} done · ${total ? Math.round((done / total) * 100) : 0}%`
  // the terminal draws no Svg, so it gets a text bar of fixed width
  if (surface !== 'desktop' || !Svg) return <Text>{`${progressBarText(done, total)} ${label}`}</Text>
  return (
    <Box flexDirection="column">
      <Svg source={progressBarSvg(done, total)} alt={label} height={8} />
      <Text dimColor>{label}</Text>
    </Box>
  )
}

function pickerView(plans: string[], onPick: (plan: string) => unknown, Box: any, Button: any, Text: any) {
  if (!plans.length) return <Text dimColor>No plans in this repo yet.</Text>
  return (
    <Box flexDirection="column">
      {plans.map((p) => {
        const name = planName(p)
        return <Button key={`pick-${name}`} label={name} plain onPress={() => onPick(p)} />
      })}
    </Box>
  )
}

function parkingView(ideas: string[], Box: any, Text: any) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>{`Parking Lot · ${ideas.length}`}</Text>
      {ideas.map((idea) => <Text dimColor>{`• ${idea.replace(/\*\*|`/g, '')}`}</Text>)}
    </Box>
  )
}
