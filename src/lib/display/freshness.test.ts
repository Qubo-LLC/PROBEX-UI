import { describe, it, expect } from 'vitest'
import { deriveFreshness, formatAge, describeFailure } from './freshness'
import {
  ok, toServiceState, loadingState, errorState, staleState, stalenessMs,
  type ServiceState, type ServiceError,
} from '@/lib/services/response'

const T0 = 1_700_000_000_000
const err = (code: string, message = 'boom'): ServiceError => ({ code, message, retryable: true })

describe('stalenessMs', () => {
  it('is null before anything has arrived', () => {
    expect(stalenessMs(loadingState<number>(), T0)).toBeNull()
    expect(stalenessMs(errorState<number>(err('NETWORK')), T0)).toBeNull()
  })

  it('measures from the last SUCCESS, not from now', () => {
    const s = toServiceState(ok(1), T0)
    expect(stalenessMs(s, T0 + 4_000)).toBe(4_000)
  })

  it('never reports a negative age when clocks disagree', () => {
    const s = toServiceState(ok(1), T0)
    expect(stalenessMs(s, T0 - 5_000)).toBe(0)
  })
})

describe('staleState', () => {
  it('retains the data, the status AND the original timestamp', () => {
    const good  = toServiceState(ok([1, 2, 3]), T0)
    const stale = staleState(good, err('TIMEOUT'))

    expect(stale.status).toBe('success')
    expect(stale.data).toEqual([1, 2, 3])
    // The reading's age is a fact about when it was OBTAINED. A failed refresh
    // must not advance it — that would make stale data look freshly fetched.
    expect(stale.lastUpdatedAt).toBe(T0)
    expect(stale.isStale).toBe(true)
    expect(stale.lastError?.code).toBe('TIMEOUT')
  })

  it('leaves `error` null so the panel keeps rendering its data', () => {
    const stale = staleState(toServiceState(ok(1), T0), err('SERVER_ERROR'))
    expect(stale.error).toBeNull()
    expect(stale.lastError).not.toBeNull()
  })

  it('preserves an `empty` success too — an empty list is a real answer', () => {
    const empty = toServiceState(ok([]), T0)
    expect(empty.status).toBe('empty')
    expect(staleState(empty, err('NETWORK')).isStale).toBe(true)
  })

  it('is a no-op when there is nothing to preserve', () => {
    const loading = loadingState<number>()
    expect(staleState(loading, err('NETWORK'))).toBe(loading)
  })

  it('recovery clears staleness and re-stamps the timestamp', () => {
    const stale     = staleState(toServiceState(ok(1), T0), err('TIMEOUT'))
    const recovered = toServiceState(ok(2), T0 + 60_000)

    expect(recovered.isStale).toBe(false)
    expect(recovered.lastError).toBeNull()
    expect(recovered.lastUpdatedAt).toBe(T0 + 60_000)
    expect(stale.isStale).toBe(true)   // the old state is not mutated
  })
})

describe('formatAge', () => {
  it.each([
    [0, 'just now'],
    [4_999, 'just now'],
    [5_000, '5s ago'],
    [59_999, '59s ago'],
    [60_000, '1m ago'],
    [59 * 60_000, '59m ago'],
    [60 * 60_000, '1h ago'],
    [65 * 60_000, '1h 5m ago'],
  ])('%ims → %s', (ms, expected) => {
    expect(formatAge(ms)).toBe(expected)
  })
})

describe('describeFailure', () => {
  it('distinguishes the failure modes an operator must tell apart', () => {
    expect(describeFailure(err('TIMEOUT'))).toContain('did not respond in time')
    expect(describeFailure(err('NETWORK'))).toContain('could not be reached')
    expect(describeFailure(err('SERVER_ERROR'))).toContain('returned an error')
    expect(describeFailure(err('CIRCUIT_OPEN'))).toContain('paused')
  })

  it('quotes the engine rather than flattening an unknown code', () => {
    expect(describeFailure(err('SOMETHING_NEW', 'kalman bank exploded')))
      .toBe('kalman bank exploded')
  })
})

describe('deriveFreshness', () => {
  it("reports 'never' before the first response", () => {
    const f = deriveFreshness(loadingState<number>(), 5_000, T0)
    expect(f.level).toBe('never')
    expect(f.ageMs).toBeNull()
  })

  it("reports 'never' with the cause when the first read failed", () => {
    const f = deriveFreshness(errorState<number>(err('NETWORK')), 5_000, T0)
    expect(f.level).toBe('never')
    expect(f.message).toContain('could not be reached')
  })

  it("reports 'fresh' inside the expected cadence", () => {
    const s = toServiceState(ok(1), T0)
    expect(deriveFreshness(s, 5_000, T0 + 3_000).level).toBe('fresh')
  })

  it("reports 'stale' with BOTH the age and the cause", () => {
    const s = staleState(toServiceState(ok(1), T0), err('TIMEOUT'))
    const f = deriveFreshness(s, 5_000, T0 + 240_000)

    expect(f.level).toBe('stale')
    expect(f.ageLabel).toBe('4m ago')
    expect(f.message).toContain('4m ago')
    expect(f.message).toContain('did not respond in time')
  })

  it('does not call a successful-but-slow reading a fault', () => {
    // 90s old on a 5s cadence: behind, but every request succeeded. Reporting
    // this as stale would fire on ordinary tab-switching (polling pauses while
    // hidden) and train the operator to ignore the indicator.
    const s = toServiceState(ok(1), T0)
    const f = deriveFreshness(s, 5_000, T0 + 90_000)

    expect(f.level).toBe('aging')
    expect(f.error).toBeNull()
    expect(f.message).toContain('still updating')
  })

  it('applies a floor so the 2s tier does not flag every hiccup', () => {
    // 3 × 2s = 6s would be "aging"; the 30s floor keeps it fresh.
    const s = toServiceState(ok(1), T0)
    expect(deriveFreshness(s, 2_000, T0 + 20_000).level).toBe('fresh')
    expect(deriveFreshness(s, 2_000, T0 + 31_000).level).toBe('aging')
  })

  it("never reports 'aging' without a cadence to be late against", () => {
    const s = toServiceState(ok(1), T0)
    expect(deriveFreshness(s, undefined, T0 + 86_400_000).level).toBe('fresh')
  })

  it('staleness outranks age — a fault is not merely old data', () => {
    const s = staleState(toServiceState(ok(1), T0), err('SERVER_ERROR'))
    expect(deriveFreshness(s, 5_000, T0 + 10_000_000).level).toBe('stale')
  })
})

describe('the failure this model exists to prevent', () => {
  it('a retained reading is never indistinguishable from a fresh one', () => {
    const fresh: ServiceState<number> = toServiceState(ok(42), T0)
    const stale = staleState(fresh, err('NETWORK'))

    // Same status, same data — which is exactly why the old two-field
    // ServiceState could not tell an operator these apart.
    expect(stale.status).toBe(fresh.status)
    expect(stale.data).toBe(fresh.data)

    // The freshness model must separate them.
    expect(deriveFreshness(stale, 5_000, T0 + 1_200_000).level).toBe('stale')
    expect(deriveFreshness(fresh, 5_000, T0 + 1_000).level).toBe('fresh')
  })
})
