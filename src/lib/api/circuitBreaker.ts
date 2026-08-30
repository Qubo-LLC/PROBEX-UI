// Per-endpoint circuit breaker.
//
// ─── Why this exists ─────────────────────────────────────────────────────────
// Observed against the live engine on 2026-08-20: `/api/markets` and
// `/api/research/reports` accept the TCP connection and then never respond —
// verified past 40s, through the nginx bridge AND straight at the backend, so
// it is the engine hanging rather than the proxy. Both are on the polling
// loader (8s and 30s).
//
// With a 15s client timeout, a permanently-hanging endpoint polled every 8s
// means the app always has a request parked on it, and the loader's in-flight
// guard only prevents overlap for that ONE endpoint. During the audit the
// engine went from answering every read in under a second to refusing all of
// them — including `/api/stats`, which had been fast moments earlier — and did
// not recover across two minutes of probing. Uvicorn serving blocking handlers
// behaves exactly like that: a handful of hung requests occupy the worker pool
// and everything else queues behind them.
//
// A dashboard that keeps a slot occupied on a struggling engine is part of the
// problem. So after repeated timeouts the client stops asking for a while.
//
// ─── Why timeouts only ───────────────────────────────────────────────────────
// Only TIMEOUT and NETWORK trip this. A 404, 422 or 500 is a fast, cheap answer
// — the endpoint is healthy enough to reply, and suppressing those would hide
// real contract errors behind a "circuit open" message. What must be throttled
// is the class of failure that COSTS the backend a worker for 15 seconds.

/** Consecutive qualifying failures before the circuit opens. */
const FAILURE_THRESHOLD = 3

/** How long the circuit stays open before a single probe is allowed through. */
const COOLDOWN_MS = 60_000

interface CircuitState {
  consecutiveFailures: number
  /** Epoch ms after which one probe request may pass. 0 = circuit closed. */
  openUntil:           number
}

const circuits = new Map<string, CircuitState>()

function stateFor(key: string): CircuitState {
  const existing = circuits.get(key)
  if (existing !== undefined) return existing
  const created: CircuitState = { consecutiveFailures: 0, openUntil: 0 }
  circuits.set(key, created)
  return created
}

/**
 * The circuit key for a request.
 *
 * Query strings are stripped so `/events?limit=200` and `/events?limit=50`
 * share one circuit: they hit the same handler, so a hang on one is evidence
 * about the other. Path parameters are NOT stripped — `/markets/:id/history`
 * for an expired id can 404 fast while a live id hangs, and those genuinely are
 * different requests.
 *
 * `base` is part of the key because the app runs TWO clients against different
 * origins. `/health` is requested on the `/api` client first and, if that
 * fails, on the host-root client as a fallback — the deployment topology
 * decides which one is correct. Keying on the path alone would let timeouts on
 * the first open a circuit that then blocks its own fallback, disabling health
 * checks entirely on the topology where the fallback is the working path.
 */
export function circuitKey(method: string, url: string, base = ''): string {
  const path = url.split('?')[0] ?? url
  return `${method.toUpperCase()} ${base}${path}`
}

/** True when requests to this key should be refused without being sent. */
export function isCircuitOpen(key: string, now: number = Date.now()): boolean {
  const state = stateFor(key)
  if (state.openUntil === 0) return false
  if (now >= state.openUntil) {
    // Half-open: let exactly one request through. If it fails, recordFailure
    // re-opens the circuit for another cooldown; if it succeeds, the circuit
    // closes properly. Zeroing here rather than tracking a separate half-open
    // flag keeps the state machine to two fields.
    state.openUntil = 0
    return false
  }
  return true
}

/** Seconds remaining before the next probe is allowed. */
export function circuitCooldownSeconds(key: string, now: number = Date.now()): number {
  const state = stateFor(key)
  return state.openUntil === 0 ? 0 : Math.max(0, Math.ceil((state.openUntil - now) / 1_000))
}

/** Any response at all proves the endpoint is answering — close the circuit. */
export function recordSuccess(key: string): void {
  const state = stateFor(key)
  state.consecutiveFailures = 0
  state.openUntil           = 0
}

/** Records a failure that cost the backend a worker (timeout / network). */
export function recordFailure(key: string, now: number = Date.now()): void {
  const state = stateFor(key)
  state.consecutiveFailures += 1
  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.openUntil = now + COOLDOWN_MS
  }
}

/**
 * A fast, cheap failure (4xx/5xx) — resets the streak without opening.
 *
 * The endpoint answered, so it is not the hang this breaker guards against, and
 * leaving the streak intact would let three unrelated 404s over an hour trip a
 * circuit that has nothing wrong with it.
 */
export function recordAnswered(key: string): void {
  stateFor(key).consecutiveFailures = 0
}

/** Snapshot for the System diagnostics panel. */
export function circuitSnapshot(now: number = Date.now()): Array<{ key: string; open: boolean; cooldownSeconds: number; consecutiveFailures: number }> {
  return [...circuits.entries()].map(([key, state]) => ({
    key,
    open:                state.openUntil !== 0 && now < state.openUntil,
    cooldownSeconds:     state.openUntil === 0 ? 0 : Math.max(0, Math.ceil((state.openUntil - now) / 1_000)),
    consecutiveFailures: state.consecutiveFailures,
  }))
}

