'use client'

// Live BTC price card — big current price, signed change over the sample
// window, and the SHARED live curve (MarketChart) — the same chart component
// and animation loop used by the Overview hero, so every BTC chart in the app
// behaves identically.
//
// Truthfulness: the /api/price-history buffer spans well under a minute
// (~50 samples). The window label is COMPUTED from the actual point
// timestamps rather than claiming any fixed timeframe.

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { formatBtcPrice, formatPriceChangePct, type BtcPriceChartViewModel } from '@/lib/mappers/priceHistory'
import { useMarketSeries } from '@/config/hooks/useMarketSeries'
import { Card } from '@/components/ui/Card'
import { ValueFlash } from './ValueFlash'

// Client-only (lightweight-charts is canvas) — never rendered during SSR.
const MarketChart = dynamic(() => import('./MarketChart').then((m) => m.MarketChart), {
  ssr: false,
  loading: () => <div className="skeleton rounded w-full h-full" />,
})

interface PriceCardProps {
  chart: BtcPriceChartViewModel
  /** From /api/stats — shown when available so feed quality is visible next to price. */
  feed: { connected: boolean; latencyMs: number } | null
  /** 'hero' bumps the price to the page's focal-metric scale (Overview's
   *  "one hero number per page" — Phase 6A). Everywhere else keeps the
   *  original density unchanged. */
  size?: 'default' | 'hero'
}

export function PriceCard({ chart, feed, size = 'default' }: PriceCardProps) {
  const isUp    = chart.priceChange >= 0
  const accent  = isUp ? 'var(--probex-positive)' : 'var(--probex-negative)'
  const isHero  = size === 'hero'
  const series  = useMarketSeries()

  const windowLabel = useMemo(() => {
    const first = chart.points.at(0)?.ts
    const last  = chart.points.at(-1)?.ts
    if (first === undefined || last === undefined || last <= first) return null
    const spanSec = Math.max(1, Math.round((last - first) / 1_000))
    const span    = spanSec >= 60 ? `${Math.round(spanSec / 60)}m` : `${spanSec}s`
    return `${chart.sampleCount} samples · ${span} window`
  }, [chart])

  // Live-update pulse: one-shot subtle light ring when the confirmed price ticks.
  const [pulseN, setPulseN] = useState(0)
  const prevPrice = useRef(chart.currentPrice)
  useEffect(() => {
    if (prevPrice.current !== chart.currentPrice) setPulseN((n) => n + 1)
    prevPrice.current = chart.currentPrice
  }, [chart.currentPrice])

  return (
    <Card variant={isHero ? 'elevated' : 'default'} className="relative flex flex-col gap-3 card-glow-live">
      {pulseN > 0 && <span key={pulseN} className="pulse-ring" aria-hidden="true" />}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <span className="t-label">
            BTC / USD
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className={`${isHero ? 'text-5xl' : 'text-3xl'} font-bold leading-none tabular-nums`} style={{ color: 'var(--probex-text-primary)' }}>
              {isHero ? <ValueFlash value={chart.currentPrice}>{formatBtcPrice(chart.currentPrice)}</ValueFlash> : formatBtcPrice(chart.currentPrice)}
            </span>
            <span className={`${isHero ? 'text-base' : 'text-sm'} font-semibold tabular-nums`} style={{ color: accent }}>
              {formatPriceChangePct(chart.priceChangePct)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
          <span>H {formatBtcPrice(chart.highPrice)} · L {formatBtcPrice(chart.lowPrice)}</span>
          {feed && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: feed.connected ? 'var(--probex-positive)' : 'var(--probex-negative)' }}
                aria-hidden="true"
              />
              {feed.connected ? `Feed ${Math.round(feed.latencyMs)}ms` : 'Feed disconnected'}
            </span>
          )}
        </div>
      </div>

      <div style={{ height: isHero ? 180 : 120 }}>
        {series.hasData ? (
          <MarketChart points={series.points} up={isUp} height={isHero ? 180 : 120} />
        ) : (
          <div className="skeleton rounded w-full h-full" />
        )}
      </div>

      {windowLabel && (
        <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
          {windowLabel} — engine rolling buffer
        </p>
      )}
    </Card>
  )
}
