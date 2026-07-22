'use client'

// EngineFocusHero — the Overview centerpiece (Product Experience Restoration,
// Phase A + B). Replaces the static LiveBtcHero with a hybrid hero that expresses
// Probex's two coexisting modes:
//
//   LEFT  — the live BTC market: the trader's domain. Big price + honest area
//           chart of the engine's rolling price buffer.
//   RIGHT — Engine Focus: the AI's domain. An auto-rotating panel cycling the
//           engine's current REAL state (strongest edge → posture → record).
//
// Every value comes from a confirmed endpoint (/price-history, /edges,
// /survival, /execution/status) — the mock's rotating-hero *soul* restored on
// real data, never its fabricated markets/consensus/recommendations. Manual
// trading is acknowledged as a mode but honestly marked "soon": no order
// endpoint exists in the frozen backend contract, so nothing pretends to trade.

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { useApplicationStore } from '@/store/applicationStore'
import { useCommandCenter, useEnginePriceChart } from '@/config/hooks/useServices'
import { useMarketSeries } from '@/config/hooks/useMarketSeries'
import { parseEdgeRows, type EdgeRow } from '@/lib/mappers/edges'
import { formatBtcPrice, formatPriceChangePct } from '@/lib/mappers/priceHistory'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { survivalStateColor, survivalStateLabel } from '@/lib/display/engine'
import type { CommandCenterVM } from '@/lib/mappers/overview'
import { RadialGauge } from '@/components/shared/RadialGauge'
import { ValueFlash } from '@/components/shared/ValueFlash'

// Institutional BTC chart — client-only (lightweight-charts is canvas), so it
// is never rendered during SSR.
const MarketChart = dynamic(() => import('@/components/shared/MarketChart').then((m) => m.MarketChart), {
  ssr: false,
  loading: () => <div className="skeleton rounded w-full" style={{ height: 140 }} />,
})

const ROTATE_MS = 7000

// ─── Main ─────────────────────────────────────────────────────────────────────

export function EngineFocusHero() {
  const vm         = useCommandCenter()
  const chart      = useEnginePriceChart()
  const series     = useMarketSeries()
  const edgesSlice = useApplicationStore((s) => s.engine.edges)

  const topEdge = useMemo<EdgeRow | null>(() => {
    if (!edgesSlice.data) return null
    const parsed = parseEdgeRows(edgesSlice.data)
    if (parsed.kind !== 'rows' || parsed.rows.length === 0) return null
    return [...parsed.rows].sort((a, b) => b.edgePct - a.edgePct)[0] ?? null
  }, [edgesSlice.data])

  // Rotating Engine Focus slides, built only from real data that has resolved.
  // The edge slide is always present (it states "holding" when no edge cleared),
  // so the hero always has something to say.
  const slides = useMemo(() => {
    const list: Array<{ key: string; node: ReactNode }> = [
      { key: 'edge', node: <EdgeSlide edge={topEdge} activeEdges={vm.activeEdges} /> },
    ]
    if (vm.capital) list.push({ key: 'posture', node: <PostureSlide capital={vm.capital} /> })
    if (vm.trading) list.push({ key: 'record',  node: <RecordSlide trading={vm.trading} /> })
    return list
  }, [topEdge, vm.activeEdges, vm.capital, vm.trading])

  const [current, setCurrent] = useState(0)
  const [paused, setPaused]   = useState(false)

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const id = setInterval(() => setCurrent((c) => (c + 1) % slides.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [paused, slides.length])

  useEffect(() => { if (current >= slides.length) setCurrent(0) }, [current, slides.length])

  const go = useCallback((i: number) => {
    setCurrent(i)
    setPaused(true)
    setTimeout(() => setPaused(false), 12_000)
  }, [])

  const isUp   = chart.data ? chart.data.priceChange >= 0 : true
  const accent = isUp ? 'var(--probex-positive)' : 'var(--probex-negative)'
  const active = slides[current] ?? slides[0]

  return (
    <section
      aria-label="Engine focus"
      // hero-glow: ambient two-hue interior light (slow breathing), inset top
      // edge highlight, and a soft theme-tinted outer light — the page's one
      // dominant surface (visual hierarchy: the hero draws the eye; everything
      // below stays quieter).
      className="relative rounded-md overflow-hidden card-elevated hero-glow"
      style={{ minHeight: 300 }}
    >

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── LEFT · Live BTC Market (the trader's domain) ────────────────── */}
        <div className="flex flex-col gap-3 p-6 lg:border-r" style={{ borderColor: 'var(--probex-border)' }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
              BTC / USD · Live Market
            </span>
            {/* Honest manual-trading acknowledgement — no order endpoint exists yet. */}
            <span
              className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 select-none"
              style={{ color: 'var(--probex-text-muted)', border: '1px solid var(--probex-border)' }}
              title="Manual trading — available in a future release"
            >
              Manual · Soon
            </span>
          </div>

          {chart.data ? (
            <>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-5xl font-bold font-mono tabular-nums leading-none" style={{ color: 'var(--probex-text-primary)' }}>
                  <ValueFlash value={chart.data.currentPrice}>{formatBtcPrice(chart.data.currentPrice)}</ValueFlash>
                </span>
                <span className="text-base font-semibold font-mono tabular-nums" style={{ color: accent }}>
                  {formatPriceChangePct(chart.data.priceChangePct)}
                </span>
              </div>

              <div style={{ height: 140 }}>
                {series.hasData ? (
                  <MarketChart points={series.points} up={isUp} height={140} />
                ) : (
                  <div className="skeleton rounded w-full h-full" />
                )}
              </div>

              <div className="flex items-center gap-4 text-xs font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                <span>H {formatBtcPrice(chart.data.highPrice)}</span>
                <span>L {formatBtcPrice(chart.data.lowPrice)}</span>
                {vm.vitals && (
                  <span className="flex items-center gap-1.5 ml-auto">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: vm.vitals.feedConnected ? 'var(--probex-positive)' : 'var(--probex-negative)' }} aria-hidden="true" />
                    {vm.vitals.feedConnected ? `Feed ${Math.round(vm.vitals.feedLatencyMs)}ms` : 'Feed down'}
                  </span>
                )}
              </div>
            </>
          ) : (
            <BtcSkeleton />
          )}
        </div>

        {/* ── RIGHT · Engine Focus (the AI's domain, rotating) ────────────── */}
        <div
          className="flex flex-col gap-3 p-6"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-primary)' }}>
              <span className="live-dot w-1.5 h-1.5" style={{ background: 'var(--probex-primary)' }} aria-hidden="true" />
              Engine Focus
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
              style={{ color: 'var(--probex-primary)', background: 'var(--probex-primary-dim)', border: '1px solid var(--probex-yes-border)' }}
            >
              Autonomous AI
            </span>
          </div>

          <div className="relative flex-1 min-h-[160px]">
            <div key={active?.key} className="absolute inset-0 animate-fade-in">
              {active?.node}
            </div>
          </div>

          {slides.length > 1 && (
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5" role="tablist" aria-label="Engine focus">
                {slides.map((s, i) => (
                  <button
                    key={s.key}
                    type="button"
                    role="tab"
                    aria-selected={i === current}
                    aria-label={`Focus ${i + 1}`}
                    onClick={() => go(i)}
                    className="h-1.5 rounded-full transition-[width,background] duration-200 cursor-pointer p-0 border-0"
                    style={{ width: i === current ? 20 : 5, background: i === current ? 'var(--probex-primary)' : 'var(--probex-border-strong)' }}
                  />
                ))}
              </div>
              {paused && (
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>Paused</span>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Slides ─────────────────────────────────────────────────────────────────

function EdgeSlide({ edge, activeEdges }: { edge: EdgeRow | null; activeEdges: number | null }) {
  if (!edge) {
    return (
      <div className="flex flex-col justify-center h-full gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>Strongest Edge</span>
        <p className="text-sm font-semibold" style={{ color: 'var(--probex-text-secondary)' }}>No edge has cleared the threshold</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--probex-text-muted)' }}>
          The engine is holding — it prefers no trade over a weak one.
          {activeEdges !== null ? ` ${activeEdges} signal${activeEdges === 1 ? '' : 's'} under review.` : ''}
        </p>
      </div>
    )
  }
  const color = edge.direction.toLowerCase() === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)'
  return (
    <div className="flex flex-col justify-center h-full gap-3">
      <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>Strongest Active Edge</span>
      <div className="flex items-center gap-4">
        <RadialGauge
          value={Math.min(1, edge.edgePct / 100)}
          color={color}
          size={76}
          strokeWidth={7}
          ariaLabel={`Edge strength ${edge.edgePct.toFixed(1)}%`}
        >
          <span className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{edge.edgePct.toFixed(1)}%</span>
        </RadialGauge>
        <div className="flex flex-col gap-1 min-w-0">
          {edge.marketTitle && (
            <span
              className="text-sm font-semibold leading-tight"
              style={{ color: 'var(--probex-text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {edge.marketTitle}
            </span>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{edge.direction} · edge</span>
          <div className="flex gap-3 text-2xs font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
            {edge.confidence !== null && <span>{formatPercent(edge.confidence)} conf</span>}
            {edge.kellySize !== null && <span>{(edge.kellySize * 100).toFixed(0)}% Kelly</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function PostureSlide({ capital }: { capital: NonNullable<CommandCenterVM['capital']> }) {
  const color = survivalStateColor(capital.state)
  return (
    <div className="flex flex-col justify-center h-full gap-3">
      <div className="flex items-center justify-between">
        <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>Engine Posture</span>
        <span
          className="text-2xs font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
          style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}
        >
          {survivalStateLabel(capital.state)}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold font-mono tabular-nums leading-none" style={{ color: 'var(--probex-text-primary)' }}>{formatCurrency(capital.currentCapital)}</span>
        <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>{(capital.capitalPct * 100).toFixed(0)}% of initial</span>
      </div>
      <MiniTarget label="Daily"  pnl={capital.dailyPnl}  target={capital.dailyTarget}  progress={capital.dailyProgress} />
      <MiniTarget label="Weekly" pnl={capital.weeklyPnl} target={capital.weeklyTarget} progress={capital.weeklyProgress} />
    </div>
  )
}

function RecordSlide({ trading }: { trading: NonNullable<CommandCenterVM['trading']> }) {
  const pnlColor = trading.totalPnl > 0 ? 'var(--probex-positive)' : trading.totalPnl < 0 ? 'var(--probex-negative)' : 'var(--probex-text-primary)'
  return (
    <div className="flex flex-col justify-center h-full gap-3">
      <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>Trading Record</span>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <MiniStat label="Balance"  value={formatCurrency(trading.balance)} />
        <MiniStat label="Total P&L" value={formatSignedCurrency(trading.totalPnl)} color={pnlColor} />
        <MiniStat label="Win Rate" value={trading.totalTrades > 0 ? formatPercent(trading.winRate) : '—'} />
        <MiniStat label="Trades"   value={`${trading.totalTrades}`} {...(trading.totalTrades > 0 && { sub: `${trading.wins}W · ${trading.losses}L` })} />
      </div>
    </div>
  )
}

// ─── Small building blocks ────────────────────────────────────────────────────

function MiniTarget({ label, pnl, target, progress }: { label: string; pnl: number; target: number; progress: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-2xs font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
        <span className="uppercase tracking-wider">{label}</span>
        <span>{formatSignedCurrency(pnl)} / {formatCurrency(target)}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round(progress * 100)}%`, background: 'var(--probex-primary)' }} />
      </div>
    </div>
  )
}

function MiniStat({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <span className="text-lg font-bold font-mono tabular-nums leading-none" style={{ color: color ?? 'var(--probex-text-primary)' }}>{value}</span>
      {sub && <span className="text-2xs font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>{sub}</span>}
    </div>
  )
}

function BtcSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="skeleton h-12 w-56 rounded" />
      <div className="skeleton rounded" style={{ height: 130 }} />
      <div className="skeleton h-4 w-40 rounded" />
    </div>
  )
}
