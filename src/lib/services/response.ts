// Every Synatra service speaks the same envelope, so swapping mock → live is
// mechanical. The four UI states (loading / success / empty / error) are
// expressed through ServiceState; the wire payload through ApiResult.
//
// Pagination reuses the existing PaginatedResponse<T> (types/market) — not
// redefined here.

import type { PaginatedResponse } from '@/types/market'

export type { PaginatedResponse }

// ─── Status ─────────────────────────────────────────────────────────────────

export type ServiceStatus = 'loading' | 'success' | 'empty' | 'error'

export interface ServiceError {
  /** Stable machine code, e.g. 'NOT_FOUND', 'NETWORK', 'UNAUTHORIZED' */
  code:      string
  message:   string
  retryable: boolean
}

// ─── Wire payload ─────────────────────────────────────────────────────────────

export interface ApiMeta {
  total?:   number
  cursor?:  string | null
  hasMore?: boolean
  /** ISO 8601 server snapshot time */
  asOf?:    string
}

/** Success envelope returned by every service method. */
export interface ApiResult<T> {
  data:  T
  meta?: ApiMeta
}

// ─── UI state (consumed by hooks) ──────────────────────────────────────────────

/**
 * The four render states, plus the freshness of whatever `data` holds.
 *
 * ─── Why freshness is part of the state and not derived ──────────────────────
 * `useServiceQuery` has always retained the previous success when a poll fails,
 * so a transient backend fault does not blank a populated cockpit. That is the
 * right behaviour and it is kept. What was missing is the other half: the
 * retained reading then rendered *identically* to a reading that had just
 * arrived. An operator looking at a P&L figure could not tell whether it was
 * two seconds old or twenty minutes old, and nothing on screen changed at the
 * moment the engine stopped answering.
 *
 * Retaining data without saying it is retained is the failure mode this model
 * exists to remove: it is the one case where the cockpit actively misleads,
 * because the number is real, it is simply no longer true.
 *
 * So the three facts a consumer needs travel with the data:
 *   • `lastUpdatedAt` — when this reading was actually obtained
 *   • `isStale`       — whether the most recent attempt failed
 *   • `lastError`     — why it failed, retained ALONGSIDE the good data
 *
 * `error` keeps its original meaning — "there is nothing to show and here is
 * why" — and stays null whenever data survives. `lastError` is the one that is
 * set while still rendering. Conflating them would force every consumer to
 * choose between showing the data and showing the fault; they need both.
 */
export interface ServiceState<T> {
  status: ServiceStatus
  data:   T | null
  /** Set only when there is NO data to render. Stale data uses `lastError`. */
  error:  ServiceError | null
  /**
   * Epoch ms of the most recent SUCCESSFUL response. Null until one arrives.
   *
   * This is the response time, not the render time — it survives poll failures
   * unchanged, which is precisely what makes "last updated 4m ago" honest.
   */
  lastUpdatedAt: number | null
  /**
   * True when `data` is a retained earlier success and the most recent attempt
   * failed. Always false while `data` is null (nothing to be stale) and always
   * false immediately after a success (that is what recovery means).
   */
  isStale: boolean
  /**
   * The failure that made this state stale, retained next to the good data.
   * Carries the same codes as `error` (TIMEOUT / NETWORK / SERVER_ERROR /
   * CIRCUIT_OPEN / …) so the UI can distinguish a timeout from an unreachable
   * engine from a 500 without a second vocabulary. Cleared on recovery.
   */
  lastError: ServiceError | null
}

/** Streaming/subscription teardown — real-time itself lives in lib/realtime. */
export type Unsubscribe = () => void

// ─── Constructors / helpers ────────────────────────────────────────────────────

export function ok<T>(data: T, meta?: ApiMeta): ApiResult<T> {
  return meta === undefined ? { data } : { data, meta }
}

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return value.length === 0
  return false
}

/**
 * A response that just arrived. This is the ONLY constructor that stamps
 * `lastUpdatedAt`, and it always clears staleness — a success IS the recovery
 * event, so nothing else has to detect one.
 *
 * `at` is injectable for tests; production callers let it default to now.
 */
export function toServiceState<T>(result: ApiResult<T>, at: number = Date.now()): ServiceState<T> {
  return {
    status: isEmptyValue(result.data) ? 'empty' : 'success',
    data:   result.data,
    error:  null,
    lastUpdatedAt: at,
    isStale:       false,
    lastError:     null,
  }
}

export function loadingState<T>(): ServiceState<T> {
  return { status: 'loading', data: null, error: null, lastUpdatedAt: null, isStale: false, lastError: null }
}

export function errorState<T>(error: ServiceError): ServiceState<T> {
  return { status: 'error', data: null, error, lastUpdatedAt: null, isStale: false, lastError: null }
}

/**
 * A failed attempt over data we already have — the last-known-good path.
 *
 * Keeps `status`, `data` and `lastUpdatedAt` exactly as they were (the reading
 * and its age are both still facts) and records why the refresh failed. Returns
 * the previous state untouched when there is nothing to preserve, so a caller
 * never has to check first.
 */
export function staleState<T>(prev: ServiceState<T>, error: ServiceError): ServiceState<T> {
  if (prev.status !== 'success' && prev.status !== 'empty') return prev
  return { ...prev, isStale: true, lastError: error }
}

/**
 * Age of a reading in ms, or null when nothing has arrived yet.
 *
 * Derived rather than stored: a stored age would need a timer to stay true, and
 * a component that re-renders on poll already has everything it needs to
 * compute it. `now` is injectable for tests.
 */
export function stalenessMs(state: ServiceState<unknown>, now: number = Date.now()): number | null {
  return state.lastUpdatedAt === null ? null : Math.max(0, now - state.lastUpdatedAt)
}

/** Typed error thrown by services; carried through to ServiceState.error. */
/**
 * Machine code carried by the ServiceException raised when a read is aborted
 * via its AbortSignal.
 *
 * It lives here rather than in the API client because both sides of the
 * boundary need it and neither owns the other: the client RAISES it, the hooks
 * SWALLOW it. A cancellation is the one failure that must never reach the UI —
 * the caller asked for it, so rendering an error would be reporting our own
 * intent back to the operator as a fault.
 */
export const CANCELED_CODE = 'CANCELED'

/** True for the error produced by aborting an in-flight read. */
export function isCanceledError(error: unknown): boolean {
  return error instanceof ServiceException && error.code === CANCELED_CODE
}

export class ServiceException extends Error {
  readonly code:      string
  readonly retryable: boolean
  constructor(code: string, message: string, retryable = false) {
    super(message)
    this.name      = 'ServiceException'
    this.code      = code
    this.retryable = retryable
  }
}

export function toServiceError(e: unknown): ServiceError {
  if (e instanceof ServiceException) {
    return { code: e.code, message: e.message, retryable: e.retryable }
  }
  return {
    code:      'SERVICE_ERROR',
    message:   e instanceof Error ? e.message : String(e),
    retryable: true,
  }
}
