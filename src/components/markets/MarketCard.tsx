'use client'

// MarketCard — the one shared market card (Overview Featured grid + Markets
// catalog). V1's fabricated consensus trio is replaced by the live EdgeBadge
// (real /api/edges). Never duplicated — one card, every consumer.
//
// Craft (Overview Experience Refinement): the card is the trader's market; the
// ENGINE'S EDGE is the AI's mark on it. Markets the engine has flagged carry a
// top accent in the edge-direction colour, so AI-selected opportunities stand
// out from the field — the hybrid identity, expressed with real data only.
// Numbers are mono (technical identity); a skeleton covers the loading state.

import { formatCompact, probabilityColorVar } from '@/lib/utils'
import { segmentLabel } from '@/lib/display/market'
import type { MarketRow } from '@/lib/mappers/markets'
import type { EdgeRow } from '@/lib/mappers/edges'
import { EdgeBadge } from '@/components/shared/EdgeBadge'
import { WatchlistButton } from '@/components/shared/WatchlistButton'

interface MarketCardProps {
  market:     MarketRow
  /** The engine's live edge for this market, if it currently has one. */
  edge:       EdgeRow | undefined
  variant?:   'grid' | 'list'
  onClick?:   (marketId: string) => void
  className?: string
}

/** The engine's edge direction → accent colour (its mark on the market). */
function edgeAccent(edge: EdgeRow | undefined): string | null {
  if (!edge) return null
  return edge.direction.toLowerCase() === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)'
}

/** Confidence tier from the real edge confidence. */
function confidenceTier(c: number | null): { label: string; color: string } | null {
  if (c === null) return null
  if (c >= 0.7) return { label: 'High conviction', color: 'var(--probex-positive)' }
  if (c >= 0.5) return { label: 'Moderate',        color: 'var(--probex-warning)' }
  return { label: 'Low conviction', color: 'var(--probex-text-muted)' }
}

/** EngineStrip — the engine's live read on a market (direction · edge% ·
 *  confidence tier) from /api/edges. Rendered only when an edge exists. */
function EngineStrip({ edge }: { edge: EdgeRow }) {
  const color = edge.direction.toLowerCase() === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)'
  const tier  = confidenceTier(edge.confidence)
  const conf  = edge.confidence !== null ? Math.round(edge.confidence * 100) : null

  return (
    <div className="flex flex-col gap-1 rounded-md px-2 py-1.5" style={{ background: `color-mix(in srgb, ${color} 7%, var(--probex-surface-2))`, border: `1px solid color-mix(in srgb, ${color} 20%, transparent)` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs font-black uppercase tracking-wider" style={{ color }}>
          {edge.direction.toUpperCase()} · {edge.edgePct.toFixed(1)}% edge
        </span>
        {tier && <span className="text-2xs font-semibold" style={{ color: tier.color }}>{tier.label}</span>}
      </div>
      {conf !== null && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
            <div className="h-full rounded-full" style={{ width: `${conf}%`, background: color }} />
          </div>
          <span className="text-[9px] font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>{conf}%</span>
        </div>
      )}
    </div>
  )
}

export function MarketCard({ market, edge, variant = 'grid', onClick, className = '' }: MarketCardProps) {
  if (variant === 'list') return <ListRow market={market} edge={edge} onClick={onClick} className={className} />

  const category = segmentLabel(market.segment)
  const yesColor = market.probability !== null ? probabilityColorVar(market.probability) : 'var(--probex-text-muted)'
  const accent   = edgeAccent(edge)
  const closes   = market.closesAt !== null
    ? new Date(market.closesAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <div
      onClick={onClick ? () => onClick(market.id) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(market.id) } : undefined}
      className={`flex flex-col gap-2.5 p-3.5 focus-ring ${onClick ? 'card-interactive' : 'card'} ${className}`}
      // Engine-edge accent: a top border in the edge colour when the AI is
      // acting on this market. Inline so it survives the hover border change.
      style={accent ? { borderTop: `2px solid ${accent}` } : undefined}
    >
      {/* Top: category tag + watchlist */}
      <div className="flex items-center justify-between gap-2">
        {category ? (
          <span
            className="text-2xs font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
            style={{ color: 'var(--probex-primary)', background: 'var(--probex-primary-dim)', border: '1px solid var(--probex-yes-border)' }}
          >
            {category}
          </span>
        ) : <span />}
        <WatchlistButton marketId={market.id} />
      </div>

      {/* Title */}
      <p
        className="text-sm font-semibold leading-snug"
        style={{ color: 'var(--probex-text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {market.title}
      </p>

      {/* YES / NO bars */}
      {market.probability !== null ? (
        <ProbBars prob={market.probability} color={yesColor} />
      ) : (
        <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>Awaiting price data</p>
      )}

      {edge && <EngineStrip edge={edge} />}

      {/* Footer: volume + closes */}
      {(market.volume24h !== null || closes) && (
        <div className="flex items-center justify-between text-2xs pt-2" style={{ borderTop: '1px solid var(--probex-border)', color: 'var(--probex-text-muted)' }}>
          {market.volume24h !== null ? (
            <span>Vol <strong className="font-mono tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>${formatCompact(market.volume24h)}</strong></span>
          ) : <span />}
          {closes && <span>Closes <strong className="font-mono tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>{closes}</strong></span>}
        </div>
      )}
    </div>
  )
}

// ─── Loading skeleton (grid variant) ───────────────────────────────────────

export function MarketCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`card flex flex-col gap-2.5 p-3.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="skeleton h-4 w-16 rounded-full" />
        <div className="skeleton h-4 w-4 rounded" />
      </div>
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-3 w-3/4 rounded" />
      <div className="flex flex-col gap-1.5 mt-0.5">
        <div className="skeleton h-1.5 w-full rounded-full" />
        <div className="skeleton h-1.5 w-4/5 rounded-full" />
      </div>
      <div className="skeleton h-4 w-24 rounded-full" />
    </div>
  )
}

// ─── List variant ─────────────────────────────────────────────────────────

function ListRow({ market, edge, onClick, className }: { market: MarketRow; edge: EdgeRow | undefined; onClick: ((id: string) => void) | undefined; className: string }) {
  const category = segmentLabel(market.segment)
  const accent   = edgeAccent(edge)
  return (
    <div
      onClick={onClick ? () => onClick(market.id) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-100 ${onClick ? 'cursor-pointer hover:bg-[var(--probex-surface-2)]' : ''} ${className}`}
      style={{ borderBottom: '1px solid var(--probex-border)', borderLeft: accent ? `2px solid ${accent}` : '2px solid transparent', background: 'var(--probex-surface)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm truncate" style={{ color: 'var(--probex-text-primary)' }}>{market.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {category && (
            <span className="text-2xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-primary)' }}>{category}</span>
          )}
          <EdgeBadge edge={edge} showEmpty={false} />
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        {market.probability !== null && (
          <span className="text-base font-bold font-mono tabular-nums" style={{ color: probabilityColorVar(market.probability) }}>
            {Math.round(market.probability * 100)}¢
          </span>
        )}
        <WatchlistButton marketId={market.id} />
      </div>
    </div>
  )
}

function ProbBars({ prob, color }: { prob: number; color: string }) {
  const pct = Math.round(prob * 100)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-2xs font-bold tracking-wider w-6" style={{ color }}>YES</span>
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="text-2xs font-bold font-mono w-8 text-right tabular-nums" style={{ color }}>{pct}¢</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-2xs font-bold tracking-wider w-6" style={{ color: 'var(--probex-text-muted)' }}>NO</span>
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${100 - pct}%`, background: 'var(--probex-text-disabled)' }} />
        </div>
        <span className="text-2xs font-bold font-mono w-8 text-right tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>{100 - pct}¢</span>
      </div>
    </div>
  )
}
