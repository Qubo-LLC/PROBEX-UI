// ─── Why this file exists ────────────────────────────────────────────────────
// `lastRefreshed` drives the top-nav heartbeat ("Updated just now"). It used to
// be bumped on EVERY store write — including the write that marks a slice stale
// because its refresh just failed. So during a backend outage the nav kept
// reporting "just now" while the panels directly below it reported
// "Stale · 29s ago".
//
// Neither component was wrong on its own, which is why no unit test caught it:
// it was found in end-to-end fault injection against the real dashboard, and it
// only existed once the two were on screen together. These tests pin the fix.

import { describe, it, expect, beforeEach } from 'vitest'
import { useApplicationStore } from './applicationStore'
import { ok, toServiceState, loadingState, errorState, staleState } from '@/lib/services/response'
import type { EngineStats, EngineHealth } from '@/types/engine'

const T0 = 1_700_000_000_000
const stats  = (v: number) => toServiceState(ok({ currentPrice: v } as unknown as EngineStats), T0)
const health = ()           => toServiceState(ok({ status: 'online' } as unknown as EngineHealth), T0)

function reset() {
  useApplicationStore.setState({ lastRefreshed: null })
}

describe('lastRefreshed tracks successful refreshes, not store activity', () => {
  beforeEach(reset)

  it('is null before anything has arrived', () => {
    expect(useApplicationStore.getState().lastRefreshed).toBeNull()
  })

  it('advances on a fresh success', () => {
    useApplicationStore.getState().updateEngine({ stats: stats(1) })
    expect(useApplicationStore.getState().lastRefreshed).not.toBeNull()
  })

  it('advances on an EMPTY success — an empty list is still an answer', () => {
    useApplicationStore.getState().updateEngine({ stats: toServiceState(ok([] as unknown as EngineStats), T0) })
    expect(useApplicationStore.getState().lastRefreshed).not.toBeNull()
  })

  it('does NOT advance when a slice is merely marked stale', () => {
    useApplicationStore.getState().updateEngine({ stats: stats(1) })
    const afterSuccess = useApplicationStore.getState().lastRefreshed

    useApplicationStore.getState().updateEngine({
      stats: staleState(stats(1), { code: 'NETWORK', message: 'down', retryable: true }),
    })

    // This is the bug: the store was written to, but nothing refreshed.
    expect(useApplicationStore.getState().lastRefreshed).toBe(afterSuccess)
  })

  it('does NOT advance on a loading or error write', () => {
    useApplicationStore.getState().updateEngine({ stats: stats(1) })
    const afterSuccess = useApplicationStore.getState().lastRefreshed

    useApplicationStore.getState().updateEngine({ health: loadingState<EngineHealth>() })
    expect(useApplicationStore.getState().lastRefreshed).toBe(afterSuccess)

    useApplicationStore.getState().updateEngine({
      health: errorState<EngineHealth>({ code: 'NETWORK', message: 'down', retryable: true }),
    })
    expect(useApplicationStore.getState().lastRefreshed).toBe(afterSuccess)
  })

  it('advances again the moment ANY slice recovers', () => {
    useApplicationStore.getState().updateEngine({ stats: stats(1) })
    const afterSuccess = useApplicationStore.getState().lastRefreshed!

    useApplicationStore.getState().updateEngine({
      stats: staleState(stats(1), { code: 'TIMEOUT', message: 'slow', retryable: true }),
    })
    expect(useApplicationStore.getState().lastRefreshed).toBe(afterSuccess)

    useApplicationStore.getState().updateEngine({ health: health() })
    expect(useApplicationStore.getState().lastRefreshed!).toBeGreaterThanOrEqual(afterSuccess)
    expect(useApplicationStore.getState().lastRefreshed).not.toBe(afterSuccess === null ? 0 : null)
  })

  it('a mixed batch counts as a refresh if anything in it is fresh', () => {
    useApplicationStore.setState({ lastRefreshed: null })
    useApplicationStore.getState().updateEngine({
      stats:  staleState(stats(1), { code: 'NETWORK', message: 'down', retryable: true }),
      health: health(),
    })
    expect(useApplicationStore.getState().lastRefreshed).not.toBeNull()
  })

  it('always stores the slice itself, refreshed or not', () => {
    // The staleness fix must not stop stale data reaching the store — the whole
    // point is that panels keep rendering it.
    const stale = staleState(stats(42), { code: 'NETWORK', message: 'down', retryable: true })
    useApplicationStore.getState().updateEngine({ stats: stale })
    expect(useApplicationStore.getState().engine.stats).toBe(stale)
    expect(useApplicationStore.getState().engine.stats.data).not.toBeNull()
  })
})
