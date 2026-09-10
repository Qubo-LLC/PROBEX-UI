// NOTE: the 'data-stale' state added 2026-09-07 is covered at the end of this
// file, including its precedence against the states either side of it.
import { describe, it, expect } from 'vitest'
import { deriveSystemStatus, statusNeedsAttention, type SystemStatusInput } from './systemStatus'
import type { RuntimeConfig } from '@/config/runtime'

// QUB-31 acceptance criterion: "UI ... handles initialization, empty, stale, and
// failed states." This module is where those become one another's alternatives,
// so the tests assert the PRECEDENCE, not just the individual branches — a
// wrong order is how a synthetic cockpit ends up claiming to be healthy.

const runtime = (over: Partial<RuntimeConfig> = {}): RuntimeConfig => ({
  mode: 'live',
  requestedMode: 'auto',
  baseUrl: '/api',
  deployment: 'production',
  environment: 'production',
  reason: 'Backend reachable.',
  ...over,
})

const input = (over: Partial<SystemStatusInput> = {}): SystemStatusInput => ({
  runtime: runtime(),
  healthStatus: 'online',
  engineMode: 'paper',
  isLoading: false,
  isUnreachable: false,
  unhealthyProbes: 0,
  stalledEndpoints: 0,
  ...over,
})

describe('deriveSystemStatus', () => {
  it('reports a healthy paper engine as the calm normal case', () => {
    const s = deriveSystemStatus(input())
    expect(s.state).toBe('paper')
    expect(s.dataIsLive).toBe(true)
    expect(s.dataIsSynthetic).toBe(false)
    expect(statusNeedsAttention(s.state)).toBe(false)
  })

  it('marks live trading as the loud state', () => {
    const s = deriveSystemStatus(input({ engineMode: 'live' }))
    expect(s.state).toBe('live')
    expect(s.tone).toBe('danger')
  })

  it('reports an offline runtime as unreachable with no synthetic data', () => {
    const s = deriveSystemStatus(input({ runtime: runtime({ mode: 'offline' }) }))
    expect(s.state).toBe('unreachable')
    expect(s.dataIsLive).toBe(false)
    expect(s.dataIsSynthetic).toBe(false)
  })

  it('flags mock mode as synthetic', () => {
    const s = deriveSystemStatus(input({ runtime: runtime({ mode: 'mock' }) }))
    expect(s.state).toBe('synthetic')
    expect(s.dataIsSynthetic).toBe(true)
    expect(s.dataIsLive).toBe(false)
  })

  // ── Precedence ─────────────────────────────────────────────────────────────

  it('lets provenance outrank the engine self-report', () => {
    // A mock engine happily reports itself healthy. Saying "healthy" first is
    // exactly the failure this module exists to prevent.
    const s = deriveSystemStatus(input({
      runtime: runtime({ mode: 'mock' }),
      healthStatus: 'online',
      engineMode: 'paper',
    }))
    expect(s.state).toBe('synthetic')
  })

  it('ranks stalled endpoints above the healthy branch', () => {
    const s = deriveSystemStatus(input({ healthStatus: 'online', stalledEndpoints: 2 }))
    expect(s.state).toBe('endpoints-stalled')
    expect(statusNeedsAttention(s.state)).toBe(true)
  })

  it('ranks engine-reported degradation above stalled endpoints', () => {
    const s = deriveSystemStatus(input({
      healthStatus: 'degraded', unhealthyProbes: 1, stalledEndpoints: 2,
    }))
    expect(s.state).toBe('degraded')
  })

  it('never renders an unresolved cockpit as healthy', () => {
    const s = deriveSystemStatus(input({ isLoading: true, healthStatus: null, engineMode: null }))
    expect(s.state).toBe('loading')
    expect(s.dataIsLive).toBe(false)
  })

  it('reports partial knowledge as unknown rather than healthy', () => {
    const unknownHealth = deriveSystemStatus(input({ healthStatus: null }))
    expect(unknownHealth.state).toBe('unknown')

    const unknownMode = deriveSystemStatus(input({ engineMode: null }))
    expect(unknownMode.state).toBe('unknown')

    // Unknown still asks for the operator's attention.
    expect(statusNeedsAttention('unknown')).toBe(true)
  })

  it('never claims synthetic data outside mock mode', () => {
    const nonMock = [
      deriveSystemStatus(input({ runtime: runtime({ mode: 'offline' }) })),
      deriveSystemStatus(input({ isUnreachable: true })),
      deriveSystemStatus(input({ healthStatus: 'degraded' })),
      deriveSystemStatus(input({ healthStatus: null })),
      deriveSystemStatus(input({ isLoading: true })),
    ]
    for (const s of nonMock) expect(s.dataIsSynthetic).toBe(false)
  })
})

// ─── 'data-stale' (added 2026-09-07) ─────────────────────────────────────────
//
// The state that closes the gap between "the engine answers" and "what is on
// screen is current". The circuit breaker cannot see this case: it only counts
// failures that cost the backend a worker, so a route answering 500 promptly
// clears the streak and never trips it while its data goes stale regardless.

describe('data-stale', () => {
  it('replaces the healthy claim when a slice stopped refreshing', () => {
    const s = deriveSystemStatus(input({ staleEndpoints: 2 }))
    expect(s.state).toBe('data-stale')
    expect(s.detail).toContain('2 endpoints')
    expect(statusNeedsAttention(s.state)).toBe(true)
  })

  it('singularises for one endpoint', () => {
    expect(deriveSystemStatus(input({ staleEndpoints: 1 })).detail).toContain('1 endpoint failed')
  })

  it('is NOT synthetic — retained engine data is still engine data', () => {
    const s = deriveSystemStatus(input({ staleEndpoints: 1 }))
    expect(s.dataIsSynthetic).toBe(false)
    expect(s.dataIsLive).toBe(true)
  })

  it('defaults to absent, so existing callers are unaffected', () => {
    expect(deriveSystemStatus(input()).state).toBe('paper')
  })

  // ── Precedence ────────────────────────────────────────────────────────────

  it('yields to a stalled endpoint — a paused route is the harder failure', () => {
    const s = deriveSystemStatus(input({ staleEndpoints: 3, stalledEndpoints: 1 }))
    expect(s.state).toBe('endpoints-stalled')
  })

  it('yields to an unreachable engine', () => {
    const s = deriveSystemStatus(input({ staleEndpoints: 3, isUnreachable: true }))
    expect(s.state).not.toBe('data-stale')
  })

  it('yields to synthetic — provenance still outranks freshness', () => {
    const s = deriveSystemStatus(input({
      staleEndpoints: 3,
      runtime: runtime({ mode: 'mock', deployment: 'development' }),
    }))
    expect(s.state).toBe('synthetic')
  })

  it('outranks the healthy branch in BOTH paper and live mode', () => {
    expect(deriveSystemStatus(input({ staleEndpoints: 1, engineMode: 'paper' })).state).toBe('data-stale')
    expect(deriveSystemStatus(input({ staleEndpoints: 1, engineMode: 'live' })).state).toBe('data-stale')
  })
})
