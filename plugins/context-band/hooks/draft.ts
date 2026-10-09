export type Msg = { role: string; text: string; agentId?: string }

const MAX_PER_MESSAGE = 2_000

export const DRAFT_SYSTEM = `You keep a running handoff note for a coding session.
Merge the new turns into the note. Keep these sections, in order:
## Completed, ## In Progress, ## Key Decisions, ## Next Steps, ## References.
Under 400 words. Plain markdown only, no frontmatter, no preamble.`

export function shouldDraft(turnsSince: number, every: number, zoneChanged: boolean): boolean {
  return zoneChanged || turnsSince >= every
}

export function transcriptSince(messages: readonly Msg[], from: number): string {
  return messages
    .slice(from)
    .filter((m) => !m.agentId && m.text)
    .map((m) => `${m.role === 'user' ? 'USER' : 'CLAUDE'}: ${m.text.slice(0, MAX_PER_MESSAGE)}`)
    .join('\n\n')
}

export function noteBody(note: string): string {
  return note.replace(/^---\n[\s\S]*?\n---\n/, '')
}

export function currentPlanItem(plan: string): string | undefined {
  let heading = ''
  for (const line of plan.split('\n')) {
    const h = /^##\s+(.+)$/.exec(line)
    if (h) heading = (h[1] ?? '').trim()
    const item = /^\s*- \[ \]\s+(.+)$/.exec(line)
    const text = item?.[1]?.trim()
    if (text) return heading ? `${heading}: ${text}` : text
  }
  return undefined
}
