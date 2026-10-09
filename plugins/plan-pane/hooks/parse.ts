import type { Section } from '../types'

const MAX_TEXT = 90

// headings with no checkboxes under them are dropped
export function parseChecklist(md: string): Section[] {
  const sections: Section[] = []
  let current: Section = { title: '', items: [] }
  for (const line of md.split('\n')) {
    const h = /^#{2,3}\s+(.+)$/.exec(line)
    if (h) {
      if (current.items.length) sections.push(current)
      current = { title: clean(h[1] ?? ''), items: [] }
      continue
    }
    const item = /^\s*- \[( |x|X)\]\s+(.+)$/.exec(line)
    if (item) current.items.push({ isDone: item[1] !== ' ', text: clean(item[2] ?? '') })
  }
  if (current.items.length) sections.push(current)
  return sections
}

function clean(text: string): string {
  const plain = text.replace(/\*\*|`/g, '').trim()
  // a cut could land inside a link and break it
  if (/\]\(/.test(plain)) return plain
  return plain.length > MAX_TEXT ? `${plain.slice(0, MAX_TEXT - 1)}…` : plain
}

export function currentIndex(sections: Section[]): number {
  const i = sections.findIndex((s) => s.items.some((it) => !it.isDone))
  return i < 0 ? sections.length - 1 : i
}

export function branchFromHead(head: string): string | undefined {
  return /^ref: refs\/heads\/(.+)$/m.exec(head)?.[1]?.trim()
}

export function ticketFromBranch(branch: string | undefined): string | undefined {
  return branch ? /([A-Z][A-Z0-9]+-\d+)/.exec(branch)?.[1] : undefined
}

// the Parking Lot is ideas, not work, so it never counts against progress
export function progress(sections: Section[]): { done: number; total: number } {
  const work = sections.filter((s) => !/parking lot/i.test(s.title)).flatMap((s) => s.items)
  return { done: work.filter((i) => i.isDone).length, total: work.length }
}

export function progressBarSvg(done: number, total: number): string {
  const pct = total ? (done / total) * 100 : 0
  // percent widths with pixel radii: a stretched viewBox squeezed the round ends
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="8">`
    + `<rect width="100%" height="8" rx="4" fill="#80808040"/>`
    + `<rect width="${pct.toFixed(1)}%" height="8" rx="4" fill="#22c55e"/></svg>`
}

export function progressBarText(done: number, total: number, cells = 20): string {
  const filled = total ? Math.round((done / total) * cells) : 0
  return '█'.repeat(filled) + '░'.repeat(cells - filled)
}
