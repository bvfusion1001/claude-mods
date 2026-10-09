import { atom, read, update } from 'claude-code'
import type { Register, EngineInterface } from 'claude-code'

import type { Handoff, Limit, Reading } from '../types'
import { DRAFT_SYSTEM, currentPlanItem, noteBody, shouldDraft, transcriptSince } from './draft'
import type { Msg } from './draft'
import { bindingPath, boundPlan, planFor, workRoot } from './binding'

const reading = atom({ plugin: 'context-band', key: 'reading' } as const, null)
const handoffState = atom({ plugin: 'context-band', key: 'handoff' } as const, { phase: 'idle' } as Handoff)

type Zone = { dot: string; label: string; color: string }

export function zoneFor(tokens: number, yellowAt: number, redAt: number): Zone {
  if (tokens >= redAt) return { dot: '🔴', label: 'hand off now', color: 'red' }
  if (tokens >= yellowAt) return { dot: '🟡', label: 'plan a handoff', color: 'yellow' }
  return { dot: '🟢', label: 'hand off when ready', color: 'green' }
}

export function handoffShown(tokens: number, handoffFrom: number): boolean {
  return tokens >= handoffFrom
}

export function limitsToShow(limits: Limit[], limitsFrom: number): Limit[] {
  return limits.filter((l) => l.percentUsed >= limitsFrom)
}

const LIMIT_NAMES: Record<string, string> = { five_hour: '5-hour', seven_day: 'weekly', spend_limit: 'spend' }

function limitText(l: Limit): string {
  const name = LIMIT_NAMES[l.kind] ?? l.kind
  const at = l.resetsAt
    ? `, resets ${new Date(l.resetsAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`
    : ''
  return `⚠️ ${name} limit ${Math.round(l.percentUsed)}% used${at}`
}

// the stash skill ends with this line under `auto`
export function stashedName(text: string): string | undefined {
  return /Stashed as `([^`]+)`/.exec(text)?.[1]
}

async function refresh($: EngineInterface): Promise<Reading> {
  const { context, rateLimits } = await $.session.usage()
  const next: Reading = { tokens: context.tokens ?? 0, window: context.window, limits: rateLimits ?? [] }
  await update($, reading, () => next)
  return next
}

async function rootOf($: EngineInterface): Promise<string> {
  const cwd = await $.session.cwd()
  return (await workRoot(cwd, (p) => $.fs.exists(p))) ?? (await $.session.repo())?.root ?? cwd
}

async function draftPath($: EngineInterface): Promise<string> {
  const home = await $.env.get('HOME')
  return `${home}/.claude/stash/.drafts/${await $.session.id()}.md`
}

// returns the message count the draft now covers, or the old checkpoint on failure
async function writeDraft($: EngineInterface, model: string, from: number): Promise<number> {
  const messages = (await $.session.messages()) as readonly Msg[]
  const turns = transcriptSince(messages, from)
  if (!turns) return from
  const path = await draftPath($)
  const old = (await $.fs.exists(path)) ? noteBody(await $.fs.read(path)) : '(empty)'
  const r = await $.model.complete({
    model,
    system: DRAFT_SYSTEM,
    prompt: `Current note:\n${old}\n\nNew turns:\n${turns}`,
  })
  if (!r.isAnswered) return from
  const cwd = await $.session.cwd()
  const root = await rootOf($)
  // unbound ticket plans need the branch; /stash finds those
  const planPath = (await readBinding($, root)) ?? `${root}/docs/BUILD-PLAN.md`
  const plan = (await $.fs.exists(planPath)) ? await $.fs.read(planPath) : ''
  const item = currentPlanItem(plan)
  const head = [
    '---',
    `session_id: ${await $.session.id()}`,
    `cwd: ${cwd}`,
    ...(plan ? [`build_plan: ${planPath}`] : []),
    ...(item ? [`plan_item: ${JSON.stringify(item)}`] : []),
    `updated: ${new Date(await $.clock.now()).toISOString()}`,
    `covers_messages: ${messages.length}`,
    '---',
    '',
  ].join('\n')
  await $.fs.write(path, head + r.text.trim() + '\n')
  return messages.length
}

async function myBinding($: EngineInterface): Promise<string> {
  const home = await $.env.get('HOME')
  if (!home) throw new Error('HOME is not set')
  return bindingPath(home, await $.session.id())
}

async function readBinding($: EngineInterface, root: string): Promise<string | undefined> {
  const path = await myBinding($)
  return (await $.fs.exists(path)) ? boundPlan(await $.fs.read(path), root) : undefined
}

// a chat that writes into a plan's folder is working on that plan
async function tie($: EngineInterface, file: string) {
  const root = await rootOf($)
  const plan = planFor(root, file)
  if (!plan || plan === (await readBinding($, root))) return
  await $.fs.write(await myBinding($), JSON.stringify({ plan, root }) + '\n')
}

// rolling draft: one at a time, never awaited by the turn
let draft = { turnsSince: 0, from: 0, zone: '', running: false }

function startDraft($: EngineInterface, model: string) {
  draft.running = true
  draft.turnsSince = 0
  writeDraft($, model, draft.from)
    .then((covered) => { draft.from = covered })
    .catch((err) => $.ui.log(`context-band: draft failed: ${err?.message ?? err}`))
    .finally(() => { draft.running = false })
}

async function lastAssistantText($: EngineInterface): Promise<string> {
  const messages = await $.session.messages()
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role === 'assistant' && m.text) return m.text
  }
  return ''
}

// $.state may not survive /clear, so this module variable is the source of truth
let handoff: Handoff = { phase: 'idle' }

async function setHandoff($: EngineInterface, next: Handoff) {
  handoff = next
  await update($, handoffState, () => next)
}

async function resume($: EngineInterface, command: string, name: string) {
  await setHandoff($, { phase: 'idle' })
  await $.command.run({ command, args: `${name} auto` })
}

async function clearAndResume($: EngineInterface, command: string, name: string) {
  // 'resuming' keeps session.end from resuming a second time
  await setHandoff($, { phase: 'resuming', name })
  try {
    await $.command.run({ command: 'clear' })
  } catch {
    await setHandoff($, { phase: 'awaitClear', name })
    return
  }
  await resume($, command, name)
}

const thousands = (n: number) => `${Math.round(n / 1000)}k`

export const register: Register = (on, options) => {
  handoff = { phase: 'idle' }
  draft = { turnsSince: 0, from: 0, zone: '', running: false }
  const yellowAt = Number(options.yellowAt ?? 550_000)
  const redAt = Number(options.redAt ?? 700_000)
  const handoffFrom = Number(options.handoffFrom ?? 400_000)
  const paneCommand = String(options.paneCommand ?? 'plan-pane').replace(/^\//, '')
  const limitsFrom = Number(options.limitsFrom ?? 70)
  const draftEvery = Number(options.draftEvery ?? 10)
  const draftModel = String(options.draftModel ?? 'haiku')
  const stashCommand = String(options.stashCommand ?? 'stash').replace(/^\//, '')
  const resumeCommand = String(options.resumeCommand ?? 'stash:resume').replace(/^\//, '')

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // subagent turns don't fill the main window
    if (e.agentId) return result
    const r = await refresh($)
    const zone = zoneFor(r.tokens, yellowAt, redAt).color
    draft.turnsSince++
    const zoneChanged = draft.zone !== '' && zone !== draft.zone
    draft.zone = zone
    if (!draft.running && shouldDraft(draft.turnsSince, draftEvery, zoneChanged)) startDraft($, draftModel)
    if (handoff.phase === 'stashing') {
      const name = stashedName(await lastAssistantText($))
      if (name) {
        await setHandoff($, { phase: 'ready', name })
        // not awaited: the clear must start after this turn's hooks finish
        clearAndResume($, resumeCommand, name).catch(() => setHandoff($, { phase: 'awaitClear', name }))
      } else {
        await setHandoff($, { phase: 'idle' })
        $.ui.toast('The stash did not finish. Check the transcript.')
      }
    }
    return result
  })

  // only watches; never stands in a tool's way
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    const file = (e as any).file_path
    if ((e.tool === 'Write' || e.tool === 'Edit') && !e.agentId && typeof file === 'string' && !(result as any)?.deny) {
      await tie($, file).catch((err) => $.ui.log(`context-band: tie failed: ${err?.message ?? err}`))
    }
    return result
  }).catch(($, e, next) => next(e))

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  on('session.end', async ($, e, next) => {
    const result = await next(e)
    if (e.reason !== 'clear') return result
    draft = { turnsSince: 0, from: 0, zone: '', running: false }
    await update($, reading, (r) => ({ tokens: 0, window: 0, limits: r?.limits ?? [] }))
    if (handoff.phase === 'ready' || handoff.phase === 'awaitClear') {
      await resume($, resumeCommand, handoff.name)
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const r = await read($, reading)
    if (e.props.hasSurvey || !r) return next(e)
    // read subscribes the band to redraws; the closure holds the value
    await read($, handoffState)

    const { Box, Button, Text } = $.ui.resolve(e)
    const limits = limitsToShow(r.limits ?? [], limitsFrom)
    const limitLines = limits.map((l) => (
      <Text key={`limit-${l.kind}`} color={l.percentUsed >= 90 ? 'red' : 'yellow'}>{limitText(l)}</Text>
    ))
    // other plugins' rows (plan-pane's toggle) sit beneath ours, never replaced
    const below = await next(e)
    const band = (line: any) => {
      if (!line && limitLines.length === 0) return below
      // a bare row keeps the host's layout, which right-aligns the button
      if (limitLines.length === 0 && !below) return line
      return (
        <Box flexDirection="column" alignItems="stretch">
          {limitLines}
          {line}
          {below}
        </Box>
      )
    }

    if (handoff.phase === 'ready' || handoff.phase === 'awaitClear') {
      const name = handoff.name
      return band(
        <Box>
          <Text color="green">
            ✅ Stashed as {name}.{handoff.phase === 'awaitClear' ? ' Run /clear and it resumes by itself.' : ''}{' '}
          </Text>
          {handoff.phase === 'ready' ? (
            <Button
              key="clear-resume"
              label="Clear & resume"
              variant="primary"
              onPress={() => clearAndResume($, resumeCommand, name)}
            />
          ) : null}
        </Box>
      )
    }

    if (handoff.phase === 'stashing' || handoff.phase === 'resuming') {
      return band(
        <Box>
          <Text dimColor>{handoff.phase === 'stashing' ? '⏳ Stashing...' : '⏳ Clearing and resuming...'}</Text>
        </Box>
      )
    }

    const zone = zoneFor(r.tokens, yellowAt, redAt)
    const early = !handoffShown(r.tokens, handoffFrom)
    return band(
      <Box justifyContent="space-between">
        <Text color={early ? undefined : zone.color} dimColor={early}>
          {zone.dot} {thousands(r.tokens)} tokens{early ? '' : `, ${zone.label}`}{' '}
        </Text>
        <Box gap={1}>
          <Button
            key="toggle-pane"
            label="Bradar"
            hotkey="b"
            onPress={async () => {
              try {
                await $.command.run({ command: paneCommand })
              } catch {
                $.ui.toast(`/${paneCommand} is not installed.`)
              }
            }}
          />
          {early ? null : (
            <Button
              key="handoff"
              label="Handoff"
              hotkey="h"
              variant={zone.color === 'red' ? 'primary' : undefined}
              onPress={async () => {
                const sessionId = await $.session.id()
                await setHandoff($, { phase: 'stashing' })
                await $.command.run({ command: stashCommand, args: `session=${sessionId} auto` })
              }}
            />
          )}
        </Box>
      </Box>
    )
  })
}
