'use client'

// MarketArc — the first arc of the loop: what the market is doing.
//
// ─── Why this is not a card ──────────────────────────────────────────────────
// This replaces the left half of EngineFocusHero, which sat inside an elevated
// bordered surface alongside the engine's own reading. Boxing them together
// said "these are one thing"; boxing them apart would say "these are unrelated".
// Neither is true. The market is the external world and the engine's reading is
// a response to it, so what they need is ADJACENCY and a direction of travel —
// which is a rhythm decision, not a container decision.
//
// So the arc has no border and no background. It has a hero glow behind it (the
// product's one ambient light, kept because calm-but-alive is the character
// this surface is meant to carry) and a hairline rule beneath it marking where
// the market ends and the engine's reading begins.
//
// ─── Cadence ─────────────────────────────────────────────────────────────────
// This is the FAST tier — /api/stats and /api/price-history at 2s. It leads the
// page and it is the one region licensed to move: the price flashes on change
// and MarketChart's tip is dead-reckoned between confirmed observations. Both
// remain gated exactly as before, by data liveness and by reduced motion.
// Nothing below this arc animates.

import dynamic from 'next/dynamic'
import { useApplicationStore } from '@/store/applicationStore'
import { useEnginePriceChart } from '@/config/hooks/useServices'
import { useMarketSeries } from '@/config/hooks/useMarketSeries'
import { useSystemStatus } from '@/config/hooks/useSystemStatus'
import { formatBtcPrice, formatPriceChangePct } from '@/lib/mappers/priceHistory'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'

// Client-only: lightweight-charts is canvas, so it never renders during SSR.
const MarketChart = dynamic(() => import('@/components/shared/MarketChart').then((m) => m.MarketChart), {
  ssr: false,
  loading: () => <div className="skeleton rounded w-full" style={{ height: CHART_H }} />,
})

// Taller than the hero's 184px. Freed by removing the surrounding card's
// padding and border, and by the engine reading moving out from beside it —
// the chart now has the page's full width rather than 57% of a split panel.
const CHART_H = 208

export function MarketArc() {
  const chart  = useEnginePriceChart()
  const series = useMarketSeries()
  const status = useSystemStatus()
  const stats  = useApplicationStore((s) => s.engine.stats)

  const isUp = chart.data ? chart.data.priceChange >= 0 : true

  // ─── The feed's own claim about itself ─────────────────────────────────────
  // This is the ONE status assertion in the arc, and it is deliberately not a
  // badge. Under synthetic or unreachable data it is the loud carrier — the
  // certainty scale explicitly does not cover those two states, because a
  // reader must never have to notice a contrast step to learn that a price was
  // fabricated. Under a healthy live feed it reads as a quiet label.
  const feedLabel =
    status.dataIsSynthetic ? 'Generated feed — no engine produced these prices'
    : !status.dataIsLive   ? 'No feed'
    : 'Engine price feed'

  const feedIsWarning = status.dataIsSynthetic || !status.dataIsLive

  return (
    <section aria-labelledby="arc-market" className="relative hero-glow pb-5">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
        <div className="flex flex-col gap-1 min-w-0">
          {/* A real heading, not a styled span. The three arcs are the page's
              primary structure and were reachable only as landmarks — a screen
              reader's heading navigation skipped straight from the page title
              to "Markets". It carries the feed's own claim about itself, which
              is the one status assertion in this arc and, under synthetic or
              unreachable data, its loud warning carrier. */}
          <h2
            id="arc-market"
            className="t-label"
            style={feedIsWarning ? { color: 'var(--probex-warning)' } : undefined}
          >
            BTC / USD · {feedLabel}
          </h2>

          {chart.data ? (
            <div className="flex items-baseline gap-3 flex-wrap min-w-0">
              {/* The page's single display figure. A second one anywhere on
                  Overview would not add emphasis, it would remove it.
                  Certainty comes from the price slice itself: when the feed
                  stops refreshing, the NUMBER is marked retained rather than
                  left at full confidence with only the page line changing. */}
              <Figure
                size="display"
                flashOn={chart.data.currentPrice}
                delta={{
                  text: formatPriceChangePct(chart.data.priceChangePct),
                  positive: isUp,
                }}
                {...certaintyFromSlice(chart, 2_000)}
              >
                {formatBtcPrice(chart.data.currentPrice)}
              </Figure>
            </div>
          ) : chart.status === 'error' ? (
            // The feed did not answer. A skeleton here would promise a number
            // that is not coming — in offline mode it shimmered indefinitely.
            // Absence is drawn at the figure's own size, with the reason.
            <Figure
              size="display"
              certainty="absent"
              absentReason={chart.error?.message ?? 'The price feed did not answer'}
            />
          ) : (
            <div className="skeleton h-12 w-64 rounded" />
          )}
        </div>

        {chart.data && (
          <span className="t-metadata whitespace-nowrap">
            H {formatBtcPrice(chart.data.highPrice)} · L {formatBtcPrice(chart.data.lowPrice)}
          </span>
        )}
      </div>

      {/* Full-bleed. The chart carries its own state, provenance and accessible
          summary through ChartFrame — which is why removing the card around it
          costs nothing: the truth machinery was never in the card. */}
      {series.hasData ? (
        <MarketChart points={series.points} up={isUp} height={CHART_H} />
      ) : chart.status === 'error' ? (
        // Same rule as the figure: no shimmer for a chart that will not
        // arrive. The band keeps its height so the arc does not collapse and
        // the sections beneath do not jump when the feed returns.
        <div
          className="flex items-center justify-center rounded w-full"
          style={{ height: CHART_H, border: '1px dashed var(--probex-border)' }}
          role="img"
          aria-label="Price chart unavailable — the price feed did not answer"
        >
          <span className="t-helper">No price history — the feed did not answer. Nothing is drawn in its place.</span>
        </div>
      ) : (
        <div className="skeleton rounded w-full" style={{ height: CHART_H }} />
      )}

      {/* The rule that separates the world from the engine's reading of it. */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ borderBottom: '1px solid var(--probex-border)' }}
        aria-hidden="true"
      />

      {/* Kept off-screen rather than deleted: /api/stats is what the price
          figure above actually resolves from when price-history is behind, and
          a reader using assistive tech should be able to reach that fact. */}
      <span className="sr-only">
        Price sourced from /api/price-history, with /api/stats as fallback.
        {stats.status === 'error' ? ' The stats endpoint is not currently answering.' : ''}
      </span>
    </section>
  )
}
