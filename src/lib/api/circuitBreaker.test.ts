import { describe, it, expect } from 'vitest'
import {
  circuitKey, isCircuitOpen, circuitCooldownSeconds,
  recordSuccess, recordFailure, recordAnswered, circuitSnapshot,
} from './circuitBreaker'

// The breaker is the frontend's half of the "do not make a struggling engine
// worse" contract in QUB-48. Its state is module-level, so each test uses a
// unique key rather than resetting shared state — which also mirrors how it is
// used in production (one circuit per endpoint, never cleared).

let n = 0
const freshKey = () => circuitKey('GET', `/test-${n++}`, '/api')

describe('circuitKey', () => {
  it('collapses query strings so one endpoint shares one circuit', () => {
    expect(circuitKey('GET', '/events?limit=200')).toBe(circuitKey('GET', '/events?limit=50'))
  })

  it('keeps path parameters distinct', () => {
    expect(circuitKey('GET', '/markets/0xaa/history'))
      .not.toBe(circuitKey('GET', '/markets/0xbb/history'))
  })

  it('includes the base so the two clients do not share a circuit', () => {
    // /health is tried on the /api client and then on the host root. A timeout
    // on the first must not disable its own fallback.
    expect(circuitKey('GET', '/health', '/api')).not.toBe(circuitKey('GET', '/health', ''))
  })
})

describe('circuit lifecycle', () => {
  it('stays closed below the failure threshold', () => {
    const key = freshKey()
    recordFailure(key)
    recordFailure(key)
    expect(isCircuitOpen(key)).toBe(false)
  })

  it('opens on the third consecutive qualifying failure', () => {
    const key = freshKey()
    recordFailure(key)
    recordFailure(key)
    recordFailure(key)
    expect(isCircuitOpen(key)).toBe(true)
    expect(circuitCooldownSeconds(key)).toBeGreaterThan(0)
  })

  it('is reset by a success before the threshold', () => {
    const key = freshKey()
    recordFailure(key)
    recordFailure(key)
    recordSuccess(key)
    recordFailure(key)
    expect(isCircuitOpen(key)).toBe(false)
  })

  it('treats an answered request as breaking the streak', () => {
    // A 404 or 500 is a fast, cheap answer — the endpoint is healthy enough to
    // reply. Only the failures that COST a worker should trip the breaker.
    const key = freshKey()
    recordFailure(key)
    recordFailure(key)
    recordAnswered(key)
    recordFailure(key)
    expect(isCircuitOpen(key)).toBe(false)
  })

  it('half-opens after the cooldown to let exactly one probe through', () => {
    const key = freshKey()
    const t0 = Date.now()
    recordFailure(key, t0)
    recordFailure(key, t0)
    recordFailure(key, t0)
    expect(isCircuitOpen(key, t0)).toBe(true)

    const afterCooldown = t0 + 61_000
    expect(isCircuitOpen(key, afterCooldown)).toBe(false)
    // The probe consumed the half-open slot; the circuit is now closed and a
    // fresh failure streak has to build again.
    expect(isCircuitOpen(key, afterCooldown)).toBe(false)
  })

  it('reports open circuits in the snapshot the status chip reads', () => {
    const key = freshKey()
    recordFailure(key)
    recordFailure(key)
    recordFailure(key)
    const entry = circuitSnapshot().find((c) => c.key === key)
    expect(entry).toBeDefined()
    expect(entry?.open).toBe(true)
    expect(entry?.consecutiveFailures).toBeGreaterThanOrEqual(3)
  })
})
