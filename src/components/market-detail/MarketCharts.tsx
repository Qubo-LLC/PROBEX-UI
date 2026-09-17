'use client'

// MarketCharts — the market's recorded snapshots, drawn.
//
// Presentational: the page owns the fetch (useMarketHistory) because the same
// snapshots also name an expired market and describe its path. This draws
// what it is given and states how much that is — the engine records one
// snapshot per scan cycle, so a market that lived fifteen minutes typically
// has two or three points, and a chart of two points is a line between two
// facts, not a curve. Below two points there is nothing to draw and the
// single snapshot is shown as the facts it carries.
//
// ─── What is NOT said here any more ──────────────────────────────────────────
// The previous version read `baseline_price` off the first snapshot as "the
// resolution baseline" and compared the last BTC price to it. On the live
// history baseline_price equals btc_price on every snapshot (it follows the
// feed), so that comparison was the price against itself a few minutes earlier.
// The BTC path is now reported as a path. See lib/display/marketDetail.ts.

import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import { ErrorState } from '@/components/ui/ErrorState'
import { formatCurrency } from '@/lib/utils'
import { formatBtcPrice } from '@/lib/mappers/priceHistory'
import { historyTrajectory } from '@/lib/display/marketDetail'
import type { MarketHistoryState } from '@/config/hooks/useMarketHistory'
import type { MarketHistoryPoint } from '@/types/engine'

const hhmm = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const stamp = (ts: number) =>
  new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function MarketCharts({ history }: { history: MarketHistoryState }) {
  return (
    <section aria-labelledby="md-history" className="flex flex-col gap-3 pt-6" style={{ borderTop: '1px solid var(--probex-border)' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-baseline gap-2 flex-wrap">
          <h2 id="md-history" className="t-section-title">Recorded history</h2>
          <span className="t-description">one snapshot per engine scan, oldest first</span>
        </span>
        <span className="t-metadata">
          /api/markets/:id/history
          {history.status === 'ready' && ` · ${history.data.history.length} snapshot${history.data.history.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {history.status === 'loading' ? (
        <p className="t-description">Loading the recorded snapshots.</p>
      ) : history.status === 'expired' ? (
        <p className="t-description">The engine holds no snapshots for this id — it has aged out of the history store.</p>
      ) : history.status === 'error' ? (
        <ErrorState title="Recorded history did not answer" description={history.message} fullPage={false} />
      ) : history.data.history.length === 0 ? (
        <p className="t-description">The engine recorded no snapshots for this market.</p>
      ) : history.data.history.length === 1 ? (
        <SingleSnapshot point={history.data.history[0]!} />
      ) : (
        <Charts points={history.data.history} />
      )}
    </section>
  )
}

/** One point cannot be a chart. The facts it carries, as facts. */
function SingleSnapshot({ point }: { point: MarketHistoryPoint }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="t-helper">Only one snapshot was recorded, at {stamp(point.ts)} — nothing to draw a path from.</p>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 m-0">
        <Fact label="YES price" value={`${point.yesPrice.toFixed(1)}¢`} />
        <Fact label="NO price" value={`${point.noPrice.toFixed(1)}¢`} />
        <Fact label="BTC at snapshot" value={formatBtcPrice(point.btcPrice)} />
        <Fact label="Volume" value={formatCurrency(point.volume)} />
      </dl>
    </div>
  )
}

function Charts({ points }: { points: readonly MarketHistoryPoint[] }) {
  const path = historyTrajectory(points)
  const yesSeries: LiveChartPoint[]    = points.map((p) => ({ tick: hhmm(p.ts), value: p.yesPrice }))
  const btcSeries: LiveChartPoint[]    = points.map((p) => ({ tick: hhmm(p.ts), value: p.btcPrice }))
  const volumeSeries: LiveChartPoint[] = points.map((p) => ({ tick: hhmm(p.ts), value: p.volume }))

  return (
    <div className="flex flex-col gap-3">
      {/* The path, in words, before the pictures: two or three points read
          better as "6.5¢ → 0.1¢" than as a slope. Every number is a wire
          value from the first and last snapshot. */}
      {path !== null && (
        <p className="t-helper flex items-baseline gap-x-4 gap-y-1 flex-wrap">
          <span>
            YES <Mono>{path.from.yesPrice.toFixed(1)}¢</Mono> → <Mono>{path.to.yesPrice.toFixed(1)}¢</Mono>
          </span>
          <span>
            BTC <Mono>{formatBtcPrice(path.from.btcPrice)}</Mono> → <Mono>{formatBtcPrice(path.to.btcPrice)}</Mono>
            {path.btcMove !== null && (
              <span className="ml-1 font-mono tabular-nums" style={{ color: path.btcMove >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)' }}>
                {path.btcMove >= 0 ? '+' : ''}{(path.btcMove * 100).toFixed(2)}%
              </span>
            )}
          </span>
          <span className="t-metadata">{stamp(path.from.ts)} → {stamp(path.to.ts)}</span>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <LiveChart
          title="YES price"
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
          title="BTC at snapshot"
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
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>{children}</span>
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="t-label truncate">{label}</dt>
      <dd className="m-0 font-mono text-xs font-semibold tabular-nums truncate" style={{ color: 'var(--probex-text-primary)' }}>{value}</dd>
    </div>
  )
}
