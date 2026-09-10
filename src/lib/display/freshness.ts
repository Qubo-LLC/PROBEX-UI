// Freshness presentation — turns a ServiceState's timing facts into the words
// and severity the cockpit shows.
//
// ─── Why this is a separate pure module ──────────────────────────────────────
// The reliability model in lib/services/response.ts answers "is this reading
// current?"; this module answers "what do we tell the operator about it?".
// Keeping them apart means the phrasing can be tested exhaustively without a
// React tree, and — more importantly — means no component invents its own
// wording for the same condition. A cockpit where one panel says "stale", the
// next says "disconnected" and a third just greys out is not communicating a
// system state, it is three components guessing independently.
//
// ─── The distinction this module is careful about ────────────────────────────
// "Stale" and "old" are not the same claim and must not render the same way:
//
//   • STALE  — the last refresh FAILED. We know the reading is not current.
//              This is a fault, and it is named as one.
//   • AGING  — every refresh has succeeded, but the reading is older than the
//              poll cadence should allow. Nothing has failed; the endpoint is
//              simply slow, or the tab was hidden and polling paused. Reporting
//              this as a fault would cry wolf on ordinary tab-switching.
//
// Only the first is an error condition. Conflating them was the temptation
// worth resisting: it would have made the indicator noisy enough to ignore,
// which is the same as not having one.

import type { ServiceState, ServiceError } from '@/lib/services/response'
import { stalenessMs } from '@/lib/services/response'

export type FreshnessLevel =
  /** Last refresh succeeded and the reading is within its expected cadence. */
  | 'fresh'
  /** Every refresh succeeded, but this reading is older than expected. */
  | 'aging'
  /** The last refresh FAILED; the reading on screen is retained, not current. */
  | 'stale'
  /** Nothing has ever arrived — there is no reading to describe. */
  | 'never'

export interface Freshness {
  level: FreshnessLevel
  /** Age of the reading in ms; null when nothing has arrived. */
  ageMs: number | null
  /** "just now" · "12s ago" · "4m ago" · "1h 5m ago"; null when never. */
  ageLabel: string | null
  /**
   * One operator-facing line. Always states the age when there is one, so the
   * reading's actual currency is never left implicit.
   */
  message: string
  /** The failure that made this stale, when it is stale. */
  error: ServiceError | null
}

/**
 * How far past the expected cadence a reading may drift before it is called
 * 'aging'. Three intervals tolerates one missed tick plus jitter — the initial
 * fetch is already jittered up to 1.5s, and a hidden tab skips ticks entirely.
 */
const AGING_MULTIPLE = 3

/**
 * Floor for the aging threshold, in ms.
 *
 * The fast tier polls every 2s, so a bare 3× would call a reading "aging" at
 * 6s — true, and useless: it would flag every ordinary hiccup on the busiest
 * panels in the product. 30s is the point at which a still-successful endpoint
 * being behind is worth a glance.
 */
const AGING_FLOOR_MS = 30_000

/**
 * Human-readable elapsed time. Deliberately coarse: the operator needs to know
 * whether a number is seconds or minutes old, and false precision on a value
 * that is already uncertain reads as confidence the cockpit does not have.
 */
export function formatAge(ms: number): string {
  if (ms < 5_000)  return 'just now'
  if (ms < 60_000) return `${Math.floor(ms / 1_000)}s ago`
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  const rem   = minutes % 60
  return rem === 0 ? `${hours}h ago` : `${hours}h ${rem}m ago`
}

/**
 * Plain-language cause, derived from the error code the API client already
 * assigns. No new vocabulary is invented here — every code listed is one
 * `toServiceException` or the circuit breaker actually produces.
 *
 * The default deliberately quotes the engine's own message rather than
 * flattening an unknown failure into "something went wrong": an unrecognised
 * code is exactly when the raw detail is most useful.
 */
export function describeFailure(error: ServiceError | null): string {
  if (error === null) return 'the last refresh failed'
  switch (error.code) {
    case 'TIMEOUT':       return 'the engine did not respond in time'
    case 'NETWORK':       return 'the engine could not be reached'
    case 'CIRCUIT_OPEN':  return 'requests are paused after repeated failures'
    case 'SERVER_ERROR':  return 'the engine returned an error'
    case 'RATE_LIMITED':  return 'the engine is rate-limiting requests'
    case 'NOT_FOUND':     return 'the engine no longer serves this data'
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':     return 'the engine refused the request'
    case 'PAYLOAD_UNAVAILABLE': return 'the engine has not computed this yet'
    default:              return error.message || 'the last refresh failed'
  }
}

/**
 * Derives the freshness of a slice.
 *
 * @param state              Any ServiceState.
 * @param expectedIntervalMs The endpoint's poll cadence, when the caller knows
 *                           it. Without it only 'fresh' / 'stale' / 'never' are
 *                           reported — 'aging' is unknowable with no cadence to
 *                           be late against, and guessing one would manufacture
 *                           a warning out of nothing.
 * @param now                Injectable clock for tests.
 */
export function deriveFreshness(
  state: ServiceState<unknown>,
  expectedIntervalMs?: number,
  now: number = Date.now(),
): Freshness {
  const ageMs = stalenessMs(state, now)

  if (ageMs === null) {
    return {
      level:    'never',
      ageMs:    null,
      ageLabel: null,
      message:  state.status === 'error'
        ? `No data received — ${describeFailure(state.error)}.`
        : 'Waiting for the first response.',
      error:    state.error,
    }
  }

  const ageLabel = formatAge(ageMs)

  if (state.isStale) {
    return {
      level:    'stale',
      ageMs,
      ageLabel,
      // Both halves matter and neither is sufficient alone: the age says how
      // wrong the number might be, the cause says whether to expect it back.
      message:  `Showing the last reading from ${ageLabel} — ${describeFailure(state.lastError)}.`,
      error:    state.lastError,
    }
  }

  const threshold = expectedIntervalMs === undefined
    ? null
    : Math.max(AGING_FLOOR_MS, expectedIntervalMs * AGING_MULTIPLE)

  if (threshold !== null && ageMs > threshold) {
    return {
      level:    'aging',
      ageMs,
      ageLabel,
      message:  `Last updated ${ageLabel} — slower than expected, but still updating.`,
      error:    null,
    }
  }

  return {
    level:    'fresh',
    ageMs,
    ageLabel,
    message:  `Updated ${ageLabel}.`,
    error:    null,
  }
}
