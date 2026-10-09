import { test, expect } from 'claude-code/testing'
import { handoffShown, zoneFor } from '../hooks/register'

// the kit's { options } didn't reach register in 2.1.289, so test the threshold logic directly
test('custom thresholds move the zones', () => {
  expect(zoneFor(42_000, 30_000, 50_000).label).toBe('plan a handoff')
  expect(zoneFor(55_000, 30_000, 50_000).label).toBe('hand off now')
  expect(zoneFor(29_999, 30_000, 50_000).label).toBe('hand off when ready')
})

test('Handoff shows from the handoffFrom line', () => {
  expect(handoffShown(149_999, 150_000)).toBe(false)
  expect(handoffShown(150_000, 150_000)).toBe(true)
})
