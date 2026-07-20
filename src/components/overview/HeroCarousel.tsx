'use client'

// HeroCarousel — restored from V1 (git 0e3833a4), the primary visual focal
// point of the Overview page. Structurally near-identical to V1 (autoplay,
// pause-on-hover, dot navigation, progress bar) but every data point is
// re-wired to the live engine or honestly omitted:
//
//   • probability / prices / segment / volume  → parseMarketRows (P0-01)
//   • "Consensus Engine" row (V1, fabricated)   → live Edge Strength gauge,
//     or an honest "no active edge" line — the reframe's central move:
//     repoint V1's premium visual vocabulary at the engine's REAL reasoning.
//   • "7-Day Probability" sparkline (V1, fabricated per-market history,
//     MD-1 not yet available) → the live BTC price trend, clearly labelled
//     as the engine's price feed rather than a per-market series that
//     doesn't exist yet.
//
// First real consumer of the Phase 0 RadialGauge primitive.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { useEnginePriceChart } from '@/config/hooks/useServices'
import { parseMarketRows, type MarketRow } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { segmentLabel } from '@/lib/display/market'
import { formatCompact, formatPercent, probabilityColorVar } from '@/lib/utils'
import { formatPriceChangePct } from '@/lib/mappers/priceHistory'
import { MARKET_DETAIL_PATH } from '@/config/constants'
import { RadialGauge } from '@/components/shared/RadialGauge'
import { Sparkline } from '@/components/shared/Sparkline'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Card } from '@/components/ui/Card'

const DURATION_MS = 7000
const MAX_SLIDES  = 6

// ─── Probability gauge (V1 linear treatment, restored) ────────────────────────

function ProbGauge({ prob }: { prob: number }) {
  const pct = Math.round(prob * 100)
  const yesColor = probabilityColorVar(prob)
  return (
    <div className="flex flex-col gap-1.5 min-w-[110px]">
      <div className="flex justify-between text-2xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
        <span>YES</span>
        <span>NO</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: yesColor }}>{pct}%</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden mx-1" style={{ background: 'var(--probex-border-default)' }}>
          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: yesColor }} />
        </div>
        <span className="text-sm font-semibold tabular-nums leading-none" style={{ color: 'var(--probex-text-muted)' }}>{100 - pct}%</span>
      </div>
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--probex-border)' }}>
      <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{value}</span>
    </div>
  )
}

// ─── Slide ──────────────────────────────────────────────────────────────────

function HeroSlide({
  market, edge, isActive, btcPrices, btcChangePct, onSelect,
}: {
  market:       MarketRow
  edge:         EdgeRow | undefined
  isActive:     boolean
  btcPrices:    number[]
  btcChangePct: number
  onSelect:     () => void
}) {
  const category = segmentLabel(market.segment)
  const resolves  = market.closesAt !== null
    ? new Date(market.closesAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div
      role="button"
      aria-label={`View market: ${market.title}`}
      aria-hidden={!isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={onSelect}
      onKeyDown={(e) => { if (isActive && (e.key === 'Enter' || e.key === ' ')) onSelect() }}
      className="absolute inset-0 flex flex-col gap-4 cursor-pointer"
      style={{
        opacity:       isActive ? 1 : 0,
        transform:     isActive ? 'translateX(0)' : 'translateX(12px)',
        transition:    'opacity 0.45s ease, transform 0.45s ease',
        pointerEvents: isActive ? 'auto' : 'none',
        padding:       '22px 28px 18px',
      }}
    >
      {/* Top row: category + resolves */}
      <div className="flex justify-between items-center">
        {category && (
          <span
            className="text-2xs font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
            style={{ color: 'var(--probex-primary)', background: 'var(--probex-primary-dim)', border: '1px solid var(--probex-yes-border)' }}
          >
            {category}
          </span>
        )}
        {resolves && (
          <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>Resolves {resolves}</span>
        )}
      </div>

      {/* Title */}
      <h2
        className="font-extrabold leading-tight max-w-[72%]"
        style={{ fontSize: 'clamp(16px, 2.4vw, 22px)', letterSpacing: '-0.01em', color: 'var(--probex-text-primary)' }}
      >
        {market.title}
      </h2>

      {/* Main content row */}
      <div className="flex gap-6 items-start flex-1 min-h-0">
        {/* Left: probability + edge strength */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          {market.probability !== null ? (
            <ProbGauge prob={market.probability} />
          ) : (
            <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>Awaiting price data</p>
          )}

          {edge ? (
            <div className="flex items-center gap-3">
              <RadialGauge
                value={edge.edgePct / 100}
                color={edge.direction === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)'}
                size={64}
                strokeWidth={6}
                ariaLabel={`Edge strength ${edge.edgePct.toFixed(1)}%`}
              >
                <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>
                  {edge.edgePct.toFixed(0)}%
                </span>
              </RadialGauge>
              <div className="flex flex-col gap-0.5">
                <span className="text-2xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
                  Edge Strength · {edge.direction.toUpperCase()}
                </span>
                {edge.confidence !== null && (
                  <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
                    {formatPercent(edge.confidence)} confidence{edge.signal ? ` · ${edge.signal}` : ''}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
              No active edge — the engine is not currently trading this market
            </p>
          )}
        </div>

        {/* Right: BTC trend + stats */}
        <div className="flex flex-col gap-2 items-end flex-shrink-0">
          <div className="flex justify-between items-center w-[220px] mb-0.5">
            <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: 'var(--probex-text-muted)' }}>
              BTC / USD · live feed
            </span>
            <span className="text-2xs font-bold" style={{ color: btcChangePct >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)' }}>
              {formatPriceChangePct(btcChangePct)}
            </span>
          </div>
          <Sparkline points={btcPrices} width={220} height={60} color={btcChangePct >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)'} />
          {(market.volume24h !== null || market.openInterest !== null) && (
            <div className="flex gap-1.5 mt-0.5">
              {market.volume24h !== null && <StatPill label="Volume" value={`$${formatCompact(market.volume24h)}`} />}
              {market.openInterest !== null && <StatPill label="O.I." value={`$${formatCompact(market.openInterest)}`} />}
            </div>
          )}
        </div>
      </div>

      {/* Thesis strip — only when the engine provided a description */}
      {market.description && (
        <p
          className="text-xs leading-relaxed pt-2.5"
          style={{
            color: 'var(--probex-text-muted)', borderTop: '1px solid var(--probex-border)',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
        >
          <strong style={{ color: 'var(--probex-text-secondary)', fontWeight: 600 }}>Thesis: </strong>
          {market.description}
        </p>
      )}
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function HeroCarousel() {
  const router = useRouter()
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const edgesSlice    = useApplicationStore((s) => s.engine.edges)
  const priceChart    = useEnginePriceChart()

  const marketRows = useMemo(
    () => (marketsSlice.data ? parseMarketRows(marketsSlice.data) : null),
    [marketsSlice.data],
  )
  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  const slides = useMemo(() => {
    if (marketRows?.kind !== 'rows') return []
    return [...marketRows.rows]
      .filter((m) => m.probability !== null)
      .sort((a, b) => (b.liquidity ?? b.volume24h ?? 0) - (a.liquidity ?? a.volume24h ?? 0))
      .slice(0, MAX_SLIDES)
  }, [marketRows])

  const btcPrices    = priceChart.data ? priceChart.data.points.map((p) => p.price) : []
  const btcChangePct = priceChart.data?.priceChangePct ?? 0

  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused || slides.length === 0) return
    const id = setInterval(() => setCurrent((c) => (c + 1) % slides.length), DURATION_MS)
    return () => clearInterval(id)
  }, [isPaused, slides.length])

  useEffect(() => { setCurrent(0) }, [slides.length])

  const go = useCallback((idx: number) => {
    setCurrent(idx)
    setIsPaused(true)
    setTimeout(() => setIsPaused(false), 12_000)
  }, [])

  // ── Non-rows states — truthful, not AwaitingBackend (the endpoint is live) ──
  if (marketsSlice.status === 'error') {
    return (
      <ErrorState
        title="Featured markets unavailable"
        description={marketsSlice.error?.message ?? 'The /api/markets endpoint did not respond.'}
        fullPage={false}
      />
    )
  }

  if (marketRows?.kind === 'unrecognized') {
    return (
      <Card>
        <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
          The engine reports {marketRows.count} active market{marketRows.count === 1 ? '' : 's'}, but the
          item format doesn’t match the agreed schema yet — featured markets are not shown to avoid
          displaying wrong values. (Backend contract P0-01.)
        </p>
      </Card>
    )
  }

  if (slides.length === 0) {
    return (
      <EmptyState
        title="No featured markets this cycle"
        description="The engine's market scanner hasn't returned qualifying candidates yet. Featured opportunities appear here the moment it does."
      />
    )
  }

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative rounded-xl overflow-hidden"
      style={{ height: 300, background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 90% at 92% 15%, var(--probex-primary-dim) 0%, transparent 65%)' }}
      />

      <div className="relative h-full">
        {slides.map((m, i) => (
          <HeroSlide
            key={m.id}
            market={m}
            edge={edgeMap.get(m.id)}
            isActive={i === current}
            btcPrices={btcPrices}
            btcChangePct={btcChangePct}
            onSelect={() => router.push(MARKET_DETAIL_PATH(m.id))}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--probex-border)' }}>
        {!isPaused && (
          <div
            key={current}
            className="h-full origin-left"
            style={{ background: 'var(--probex-primary)', animation: `hero-progress ${DURATION_MS}ms linear` }}
          />
        )}
      </div>

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-3.5 right-5 flex gap-1.5" role="tablist" aria-label="Featured market slides">
          {slides.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Show slide ${i + 1}`}
              onClick={() => go(i)}
              className="h-1.5 rounded-full transition-[width,background] duration-200 cursor-pointer p-0 border-0"
              style={{ width: i === current ? 20 : 5, background: i === current ? 'var(--probex-primary)' : 'var(--probex-border-strong)' }}
            />
          ))}
        </div>
      )}

      {isPaused && (
        <span
          className="absolute top-2.5 right-3.5 text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
          style={{ color: 'var(--probex-text-muted)', background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}
        >
          Paused
        </span>
      )}
    </div>
  )
}
