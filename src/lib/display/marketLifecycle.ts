// Market lifecycle, derived from the one field the wire actually carries.
//
// `/api/markets` has no `status`. It has `closes_at`, and the markets mapper
// already records why that is enough: "the wire has no `status` field, but
// `closes_at` makes expiry a fact". `marketDetailToRow` acts on that and sets
// status from `hasClosed`; the list path does not, so a market that closed an
// hour ago renders in the catalogue exactly like one that is still open.
//
// That is not a cosmetic gap. The forensic audit of 2026-09-09 found the engine
// serving a market that had closed thirty minutes earlier, and the UI showing it
// as an ordinary, clickable row. A closed market must not look actionable.
//
// Nothing here is invented: every state is a comparison between `closesAt` and
// the current time, and when `closesAt` is null the answer is `unknown` rather
// than a guess.

export type MarketLifecycle = 'open' | 'closing' | 'closed' | 'unknown'

/** Inside this window a market is about to resolve and is worth marking. */
export const CLOSING_SOON_MS = 2 * 60 * 1000

export function marketLifecycle(closesAt: number | null, now: number = Date.now()): MarketLifecycle {
  if (closesAt === null || !Number.isFinite(closesAt)) return 'unknown'
  if (closesAt <= now) return 'closed'
  if (closesAt - now <= CLOSING_SOON_MS) return 'closing'
  return 'open'
}

/**
 * The close time as an operator reads it.
 *
 * These are 5- and 15-minute markets, so a calendar date answers nothing —
 * every market closes "today", and the card previously printed exactly that.
 * What matters is how long is left, or how long ago it went.
 */
export function formatCloseTime(closesAt: number | null, now: number = Date.now()): string {
  if (closesAt === null || !Number.isFinite(closesAt)) return '—'
  const deltaMs = closesAt - now
  const mins = Math.round(Math.abs(deltaMs) / 60000)

  if (deltaMs > 0) {
    if (mins < 1) return 'closes <1m'
    if (mins < 60) return `closes ${mins}m`
    const h = Math.floor(mins / 60)
    return h < 24 ? `closes ${h}h ${mins % 60}m` : `closes ${Math.floor(h / 24)}d`
  }
  if (mins < 1) return 'closed just now'
  if (mins < 60) return `closed ${mins}m ago`
  const h = Math.floor(mins / 60)
  return h < 24 ? `closed ${h}h ago` : `closed ${Math.floor(h / 24)}d ago`
}

/** Wall-clock close time, for a tooltip where the exact moment matters. */
export function closeTimestamp(closesAt: number | null): string | undefined {
  if (closesAt === null || !Number.isFinite(closesAt)) return undefined
  return `Closes ${new Date(closesAt).toLocaleString()}`
}

/** Tone for StatusChip. `closed` is neutral, not negative: an expired market is
 *  a fact about the calendar, not a fault or a loss. */
export function lifecycleTone(l: MarketLifecycle): 'positive' | 'warning' | 'neutral' {
  return l === 'closing' ? 'warning' : l === 'open' ? 'positive' : 'neutral'
}

export function lifecycleLabel(l: MarketLifecycle): string {
  return l === 'open' ? 'Open' : l === 'closing' ? 'Closing' : l === 'closed' ? 'Closed' : 'Unknown'
}
