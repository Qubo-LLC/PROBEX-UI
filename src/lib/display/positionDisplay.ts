// Position presentation helpers.
//
// Every value here is either a field the wire already carries or a pure
// function of one. Nothing is inferred where the data is absent: the callers
// below all return null rather than a plausible-looking guess, because a
// position surface that invents a runtime or a resolution time is worse than
// one that admits it does not know.

import { marketLifecycle, type MarketLifecycle } from './marketLifecycle'
import { shortMarketId } from './eventDisplay'

/**
 * How long a position has been open, from `time_held_seconds`.
 *
 * These are 5- and 15-minute markets, so minutes and seconds are the units
 * that carry information — an hours-only rendering reads "0h" for the entire
 * life of every position it describes (the same mistake Stage 5 removed from
 * the market countdown).
 */
export function formatRuntime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—'
  const s = Math.floor(seconds)
  if (s < 60) return `${s}s`
  const mins = Math.floor(s / 60)
  if (mins < 60) return `${mins}m ${s % 60}s`
  const h = Math.floor(mins / 60)
  return h < 24 ? `${h}h ${mins % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`
}

/**
 * A readable identity for a position whose wire row has no `question`.
 *
 * `/api/positions/history` carries `asset_symbol` and `duration_minutes` but
 * not the market question, so the settled blotter had nothing to show but a
 * truncated condition id. "BTC 15m" is built from two real fields and tells an
 * operator what they actually traded.
 */
export function marketIdentity(
  assetSymbol: string | null,
  durationMinutes: number | null,
  marketId: string,
): string {
  if (assetSymbol !== null && durationMinutes !== null) return `${assetSymbol} ${durationMinutes}m`
  if (assetSymbol !== null) return assetSymbol
  return shortMarketId(marketId)
}

/** Underlying move between entry and now, as a signed fraction. */
export function underlyingMove(entry: number | null, current: number | null): number | null {
  if (entry === null || current === null || entry === 0) return null
  return (current - entry) / entry
}

export interface PositionCloseState {
  lifecycle: MarketLifecycle
  /** Wall-clock close time, when the market is in the catalogue. */
  closesAt: number | null
}

/**
 * The lifecycle of the market a position is held against.
 *
 * `/api/positions` does NOT carry the market's close time — only
 * `duration_minutes`, which is the window's LENGTH, not its end. So this has to
 * come from a join against the markets catalogue, and the join legitimately
 * misses: the engine's market cache holds only the markets it is currently
 * tracking, so a position on an older market resolves to `unknown`.
 *
 * `unknown` is the correct answer in that case. `duration_minutes` plus
 * `opened_at` would produce a close time, but it would be wrong — a position
 * can be opened at any point inside the window, so opened_at + duration is not
 * the market's end. That arithmetic is exactly the kind of plausible-looking
 * fabrication this function exists to avoid.
 */
export function positionCloseState(
  marketId: string | null,
  closesAtByMarketId: Map<string, number | null>,
  now: number = Date.now(),
): PositionCloseState {
  if (marketId === null) return { lifecycle: 'unknown', closesAt: null }
  const closesAt = closesAtByMarketId.get(marketId)
  if (closesAt === undefined || closesAt === null) return { lifecycle: 'unknown', closesAt: null }
  return { lifecycle: marketLifecycle(closesAt, now), closesAt }
}
