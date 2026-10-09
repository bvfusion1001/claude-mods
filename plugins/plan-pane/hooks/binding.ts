// context-band keeps a copy of planFor and bindingPath; change both together
export type Binding = { plan: string; root: string }

const TICKET_DIR = /^docs\/[^/]+\/specs\/([^/]+)\/_local\//
const FREE_DIR = /^docs\/_local\/plans\/([^/]+)\//
const LEGACY = 'docs/BUILD-PLAN.md'

export function bindingPath(home: string, sessionId: string): string {
  return `${home}/.claude/stash/.bindings/${sessionId}.json`
}

// the plan a file belongs to, by folder
export function planFor(root: string, file: string): string | undefined {
  if (!file.startsWith(`${root}/`)) return undefined
  const rel = file.slice(root.length + 1)
  if (rel === LEGACY) return file
  const dir = TICKET_DIR.exec(rel)?.[0] ?? FREE_DIR.exec(rel)?.[0]
  return dir ? `${root}/${dir}build-plan.md` : undefined
}

export function planName(plan: string): string {
  return /\/specs\/([^/]+)\/_local\/build-plan\.md$/.exec(plan)?.[1]
    ?? /\/plans\/([^/]+)\/build-plan\.md$/.exec(plan)?.[1]
    ?? plan.split('/').pop()!
}

// DoD belongs to tickets, so only a ticket plan has a ledger
export function dodFor(plan: string): string | undefined {
  return /\/specs\/[^/]+\/_local\/build-plan\.md$/.test(plan) ? plan.replace(/build-plan\.md$/, 'dod-checklist.md') : undefined
}

export function parseBinding(text: string | undefined, root: string): Binding | undefined {
  try {
    const b = JSON.parse(text ?? '')
    return typeof b?.plan === 'string' && b.root === root ? { plan: b.plan, root } : undefined
  } catch {
    return undefined
  }
}

// nearest folder with a .git; session.repo() gives the main checkout for a worktree
export async function workRoot(cwd: string, exists: (path: string) => Promise<boolean>): Promise<string | undefined> {
  for (let dir = cwd; dir; dir = dir.slice(0, dir.lastIndexOf('/'))) {
    if (await exists(`${dir}/.git`)) return dir
  }
  return undefined
}
