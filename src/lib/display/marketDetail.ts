// Market Detail presentation helpers — what the page can honestly say about
// one market, from the records that name its id.
//
// ─── What names a market (re-captured 2026-09-15/16) ─────────────────────────
//   /api/markets/:id           the market itself — ONLY while the engine still
//                              holds it; 404 once the window has rotated out
//                              (every market, ~15 minutes after it opens)
//   /api/markets/:id/history   survives expiry; each snapshot carries the
//                              question, yes/no price, volume, btc_price
//   /api/trades/ledger,        the engine's settled trade on the market:
//   /api/positions/history     side, stake, entry/exit, P&L, won, edge at entry
//   /api/positions             an open position, while one exists
//   /api/edges                 the engine's current edge, while it sees one
//   /api/events                trade and edge events carrying the market id
//
// Every relationship below is a join on `market_id`. None of them is a claim
// of cause: a trade recorded on a market is a fact; "the edge caused the trade"
// is not on any wire and is never said.
//
// ─── One thing the previous page got wrong ───────────────────────────────────
// MarketCharts read `baseline_price` off the FIRST history snapshot and called
// it the resolution baseline, then compared the LAST snapshot's btc_price to
// it. Measured on the live history (2026-09-16): baseline_price equals
// btc_price on every snapshot — it moves with the feed. The first snapshot's
// value is the BTC price at that moment, not a reference the market resolves
// against, so "BTC currently below the baseline" was a comparison of the price
// with itself a few minutes earlier. The history now reports the BTC path as
// what it is; the reported baseline is shown only from the market's own record
// and its relationship to the live price only where it can be checked.

import type { MarketRow } from '@/lib/mappers/markets'
import type { MarketHistoryPoint, SettledTrade } from '@/types/engine'
import type { PositionRow } from '@/lib/mappers/positions'

// ─── Identity ─────────────────────────────────────────────────────────────────

export interface MarketIdentityReading {
  question: string
  /** Where the question came from — the market's own record, or a history
   *  snapshot once the record has expired. */
  source: 'market' | 'history'
  durationMinutes: number | null
}

/**
 * The market's question, from its own record while it exists, else from the
 * history that outlives it. Null when nothing names it — the page must then
 * show the id, not a guess.
 */
export function identityReading(market: MarketRow | undefined, history: readonly MarketHistoryPoint[]): MarketIdentityReading | null {
  if (market !== undefined) return { question: market.title, source: 'market', durationMinutes: market.durationMinutes }
  const first = history[0]
  if (first !== undefined && first.question.length > 0) {
    return { question: first.question, source: 'history', durationMinutes: first.durationMinutes }
  }
  return null
}

/** Whether the title names Bitcoin. Only BTC has a live price feed in this
 *  product, so only a BTC market's baseline can be checked against anything. */
export function isBtcMarket(title: string): boolean {
  return /\b(bitcoin|btc)\b/i.test(title)
}

// ─── Baseline ─────────────────────────────────────────────────────────────────

export type BaselineReading =
  /** BTC market with a live price: the relationship is computable and marked derived. */
  | { kind: 'derived'; baseline: number; now: number; above: boolean }
  /** A baseline is reported but nothing on this screen can check it. */
  | { kind: 'reported'; baseline: number }
  /** A non-BTC market whose baseline is a BTC figure — withheld, with the reason. */
  | { kind: 'withheld'; reason: string }
  | { kind: 'absent' }

/** How far a non-BTC market's baseline may sit from the live BTC price before
 *  it is treated as a BTC figure wearing the wrong label. Measured 2026-09-11:
 *  an Ethereum market reported baseline 78710 against ETH ≈ 3900. */
const BTC_LOOKALIKE_TOLERANCE = 0.05

export function baselineReading(market: MarketRow, btcNow: number | null): BaselineReading {
  const baseline = market.baselinePrice
  if (baseline === null || !Number.isFinite(baseline)) return { kind: 'absent' }
  if (isBtcMarket(market.title)) {
    return btcNow === null ? { kind: 'reported', baseline } : { kind: 'derived', baseline, now: btcNow, above: btcNow >= baseline }
  }
  if (btcNow !== null && Math.abs(baseline - btcNow) / btcNow <= BTC_LOOKALIKE_TOLERANCE) {
    return { kind: 'withheld', reason: 'the reported baseline matches the BTC price, not this asset — not shown as this market’s baseline' }
  }
  return { kind: 'reported', baseline }
}

// ─── History ──────────────────────────────────────────────────────────────────

export interface HistoryTrajectory {
  snapshots: number
  from: MarketHistoryPoint
  to:   MarketHistoryPoint
  /** Signed BTC move across the recorded snapshots, as a fraction. */
  btcMove: number | null
  /** Signed YES-price move across the recorded snapshots, in cents (the
   *  domain point already carries cents). */
  yesMoveCents: number
}

/** The recorded path from the oldest snapshot to the newest. `history` must be
 *  chronological (what the adapter guarantees). Null below two snapshots — a
 *  single point has no path. */
export function historyTrajectory(history: readonly MarketHistoryPoint[]): HistoryTrajectory | null {
  if (history.length < 2) return null
  const from = history[0]!
  const to   = history[history.length - 1]!
  return {
    snapshots: history.length,
    from,
    to,
    btcMove: from.btcPrice > 0 ? (to.btcPrice - from.btcPrice) / from.btcPrice : null,
    yesMoveCents: to.yesPrice - from.yesPrice,
  }
}

// ─── The book on this market ──────────────────────────────────────────────────

export interface MarketBook {
  /** Open position on this market, if the engine holds one. */
  open:    PositionRow | null
  /** Settled trades on this market, newest first. The engine holds at most one
   *  position per market, so more than one means the market was traded again. */
  settled: SettledTrade[]
}

export function marketBook(
  marketId: string,
  positions: readonly PositionRow[],
  ledger: readonly SettledTrade[],
  history: readonly SettledTrade[],
): MarketBook {
  // The ledger and the positions history share one item shape and, on the live
  // engine, one content; a trade present in both is one trade.
  const seen = new Set<string>()
  const settled: SettledTrade[] = []
  for (const t of [...ledger, ...history]) {
    if (t.marketId !== marketId) continue
    const key = `${t.openedAt}\u001f${t.closedAt}\u001f${t.direction}`
    if (seen.has(key)) continue
    seen.add(key)
    settled.push(t)
  }
  settled.sort((a, b) => b.closedAt - a.closedAt)
  return { open: positions.find((p) => p.marketId === marketId) ?? null, settled }
}
