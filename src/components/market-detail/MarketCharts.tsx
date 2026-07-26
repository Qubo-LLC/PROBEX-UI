'use client'

// MarketCharts — per-market price and volume history from
// /api/markets/:market_id/history.
//
// This was an AwaitingBackend placeholder ("MD-1") because the endpoint used to
// 5xx. It was fixed backend-side and promoted to 'confirmed' in Phase 1, which
// silently turned the placeholder into `return null` — the section rendered
// nothing at all. This replaces it with the real charts.
//
// Fetched per-market on mount rather than through the polled store: the payload
// is market-scoped and only relevant while this page is open, so a global poll
// would fetch data no one is looking at. Refetches when marketId changes.
//
// Three series come out of one response: YES probability (cents), BTC spot
// against the market's resolution baseline, and traded volume.

import { useEffect, useState } from 'react'
import { services } from '@/lib/services'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import type { MarketPriceHistory } from '@/types/engine'

/** Backend caps at 1000; 200 snapshots is well beyond one 5-minute market. */
const SNAPSHOT_LIMIT = 200

const hhmm = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export function MarketCharts({ marketId }: { marketId: string }) {
  const [data, setData]       = useState<MarketPriceHistory | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    services.engine
      .getMarketPriceHistory(marketId, SNAPSHOT_LIMIT)
      .then((r) => { if (active) setData(r.data) })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Request failed') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [marketId])

  const history = data?.history ?? []

  if (loading) {
    return (
      <Section>
        <p className="text-xs py-6" style={{ color: 'var(--probex-text-disabled)' }}>
          Loading market history…
        </p>
      </Section>
    )
  }

  if (error) {
    return (
      <Section>
        <ErrorState title="Market history unavailable" description={error} fullPage={false} />
      </Section>
    )
  }

  if (history.length === 0) {
    return (
      <Section>
        <EmptyState
          size="sm"
          title="No snapshots recorded"
          description="The engine hasn't captured price snapshots for this market yet. Charts appear as soon as it does."
        />
      </Section>
    )
  }

  const yesSeries: LiveChartPoint[]    = history.map((p) => ({ tick: hhmm(p.ts), value: p.yesPrice }))
  const btcSeries: LiveChartPoint[]    = history.map((p) => ({ tick: hhmm(p.ts), value: p.btcPrice }))
  const volumeSeries: LiveChartPoint[] = history.map((p) => ({ tick: hhmm(p.ts), value: p.volume }))

  // Every snapshot carries the same baseline (the market's resolution
  // reference), so reading it off the first point is safe.
  const baseline = history[0]?.baselinePrice ?? null
  const lastBtc  = history[history.length - 1]?.btcPrice ?? null
  const above    = baseline !== null && lastBtc !== null ? lastBtc >= baseline : null

  return (
    <Section>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>
            Price &amp; Volume History
          </h3>
          <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
            {history.length} snapshot{history.length === 1 ? '' : 's'} · /api/markets/:id/history
          </span>
        </div>

        {baseline !== null && (
          <p className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            Resolution baseline{' '}
            <span className="tabular-nums font-semibold" style={{ color: 'var(--probex-text-secondary)' }}>
              ${baseline.toLocaleString()}
            </span>
            {above !== null && (
              <>
                {' · BTC currently '}
                <span className="font-semibold" style={{ color: above ? 'var(--probex-yes)' : 'var(--probex-no)' }}>
                  {above ? 'above' : 'below'}
                </span>
              </>
            )}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <LiveChart
            title="YES Probability"
            source="/api/markets/:id/history"
            data={yesSeries}
            variant="area"
            height={180}
            bare
            color="var(--probex-yes)"
            yTickFormatter={(v) => `${v.toFixed(0)}¢`}
            valueFormatter={(v) => `${v.toFixed(1)}¢`}
          />
          <LiveChart
            title="BTC Price"
            source="/api/markets/:id/history"
            data={btcSeries}
            variant="line"
            height={180}
            bare
            color="var(--probex-primary)"
            // BTC moves only tens of dollars inside a 5-minute market; a
            // zero-based axis would render that as a flat line.
            yDomain={['dataMin', 'dataMax']}
            yTickFormatter={(v) => `$${v.toFixed(0)}`}
            valueFormatter={(v) => `$${v.toLocaleString()}`}
          />
          <LiveChart
            title="Volume"
            source="/api/markets/:id/history"
            data={volumeSeries}
            variant="area"
            height={160}
            bare
            color="var(--probex-text-muted)"
            yTickFormatter={(v) => formatCurrency(v, true)}
            valueFormatter={(v) => formatCurrency(v)}
          />
        </div>
      </div>
    </Section>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--probex-border)' }}>
      {children}
    </div>
  )
}
