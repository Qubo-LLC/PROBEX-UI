// ─── BTC Price History mapper ─────────────────────────────────────────────────
//
// ✅ COVERAGE: /api/price-history is fully live.
//    Returns current BTC price + 50 historical price points (UTC, UTC-stamped).
//
// Maps PriceHistory → BtcPriceChartViewModel for any chart or price display
// component that needs chart-ready data (absolute values, deltas, range).
//
// Component slots ready to consume this:
//   - Analytics page  → price history card (to be wired in PortfolioAnalytics or
//                        a new EnginePriceCard section)
//   - Admin page      → supplementary BTC context strip
//   - Live page       → price ticker (blocked: /api/stats NETWORK ERROR, but
//                        /api/price-history provides the current price)

import type { PriceHistory } from '@/types/engine'
import { formatSeconds } from '@/lib/display/time'

// ─── View model ───────────────────────────────────────────────────────────────

export interface BtcPricePoint {
  ts:    number   // epoch ms
  price: number   // USD
}

/**
 * Chart-ready BTC price state derived from /api/price-history.
 * All derived values are null-safe — consumers can render them unconditionally.
 */
export interface BtcPriceChartViewModel {
  /** All historical points plus current price appended as the terminal point. */
  points:         BtcPricePoint[]
  /** Current spot price (USD). */
  currentPrice:   number
  /** Oldest point price in the history window. */
  openPrice:      number
  /** Highest price across the history window. */
  highPrice:      number
  /** Lowest price across the history window. */
  lowPrice:       number
  /** Absolute price change: currentPrice − openPrice. Signed. */
  priceChange:    number
  /** Percentage change: (currentPrice − openPrice) / openPrice. Signed decimal. */
  priceChangePct: number
  /** Total number of data points (including current). */
  sampleCount:    number
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function toBtcPriceChart(ph: PriceHistory): BtcPriceChartViewModel {
  const points: BtcPricePoint[] = ph.history.map(p => ({ ts: p.ts, price: p.price }))

  // Append the current price as the terminal data point if it differs from
  // the last history entry (the backend sometimes omits it from the array).
  // Use .at() to avoid noUncheckedIndexedAccess false-positives on [n-1] / [0].
  const lastPoint = points.at(-1)
  if (!lastPoint || lastPoint.price !== ph.current) {
    points.push({ ts: ph.timestamp, price: ph.current })
  }

  const prices    = points.map(p => p.price)
  const openPrice = points.at(0)?.price ?? ph.current
  const highPrice = Math.max(...prices)
  const lowPrice  = Math.min(...prices)

  return {
    points,
    currentPrice:   ph.current,
    openPrice,
    highPrice,
    lowPrice,
    priceChange:    ph.current - openPrice,
    priceChangePct: openPrice > 0 ? (ph.current - openPrice) / openPrice : 0,
    sampleCount:    points.length,
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** "$XX,XXX" — compact display format for a BTC price. */
export function formatBtcPrice(price: number): string {
  return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

/** "+2.4%" / "-1.1%" — signed percentage with sign character. */
export function formatPriceChangePct(pct: number): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${(pct * 100).toFixed(2)}%`
}

/**
 * Append the window a change was measured over: "+0.00% · 21s". The engine's
 * /api/price-history is a short tick buffer (observed: ~0.7–25 s), so a change
 * without its window reads as a daily move it is not. Fewer than two points →
 * the change is returned unlabelled only because there is no window to state.
 */
export function withChangeWindow(changeText: string, points: readonly BtcPricePoint[]): string {
  if (points.length < 2) return changeText
  const first = points[0]!.ts
  const last = points[points.length - 1]!.ts
  const seconds = Math.max(0, (last - first) / 1000)
  return `${changeText} · ${formatSeconds(seconds)}`
}
