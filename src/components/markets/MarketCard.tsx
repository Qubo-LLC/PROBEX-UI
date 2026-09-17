'use client'

// MarketCard — a market from the current scan, as a small card. One consumer
// remains: Market Detail's "related markets" strip, where a handful of
// neighbours read better as cards than as a second table on the page. The
// Markets › Live catalogue no longer uses it (2026-09-17): a grid of these
// beside the shared MarketTable was two representations of one list, and the
// ledger is the canonical one.
//
// Every figure is the wire's: the question, the category, both prices,
// the volume, the close time, and — when /api/edges names this market — the
// direction, edge and confidence the detector reported. The "High conviction
// / Moderate / Low conviction" tiers that used to grade the confidence at 0.7
// and 0.5 were this file's invention; the engine reports a number and no
// grade, so the number is what is shown.

import { formatCompact } from '@/lib/utils'
import { marketLifecycle, formatCloseTime, closeTimestamp, lifecycleLabel } from '@/lib/display/marketLifecycle'
import { segmentLabel } from '@/lib/display/market'
import type { MarketRow } from '@/lib/mappers/markets'
import type { EdgeRow } from '@/lib/mappers/edges'
import { WatchlistButton } from '@/components/shared/WatchlistButton'

interface MarketCardProps {
  market:     MarketRow
  /** The engine's current edge on this market, if it reports one. */
  edge:       EdgeRow | undefined
  onClick?:   (marketId: string) => void
  className?: string
}

/** The engine's edge direction → accent colour (its mark on the market). */
function edgeAccent(edge: EdgeRow | undefined): string | null {
  if (!edge) return null
  return edge.direction.toLowerCase() === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)'
}

/** The detector's read on this market, as reported: direction · edge ·
 *  confidence. Rendered only when an edge exists. */
function EngineStrip({ edge }: { edge: EdgeRow }) {
  const color = edge.direction.toLowerCase() === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)'
  const conf  = edge.confidence !== null ? Math.round(edge.confidence * 100) : null

  return (
    <div className="flex flex-col gap-1 rounded-md px-2 py-1.5" style={{ background: `color-mix(in srgb, ${color} 7%, var(--probex-surface-2))`, border: `1px solid color-mix(in srgb, ${color} 20%, transparent)` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs font-black uppercase tracking-wider" style={{ color }}>
          {edge.direction.toUpperCase()} · {edge.edgePct.toFixed(1)}% edge
        </span>
        {conf !== null && <span className="text-2xs font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }} title="confidence, as the detector reported it">{conf}% confidence</span>}
      </div>
      {conf !== null && (
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }} aria-hidden="true">
          <div className="h-full rounded-full" style={{ width: `${conf}%`, background: color }} />
        </div>
      )}
    </div>
  )
}

export function MarketCard({ market, edge, onClick, className = '' }: MarketCardProps) {
  const category = segmentLabel(market.segment)
  const accent   = edgeAccent(edge)

  // Lifecycle from the real closes_at. A market that has already resolved is
  // still returned by /api/markets — the forensic audit caught one being served
  // half an hour after it closed — so the card has to say so rather than
  // present it as an ordinary opportunity.
  const life   = marketLifecycle(market.closesAt)
  const closed = life === 'closed'
  const closes = formatCloseTime(market.closesAt)

  return (
    <div
      onClick={onClick ? () => onClick(market.id) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(market.id) } : undefined}
      className={`flex flex-col gap-2.5 p-3.5 focus-ring ${onClick && !closed ? 'card-interactive' : 'card'} ${className}`}
      // A resolved market is not an opportunity. It stays readable and stays
      // reachable (its history is still worth opening), but it loses the raised
      // interactive treatment so it cannot be mistaken for a live candidate.
      // Engine-edge accent: a top border in the edge colour when the detector
      // names this market. Inline so it survives the hover border change.
      style={accent ? { borderTop: `2px solid ${accent}` } : undefined}
    >
      {/* Top: category tag + watchlist */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 min-w-0">
          {category && (
            <span
              className="text-2xs font-bold uppercase tracking-wider rounded-sm px-2 py-0.5"
              style={{ color: 'var(--probex-primary)', background: 'var(--probex-primary-dim)', border: '1px solid var(--probex-border-active)' }}
            >
              {category}
            </span>
          )}
          {closed && (
            <span
              className="text-2xs font-bold uppercase tracking-wider rounded-sm px-2 py-0.5"
              style={{ color: 'var(--probex-text-muted)', background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}
              title={closeTimestamp(market.closesAt)}
            >
              {lifecycleLabel(life)}
            </span>
          )}
        </span>
        <WatchlistButton marketId={market.id} />
      </div>

      {/* Title */}
      <p
        className="text-sm font-semibold leading-snug"
        style={{ color: 'var(--probex-text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {market.title}
      </p>

      {/* YES / NO prices */}
      {market.probability !== null ? (
        <ProbBars prob={market.probability} />
      ) : (
        <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>No price on the wire for this market</p>
      )}

      {edge && <EngineStrip edge={edge} />}

      {/* Footer: volume + closes */}
      <div className="flex items-center justify-between text-2xs pt-2" style={{ borderTop: '1px solid var(--probex-border)', color: 'var(--probex-text-muted)' }}>
        {market.volume24h !== null ? (
          <span>Vol <strong className="font-mono tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>${formatCompact(market.volume24h)}</strong></span>
        ) : <span />}
        {/* "Sep 9" told an operator nothing about a 15-minute market — every one
            of them closes today. Time remaining is the fact that matters. */}
        <span
          className="font-mono tabular-nums"
          style={{ color: closed ? 'var(--probex-text-disabled)' : 'var(--probex-text-secondary)' }}
          title={closeTimestamp(market.closesAt)}
        >
          {closes}
        </span>
      </div>
    </div>
  )
}

/**
 * The two market sides, in the two market-side colours — never the
 * financial-direction band (a cheap YES is not a loss).
 */
function ProbBars({ prob }: { prob: number }) {
  const pct = Math.round(prob * 100)
  return (
    <div className="flex flex-col gap-1">
      <SideBar label="YES" cents={pct} color="var(--probex-yes)" />
      <SideBar label="NO" cents={100 - pct} color="var(--probex-no)" />
    </div>
  )
}

function SideBar({ label, cents, color }: { label: string; cents: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-2xs font-bold tracking-wider w-6" style={{ color }}>{label}</span>
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--probex-surface-2)' }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${cents}%`, background: color }} />
      </div>
      <span className="text-2xs font-bold font-mono w-8 text-right tabular-nums" style={{ color }}>{cents}¢</span>
    </div>
  )
}
