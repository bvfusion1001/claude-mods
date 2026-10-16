import { test, expect } from 'claude-code/testing'
import { addToParkingLot, fullViewHtml, fullViewPath, parseFull } from '../hooks/fullview'

const PLAN = `# Release build plan

Ship the release process.

## Phase 1: Prep

- [x] Draft the runbook
- [ ] Review it with [the team](https://example.com/team)
  and record decisions
- [ ] Publish

**Done when:** the runbook is published.

## Phase 2: Later

- [ ] Train <everyone>

## Parking Lot

- **Calendar view.** Maybe later.
`

test('parses title, phases, done-when, wrapped items and the Parking Lot', () => {
  const p = parseFull(PLAN)
  expect(p.title).toBe('Release build plan')
  expect(p.intro).toBe('Ship the release process.')
  expect(p.phases.map((x) => x.title)).toEqual(['Phase 1: Prep', 'Phase 2: Later'])
  expect(p.phases[0]!.items[1]!.text).toBe('Review it with [the team](https://example.com/team) and record decisions')
  expect(p.phases[0]!.doneWhen).toBe('the runbook is published.')
  expect(p.parking).toEqual(['**Calendar view.** Maybe later.'])
})

test('the page escapes text, keeps links, and marks the active item', () => {
  const html = fullViewHtml(parseFull(PLAN), { name: 'release', path: 'docs/x/build-plan.md', updated: '3:27pm' })
  expect(html).toContain('Train &lt;everyone&gt;')
  expect(html).not.toContain('<everyone>')
  expect(html).toContain('<a href="https://example.com/team" target="_blank" rel="noopener">the team</a>')
  expect(html).toMatch(/class="item active"[^>]*>[\s\S]*?Review it with/)
  expect(html).toContain('<b>Calendar view.</b> Maybe later.')
  expect(html).toContain('1 of 4 done')
})

test('a javascript: link is not turned into a link', () => {
  const html = fullViewHtml(parseFull('## P\n\n- [ ] see [x](javascript:alert(1))\n'), { name: 'n', path: 'p', updated: 'u' })
  expect(html).not.toContain('href="javascript:')
})

test('a new idea lands at the end of an existing Parking Lot', () => {
  const md = addToParkingLot(PLAN, 'Slack digest')
  expect(md).toContain('- **Calendar view.** Maybe later.\n- Slack digest\n')
})

test('a plan with no Parking Lot gets one', () => {
  expect(addToParkingLot('## P\n\n- [ ] a\n', 'idea')).toBe('## P\n\n- [ ] a\n\n## Parking Lot\n\n- idea\n')
})

test('the full view sits beside a _local plan, else in docs/_local', () => {
  expect(fullViewPath('/r/docs/a/specs/T-1/_local/build-plan.md', '/r')).toBe('/r/docs/a/specs/T-1/_local/full-view.html')
  expect(fullViewPath('/r/docs/BUILD-PLAN.md', '/r')).toBe('/r/docs/_local/full-view.html')
})

test('the intro keeps every line of the first paragraph', () => {
  expect(parseFull('# T\n\nLine one\nline two.\n\nNot this.\n\n## P\n\n- [ ] a\n').intro).toBe('Line one line two.')
})

test('a Parking Lot idea that wraps keeps its second line, and italics render', () => {
  const p = parseFull('## P\n\n- [ ] a\n\n## Parking Lot\n\n- One idea\n  that wraps.\n')
  expect(p.parking).toEqual(['One idea that wraps.'])
  expect(fullViewHtml(parseFull('## P\n\n- [ ] check *verified* only\n'), { name: 'n', path: 'p', updated: 'u' })).toContain('<i>verified</i>')
})

test('links: web, mail and relative paths only', () => {
  const html = (md: string) => fullViewHtml(parseFull(`## P\n\n- [ ] ${md}\n`), { name: 'n', path: 'p', updated: 'u' })
  expect(html('[a](https://x.com/y)')).toContain('href="https://x.com/y"')
  expect(html('[a](mailto:me@x.com)')).toContain('href="mailto:me@x.com"')
  expect(html('[a](../src/app.ts)')).toContain('href="../src/app.ts"')
  for (const bad of ['data:text/html,x', 'vbscript:x', 'JaVaScRiPt:x', 'file:///etc/passwd']) expect(html(`[a](${bad})`)).not.toContain('<a ')
})
