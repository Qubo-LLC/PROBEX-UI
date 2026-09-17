import { describe, it, expect } from 'vitest'
import { staleBySeriesAge, SERIES_STALE_AFTER_MS } from './ChartFrame'

const NOW = 1_800_000_000_000

describe('staleBySeriesAge', () => {
  it('turns a live series stale once its newest point is older than the threshold', () => {
    expect(staleBySeriesAge('live', NOW - SERIES_STALE_AFTER_MS - 1, NOW)).toBe('stale')
    expect(staleBySeriesAge('live', NOW - 60_000, NOW)).toBe('live')
  })
  it('never promotes or rewrites a non-live state, and leaves an unknown age alone', () => {
    expect(staleBySeriesAge('unavailable', NOW - 10 * SERIES_STALE_AFTER_MS, NOW)).toBe('unavailable')
    expect(staleBySeriesAge('idle', NOW - 10 * SERIES_STALE_AFTER_MS, NOW)).toBe('idle')
    expect(staleBySeriesAge('live', undefined, NOW)).toBe('live')
  })
})
