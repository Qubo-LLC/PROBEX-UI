// Health-status normalization — the boundary between the engine's wire
// vocabulary and the app's canonical health model.
//
// ─── Why this module exists ──────────────────────────────────────────────────
// The domain type has always been `'online' | 'degraded' | 'offline'`, and the
// DTO adapters asserted the wire value into it with a bare `as` cast:
//
//     status: dto.status as EngineHealthStatus
//
// A cast is not a conversion. It tells the compiler to stop checking; it does
// not make the value true. The live engine reports `"healthy"` on both
// `/health` and `/api/stats`, which is not one of the three canonical values —
// so every downstream comparison silently failed:
//
//   • deriveSystemStatus()  `healthStatus === 'online'` never matched, so a
//                           genuinely healthy engine fell through to the
//                           `unknown` state and the top nav read STATE UNKNOWN
//   • SystemStatePanel      `h.status === 'online' ? 'ok' : … : 'bad'` fell to
//                           'bad', printing the word "Healthy" in the danger
//                           colour
//   • HealthPanel           `live={health.status === 'online'}` never pulsed
//
// None of it produced a type error, a runtime error, or a log line. That is the
// specific failure mode a cast creates: a wrong value that type-checks.
//
// The fix is a real mapping with a fail-safe default. Everything downstream now
// compares against a value that was actually produced by this function.
//
// ─── The wire vocabulary ─────────────────────────────────────────────────────
// Verified against the live engine on 2026-08-20:
//
//   GET /health          → {"status":"healthy", …}   and later  {"status":"unhealthy", …}
//   GET /api/stats       → {"health_status":"healthy"} / {"health_status":"unhealthy"}
//   GET /  (host root)   → {"status":"online", …}
//
// So the engine genuinely uses several spellings, on different endpoints and in
// different conditions. All of them are observed; none is invented.
//
// ─── Why `unhealthy` maps to `degraded` and not `offline` ────────────────────
// Captured while the engine was in that state:
//
//   status: "unhealthy",  uptime_seconds: 3516,
//   components: price_feed ✓ · main_loop ✗ ("No heartbeat for 156.3s") ·
//               api_access ✓ ("Market data fresh") · memory ✓
//   host root:  {"status":"online", "runtime":{"mode":"paper"}}
//
// Three of four probes passing, market data fresh, the process answering and
// reporting itself online. That is the canonical `degraded` definition in
// lib/display/systemStatus.ts — "reachable and running, with something wrong
// inside" — and it is emphatically NOT `offline`, whose copy reads "the engine
// reports itself as NOT RUNNING". Mapping it to `offline` would tell the
// operator the engine had stopped while it was still trading.
//
// `degraded` and `offline` are also mapped identity-wise so a backend already
// speaking the canonical vocabulary keeps working.
//
// Nothing beyond the observed set is guessed. An engine that starts sending
// `"critical"` will normalize to `null`, not to a plausible-looking state — see
// below for why that is the right direction to fail.

import type { EngineHealthStatus } from '@/types/engine'

/**
 * The canonical health vocabulary. Unchanged by this module — the point is to
 * make wire values arrive AS these, not to add new ones.
 */
export const CANONICAL_HEALTH_STATUSES: readonly EngineHealthStatus[] = [
  'online', 'degraded', 'offline',
] as const

/**
 * Wire value → canonical value.
 *
 * Keys are lowercased before lookup, so casing differences on the wire
 * ("Healthy", "HEALTHY") resolve identically. Every entry here corresponds to a
 * value the backend is known to send or to the canonical name itself; no
 * speculative synonyms are included.
 */
const WIRE_TO_CANONICAL: Readonly<Record<string, EngineHealthStatus>> = {
  // Observed on /health and /api/stats when every probe passes.
  healthy:   'online',
  // Observed on the host-root identity endpoint.
  online:    'online',
  // Observed on /health and /api/stats with 3/4 probes passing and the process
  // still running — see the header block for the captured payload.
  unhealthy: 'degraded',
  // Declared by the DTO contract; mapped identity-wise.
  degraded:  'degraded',
  offline:   'offline',
}

/** Distinct unrecognised values already reported, so a poll loop logs once. */
const reported = new Set<string>()

/**
 * Normalizes a wire health status into the canonical model.
 *
 * Returns `null` when the value is absent, blank, or not recognised.
 *
 * ─── Why `null` rather than a fallback ───────────────────────────────────────
 * The tempting default is 'online' (optimistic) or 'offline' (pessimistic).
 * Both are wrong, for the same reason: they answer a question we do not have
 * the information to answer.
 *
 * `null` is already a first-class input to deriveSystemStatus — it resolves to
 * the `unknown` state, which is explicitly documented there as "partial
 * knowledge is not good news, and it is not an error either", and which
 * `statusNeedsAttention()` still flags for the operator. So an unrecognised
 * value surfaces as an honest "we cannot say", which is exactly what it is,
 * instead of being laundered into a confident claim.
 *
 * That is the same failure this module exists to remove — it must not
 * reintroduce it at the default.
 */
export function normalizeHealthStatus(
  raw: string | null | undefined,
): EngineHealthStatus | null {
  const key = (raw ?? '').trim().toLowerCase()
  if (key === '') return null

  const canonical = WIRE_TO_CANONICAL[key]
  if (canonical !== undefined) return canonical

  // Surfaced, not swallowed. A new backend vocabulary is a real event: the
  // cockpit will show "State unknown" until this map is extended, and the
  // operator deserves to know why rather than hunting a silent mismatch.
  if (!reported.has(key)) {
    reported.add(key)
    console.warn(
      `[Probex] Unrecognised engine health status "${raw}". ` +
      `Known wire values: ${Object.keys(WIRE_TO_CANONICAL).join(', ')}. ` +
      'Treating as unknown — the cockpit will not claim the engine is healthy ' +
      'on a value it cannot interpret. Extend WIRE_TO_CANONICAL in ' +
      'src/lib/services/health.ts once the new value is confirmed with the backend.',
    )
  }
  return null
}

/** Test/ops hook — clears the warn-once memo. */
export function resetHealthStatusWarnings(): void {
  reported.clear()
}
