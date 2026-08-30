// Ephemeral resource-ID lifecycle.
//
// ─── The problem ─────────────────────────────────────────────────────────────
// Polymarket's 5-minute markets rotate continuously, so every id this frontend
// handles is perishable (ID_LIFECYCLE_MANAGEMENT.md):
//
//   market_id   ~5–15 min   source /api/markets → .markets[0].id
//   order_id    sec–min     source /api/execution/orders → .active_orders[].order_id
//   position    while open  source /api/positions → .positions[].market_id
//
// A 404 on any of them is the NORMAL end of a lifecycle, not a failure. The
// distinction matters because the two need opposite treatment: an expired
// resource should be stated plainly and calmly ("this market has closed"),
// while a genuine fault should be surfaced as a fault. Collapsing them into one
// "request failed" is what made expiry look like a bug.
//
// ─── Where the "fetch fresh, cache briefly" step actually lives ──────────────
// It is not here, and it deliberately has no class of its own. Ids reach the UI
// from ApplicationStore, which polls the authoritative LIST endpoints
// (/api/markets, /api/positions, /api/execution/orders) on an interval. That
// poll IS the refresh, performed once for the whole app, and the interval is
// what bounds staleness — well inside a 5-minute market's life. A second cache
// beside it would only create a way for the two to disagree.
//
// An earlier draft of this module shipped an `EphemeralId` TTL cache modelled on
// the reference implementation in ID_LIFECYCLE_MANAGEMENT.md. Nothing used it,
// because nothing needed to: there is no id-resolution path outside the store.
// It was removed rather than left as scaffolding for a caller that may never
// exist.
//
// ─── Why there is no refresh-and-retry here ──────────────────────────────────
// The markdown suggests retrying once with a freshly-resolved id. Applied to
// this frontend, that has no safe call site, in either direction:
//
//   • Reads that name a specific resource must not substitute a different one.
//     MarketCharts renders under a heading identifying THIS market; quietly
//     charting a newer market's history would be a silent lie.
//   • Writes must never substitute. Closing "whatever position is current"
//     instead of the one the operator selected is the worst possible outcome
//     of a 404 on a destructive mutation.
//
// So the correct response to an expired id is to refresh the LIST (so the stale
// row disappears from the UI) and report the expiry — never to re-issue the
// request against a different resource. That is what callers do, and it is why
// this module offers detection and an outcome type rather than a retry engine.

import { ServiceException } from '@/lib/services/response'

/**
 * Result of reading a resource addressed by an ephemeral id.
 *
 * `expired` is deliberately not an error: it carries no message to show as a
 * fault, because nothing faulted. Callers render it as a state, not an alert.
 */
export type ResourceOutcome<T> =
  | { kind: 'ok';          value: T }
  | { kind: 'expired';     id: string }
  | { kind: 'unavailable'; error: ServiceException }

/**
 * True for the error the backend raises when an id no longer resolves.
 *
 * Used on both the read path (readEphemeral, below) and the write path
 * (config/hooks/useMutation.ts), because a 404 from
 * `POST /api/execution/close/:market_id` means exactly the same thing as one
 * from a GET: the resource finished its life before the request arrived.
 */
export function isExpiredResource(error: unknown): boolean {
  return error instanceof ServiceException && error.code === 'NOT_FOUND'
}

/**
 * Reads a resource by ephemeral id, separating expiry from failure.
 *
 * Non-404 errors are passed through as `unavailable` and are never retried — a
 * timeout or a 500 says nothing about whether the id is still valid, and this
 * backend times out often enough that retrying would multiply load on an engine
 * that has already demonstrated it wedges under it.
 */
export async function readEphemeral<T>(
  id: string,
  read: (id: string) => Promise<T>,
): Promise<ResourceOutcome<T>> {
  try {
    return { kind: 'ok', value: await read(id) }
  } catch (error) {
    if (isExpiredResource(error)) return { kind: 'expired', id }
    return {
      kind:  'unavailable',
      error: error instanceof ServiceException
        ? error
        : new ServiceException(
            'SERVICE_ERROR',
            error instanceof Error ? error.message : String(error),
            true,
          ),
    }
  }
}
