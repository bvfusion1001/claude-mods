import { test, expect } from 'claude-code/testing'
import { bindingPath, dodFor, planFor, planName, workRoot } from '../hooks/binding'

test('a file in a ticket folder belongs to that ticket plan', () => {
  expect(planFor('/r', '/r/docs/billing/specs/PROJ-12/_local/dod-ledger.md'))
    .toBe('/r/docs/billing/specs/PROJ-12/_local/build-plan.md')
})

test('a file in a freeform folder belongs to that freeform plan', () => {
  expect(planFor('/r', '/r/docs/_local/plans/idea-x/notes.md')).toBe('/r/docs/_local/plans/idea-x/build-plan.md')
})

test('the legacy plan ties to itself, other files tie to nothing', () => {
  expect(planFor('/r', '/r/docs/BUILD-PLAN.md')).toBe('/r/docs/BUILD-PLAN.md')
  expect(planFor('/r', '/r/src/app.ts')).toBeUndefined()
  expect(planFor('/r', '/other/docs/_local/plans/idea-x/build-plan.md')).toBeUndefined()
  expect(planFor('/r', '/r/docs/_local/build-plan.md')).toBeUndefined()
})

test('plan names: ticket, freeform folder, legacy file', () => {
  expect(planName('/r/docs/billing/specs/PROJ-12/_local/build-plan.md')).toBe('PROJ-12')
  expect(planName('/r/docs/_local/plans/idea-x/build-plan.md')).toBe('idea-x')
  expect(planName('/r/docs/BUILD-PLAN.md')).toBe('BUILD-PLAN.md')
})

test('only ticket plans have a DoD ledger, dod-ledger.md before the older dod-checklist.md', () => {
  expect(dodFor('/r/docs/billing/specs/PROJ-12/_local/build-plan.md')).toEqual([
    '/r/docs/billing/specs/PROJ-12/_local/dod-ledger.md',
    '/r/docs/billing/specs/PROJ-12/_local/dod-checklist.md',
  ])
  expect(dodFor('/r/docs/_local/plans/idea-x/build-plan.md')).toBeUndefined()
  expect(dodFor('/r/docs/BUILD-PLAN.md')).toBeUndefined()
})

test('one binding file per chat', () => {
  expect(bindingPath('/home/b', 'sid-1')).toBe('/home/b/.claude/stash/.bindings/sid-1.json')
})

test('the work root is the nearest folder with a .git, so a worktree finds itself', async () => {
  const has = (paths: string[]) => async (p: string) => paths.includes(p)
  expect(await workRoot('/m/.wt/w1/src/app', has(['/m/.git', '/m/.wt/w1/.git']))).toBe('/m/.wt/w1')
  expect(await workRoot('/m/docs', has(['/m/.git']))).toBe('/m')
  expect(await workRoot('/tmp/x', has([]))).toBeUndefined()
})
