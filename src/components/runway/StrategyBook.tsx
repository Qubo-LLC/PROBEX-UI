'use client'

// Strategy Book (v8.4 §6), first version: one page over the existing read-only feeds.
//   1 Book overview   research ledgers (crypto first) and the strategy ranking (active / retired tabs)
//   2 Positions       EVENTS positions with the recommendation gate's decision per market
//   3 Watchlist       each source's top rows from the edge scanner (research, not trading)
//   4 Risk            the sleeve panel (capital, exposure, drawdown, halts) lives on Capital & book
// Crypto delta/vega columns appear when a crypto strategy holds positions (none: CRYPTO_STRATEGY=none). Simulated.

import { EdgeScannerPanel } from './EdgeScannerPanel'
import { EventsPositionsPanel } from './EventsPositionsPanel'
import { LedgersPanel, RankingPanel } from './RankingPanel'

export function StrategyBook() {
  return (
    <main className="p-4" data-testid="strategy-book">
      <h1 className="t-page-title mb-1">Strategy Book</h1>
      <p className="t-description mb-2">
        Paper and research figures (simulated). No strategy has passed §8; nothing trades live. Every new trade would book
        under the CONSERVATIVE profile (¼ Kelly on p_lcb, 5% per position, 25% total, 20% drawdown stop).
      </p>
      <LedgersPanel />
      <RankingPanel />
      <EventsPositionsPanel />
      <section className="mt-6" aria-labelledby="watchlist">
        <h2 id="watchlist" className="t-section-title mb-2">Watchlist (edge scanner, research)</h2>
        <EdgeScannerPanel />
      </section>
    </main>
  )
}
