'use client'

// Live BTC price card — big current price, signed change over the sample
// window, and a sparkline of the engine's rolling price buffer.
//
// Truthfulness: the /api/price-history buffer spans well under a minute
// (~50 samples). The window label is COMPUTED from the actual point
// timestamps rather than claiming any fixed timeframe.

import { useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { formatBtcPrice, formatPriceChangePct, type BtcPriceChartViewModel } from '@/lib/mappers/priceHistory'
import { Card } from '@/components/ui/Card'

interface PriceCardProps {
  chart: BtcPriceChartViewModel
  /** From /api/stats — shown when available so feed quality is visible next to price. */
  feed: { connected: boolean; latencyMs: number } | null
}

export function PriceCard({ chart, feed }: PriceCardProps) {
  const isUp    = chart.priceChange >= 0
  const accent  = isUp ? 'var(--probex-positive)' : 'var(--probex-negative)'

  const windowLabel = useMemo(() => {
    const first = chart.points.at(0)?.ts
    const last  = chart.points.at(-1)?.ts
    if (first === undefined || last === undefined || last <= first) return null
    const spanSec = Math.max(1, Math.round((last - first) / 1_000))
    const span    = spanSec >= 60 ? `${Math.round(spanSec / 60)}m` : `${spanSec}s`
    return `${chart.sampleCount} samples · ${span} window`
  }, [chart])

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
            BTC / USD
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-bold leading-none tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>
              {formatBtcPrice(chart.currentPrice)}
            </span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: accent }}>
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

      <div style={{ height: 120 }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart.points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="price-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={accent} stopOpacity={0.25} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={['dataMin', 'dataMax']} hide />
            <Area
              type="monotone"
              dataKey="price"
              stroke={accent}
              strokeWidth={1.5}
              fill="url(#price-fill)"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {windowLabel && (
        <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
          {windowLabel} — engine rolling buffer
        </p>
      )}
    </Card>
  )
}
