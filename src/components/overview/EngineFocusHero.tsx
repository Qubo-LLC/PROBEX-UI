'use client'

// EngineFocusHero — the Overview centerpiece. Two coexisting modes, stated
// side by side and both fully visible at all times:
//
//   LEFT  — the live BTC market: the trader's domain. Big price + the engine's
//           rolling price buffer as an area chart.
//   RIGHT — Engine Focus: what the engine currently sees and why it does or
//           does not care.
//
// ─── The carousel is gone ────────────────────────────────────────────────────
// The right half used to auto-rotate three slides on a 7-second timer: edge,
// posture, record. It existed because posture and record had nowhere else to
// live — the page below was three near-empty cards, so the hero absorbed the
// content. That inverted the job of a cockpit: an operator glancing at the
// screen got whichever third of the engine's state the timer happened to be
// showing, and had to wait up to fourteen seconds to see a specific figure.
// Motion also read as marketing on a surface whose whole claim is precision.
//
// Posture now lives in the Capital panel and record in the Execution panel
// (EngineStateBand), both permanently visible. That frees this half to answer
// one question completely instead of three questions intermittently: what edge
// does the engine see, and what is it doing about it.
//
// Every value comes from a confirmed endpoint (/price-history, /edges,
// /survival). Manual trading is acknowledged as a mode but honestly marked
// "soon": no order endpoint exists in the frozen backend contract.

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useApplicationStore } from '@/store/applicationStore'
import { useEnginePriceChart } from '@/config/hooks/useServices'
import { useMarketSeries } from '@/config/hooks/useMarketSeries'
import { useSystemStatus } from '@/config/hooks/useSystemStatus'
import { parseEdgeRows, type EdgeRow } from '@/lib/mappers/edges'
import { formatBtcPrice, formatPriceChangePct } from '@/lib/mappers/priceHistory'
import { formatPercent } from '@/lib/utils'
import { formatEdgePct } from '@/lib/display/engine'
import { RadialGauge } from '@/components/shared/RadialGauge'
import { ValueFlash } from '@/components/shared/ValueFlash'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'

// Institutional BTC chart — client-only (lightweight-charts is canvas), so it
// is never rendered during SSR.
const MarketChart = dynamic(() => import('@/components/shared/MarketChart').then((m) => m.MarketChart), {
  ssr: false,
  loading: () => <div className="skeleton rounded w-full" style={{ height: CHART_H }} />,
})

// Raised from 140px. The chart is the page's one genuine visualisation and the
// hero had the height to spare once the rotating panel stopped needing a fixed
// 160px minimum for its tallest slide.
const CHART_H = 184

export function EngineFocusHero() {
  const chart = useEnginePriceChart()
  const series = useMarketSeries()
  const status = useSystemStatus()
  const edgesSlice = useApplicationStore((s) => s.engine.edges)
  const survival = useApplicationStore((s) => s.engine.survival)
  const stats = useApplicationStore((s) => s.engine.stats)

  const edges = useMemo<EdgeRow[]>(() => {
    if (!edgesSlice.data) return []
    const parsed = parseEdgeRows(edgesSlice.data)
    return parsed.kind === 'rows' ? [...parsed.rows].sort((a, b) => b.edgePct - a.edgePct) : []
  }, [edgesSlice.data])

  const topEdge = edges[0] ?? null
  const edgeCount = edgesSlice.data?.count ?? null
  const minEdge = survival.data?.minEdgeThreshold ?? null
  const edgesDetected = stats.data?.edgesDetected ?? null

  const isUp = chart.data ? chart.data.priceChange >= 0 : true
  const accent = isUp ? 'var(--probex-positive)' : 'var(--probex-negative)'

  return (
    <section
      aria-label="Market and engine focus"
      // hero-glow: ambient two-hue interior light, inset top edge highlight and
      // a soft theme-tinted outer light — the page's one dominant surface.
      className="relative rounded-lg overflow-hidden card-elevated hero-glow"
    >
      <div className="relative grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">

        {/* ── LEFT · Live BTC Market (the trader's domain) ────────────────── */}
        <div className="flex flex-col gap-3 p-5 lg:border-r" style={{ borderColor: 'var(--probex-border)' }}>
          <div className="flex items-center justify-between gap-3">
            {/* The market label states its own provenance. In synthetic mode
                this previously read "LIVE MARKET" above generated prices. */}
            <span className="t-label">
              BTC / USD · {
                status.dataIsSynthetic ? 'Generated feed'
                : !status.dataIsLive ? 'No feed'
                : 'Live market'
              }
            </span>
            <span className="flex items-center gap-2">
              <ProvenanceBadge provenance="live" detail="/api/price-history" />
              <span
                className="text-2xs font-bold uppercase tracking-wider rounded px-1.5 py-0.5 select-none hidden sm:inline"
                style={{ color: 'var(--probex-text-disabled)', border: '1px solid var(--probex-border)' }}
                title="Manual trading — available in a future release"
              >
                Manual · Soon
              </span>
            </span>
          </div>

          {chart.data ? (
            <>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span
                  className="text-[2.75rem] font-bold font-mono tabular-nums leading-none"
                  style={{ color: 'var(--probex-text-primary)', letterSpacing: '-0.03em' }}
                >
                  <ValueFlash value={chart.data.currentPrice}>{formatBtcPrice(chart.data.currentPrice)}</ValueFlash>
                </span>
                <span className="text-base font-semibold font-mono tabular-nums" style={{ color: accent }}>
                  {formatPriceChangePct(chart.data.priceChangePct)}
                </span>
                <span className="t-metadata ml-auto">
                  H {formatBtcPrice(chart.data.highPrice)} · L {formatBtcPrice(chart.data.lowPrice)}
                </span>
              </div>

              {/* No fixed-height wrapper: MarketChart is framed by ChartFrame
                  now, and the frame appends a "last confirmed Ns ago" strip
                  beneath the plot when the feed goes quiet. Pinning the height
                  here would clip that line off — the one case where the chart
                  has something extra to say. The plot itself is still exactly
                  CHART_H tall, so nothing moves while the feed is healthy. */}
              {series.hasData ? (
                <MarketChart points={series.points} up={isUp} height={CHART_H} />
              ) : (
                <div className="skeleton rounded w-full" style={{ height: CHART_H }} />
              )}
            </>
          ) : (
            <BtcSkeleton />
          )}
        </div>

        {/* ── RIGHT · Engine Focus (what the engine sees) ─────────────────── */}
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-2">
            {/* The dot that used to sit here was a second live claim about the
                same source as the badge on the other end of this row — two
                assertions three elements apart, one of them animated. The badge
                is the product's lineage authority, so it keeps the claim and
                the section label is just a label. */}
            <span
              className="text-2xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--probex-primary)' }}
            >
              Engine Focus
            </span>
            <ProvenanceBadge provenance="live" detail="/api/edges" />
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {/* Three states, not two. "Holding" is a DECISION the engine made,
                so it may only be shown when the engine actually answered — the
                edges endpoint having returned is what licenses that claim.
                Rendering it whenever `topEdge` was falsy meant an unreachable
                engine was reported as deliberately standing aside, which
                invents intelligence out of a network failure. */}
            {topEdge ? (
              <EdgeFound edge={topEdge} />
            ) : edgesSlice.data !== null ? (
              <EdgeHolding minEdge={minEdge} />
            ) : (
              <EdgeUnknown errored={edgesSlice.status === 'error'} />
            )}
          </div>

          {/* The signal ledger. Always present, so "no edge" is quantified
              rather than merely asserted — the difference between an engine
              that is idle and one that is actively rejecting candidates. */}
          <dl
            className="grid grid-cols-3 gap-2 pt-3 m-0"
            style={{ borderTop: '1px solid var(--probex-border)' }}
          >
            <SignalStat label="Under review" value={edgeCount !== null ? `${edgeCount}` : '—'} />
            <SignalStat label="Detected" value={edgesDetected !== null ? `${edgesDetected}` : '—'} />
            <SignalStat label="Threshold" value={minEdge !== null ? formatEdgePct(minEdge) : '—'} />
          </dl>
        </div>
      </div>
    </section>
  )
}

// ─── Engine Focus states ──────────────────────────────────────────────────────

function EdgeFound({ edge }: { edge: EdgeRow }) {
  const color = edge.direction.toLowerCase() === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)'
  return (
    <div className="flex items-center gap-4">
      <RadialGauge
        value={Math.min(1, edge.edgePct / 100)}
        color={color}
        size={84}
        strokeWidth={7}
        ariaLabel={`Edge strength ${edge.edgePct.toFixed(1)} percent`}
      >
        <span className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>
          {edge.edgePct.toFixed(1)}%
        </span>
        <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
          edge
        </span>
      </RadialGauge>

      <div className="flex flex-col gap-1.5 min-w-0">
        {edge.marketTitle && (
          <span
            className="text-sm font-semibold leading-tight"
            style={{
              color: 'var(--probex-text-primary)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {edge.marketTitle}
          </span>
        )}
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
          {edge.direction}
        </span>
        <div className="flex gap-3 text-2xs font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
          {edge.confidence !== null && <span>{formatPercent(edge.confidence)} conf</span>}
          {edge.kellySize !== null && <span>{(edge.kellySize * 100).toFixed(0)}% Kelly</span>}
        </div>
      </div>
    </div>
  )
}

/**
 * The common state, and the one the old hero handled worst: 593×200px of panel
 * for a single sentence. Holding is a *decision*, so it is presented as one —
 * with the threshold that produced it.
 */
function EdgeHolding({ minEdge }: { minEdge: number | null }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <span
          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
          style={{
            border: '1px solid var(--probex-border-default)',
            background: 'var(--probex-surface)',
            color: 'var(--probex-text-muted)',
          }}
          aria-hidden="true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold" style={{ color: 'var(--probex-text-primary)' }}>
            Holding
          </span>
          <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            No candidate has cleared the edge threshold
          </span>
        </div>
      </div>
      <p className="t-description">
        {minEdge !== null
          ? `The engine acts only above ${formatEdgePct(minEdge)} edge. It prefers no trade to a weak one.`
          : 'The engine prefers no trade to a weak one.'}
      </p>
    </div>
  )
}

/**
 * The engine has not told us what it sees. Distinct from Holding, which is a
 * position the engine took; this is the absence of a report.
 */
function EdgeUnknown({ errored }: { errored: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <span
          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
          style={{
            border: '1px dashed var(--probex-border-default)',
            color: 'var(--probex-text-disabled)',
          }}
          aria-hidden="true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 17h.01" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
          </svg>
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold" style={{ color: 'var(--probex-text-secondary)' }}>
            No signal report
          </span>
          <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            {errored ? 'The engine did not answer' : 'Waiting for the engine'}
          </span>
        </div>
      </div>
      <p className="t-description">
        Whether the engine sees an edge right now is unknown — this panel shows
        nothing rather than assuming it is idle.
      </p>
    </div>
  )
}

// ─── Small building blocks ────────────────────────────────────────────────────

function SignalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="text-2xs font-bold uppercase tracking-wider truncate" style={{ color: 'var(--probex-text-muted)' }}>
        {label}
      </dt>
      <dd className="text-sm font-bold font-mono tabular-nums m-0" style={{ color: 'var(--probex-text-primary)' }}>
        {value}
      </dd>
    </div>
  )
}

function BtcSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="skeleton h-11 w-56 rounded" />
      <div className="skeleton rounded" style={{ height: CHART_H }} />
    </div>
  )
}
