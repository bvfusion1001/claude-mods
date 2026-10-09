import { test, expect } from 'claude-code/testing'
import { branchFromHead, currentIndex, parseChecklist, progress, progressBarSvg, ticketFromBranch } from '../hooks/parse'

const PLAN = `# Plan

Intro.

## Phase 1: Band

- [x] built
- [x] **verified** in \`terminal\`

## Phase 2: Resume

- [x] one press
- [ ] Two-session check,
      wrapped line

## Open questions

1. none

## Parking Lot

- [ ] idea
`

test('sections keep only headings with checkboxes', () => {
  const s = parseChecklist(PLAN)
  expect(s.map((x) => x.title)).toEqual(['Phase 1: Band', 'Phase 2: Resume', 'Parking Lot'])
  expect(s[0].items[1]).toEqual({ isDone: true, text: 'verified in terminal' })
  expect(s[1].items[1]).toEqual({ isDone: false, text: 'Two-session check,' })
})

test('current section is the first with an open item', () => {
  expect(currentIndex(parseChecklist(PLAN))).toBe(1)
})

test('ticket comes from the branch in HEAD', () => {
  expect(ticketFromBranch(branchFromHead('ref: refs/heads/d/AB-PROJ-7664-trigger\n'))).toBe('PROJ-7664')
  expect(ticketFromBranch(branchFromHead('ref: refs/heads/main\n'))).toBeUndefined()
  expect(branchFromHead('3f2a1b')).toBeUndefined()
})

test('progress counts every item except the Parking Lot', () => {
  expect(progress(parseChecklist(PLAN))).toEqual({ done: 3, total: 4 })
})

test('a long item with a link is not cut, so the link stays whole', () => {
  const url = `https://example.com/${'x'.repeat(100)}`
  const [s] = parseChecklist(`## P\n- [ ] See [the doc](${url}) for more\n`)
  expect(s!.items[0]!.text).toBe(`See [the doc](${url}) for more`)
})

test('the progress bar is drawn in real pixels, so its round ends stay round at any width', () => {
  const svg = progressBarSvg(57, 73)
  expect(svg).not.toContain('viewBox')
  expect(svg).not.toContain('preserveAspectRatio')
  expect(svg).toContain('width="78.1%"')
  expect(svg).toContain('rx="4"')
})
