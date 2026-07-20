'use client'

// MarketCard — restored from V1's MarketCard "featured"/"list" variants
// (git 0e3833a4), promoted from Phase 1's Overview-scoped FeaturedMarketCard
// into the one shared card used by BOTH the Overview Featured grid and the
// Markets catalog (never duplicate components — one card, every consumer).
//
// V1's ConsensusBadge + SentimentIndicator + ConfidenceMeter trio (fabricated
// consensus) is replaced by the live EdgeBadge (real /api/edges signal) —
// the central V3 reframe. WatchlistButton now persists to preferencesStore
// (localStorage) instead of V1's sessionStorage. Click-through navigates to
// Market Detail (restored in this phase).

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

export function MarketCard({ market, edge, variant = 'grid', onClick, className = '' }: MarketCardProps) {
  if (variant === 'list') return <ListRow market={market} edge={edge} onClick={onClick} className={className} />

  const category = segmentLabel(market.segment)
  const yesColor  = market.probability !== null ? probabilityColorVar(market.probability) : 'var(--probex-text-muted)'
  const closes    = market.closesAt !== null
    ? new Date(market.closesAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <div
      onClick={onClick ? () => onClick(market.id) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(market.id) } : undefined}
      className={`flex flex-col gap-2.5 p-3.5 focus-ring ${onClick ? 'card-interactive' : 'card'} ${className}`}
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

      {/* Live edge badge — the V3 signature */}
      <EdgeBadge edge={edge} showEmpty={false} className="self-start" />

      {/* Footer: volume + closes */}
      {(market.volume24h !== null || closes) && (
        <div className="flex items-center justify-between text-2xs pt-2" style={{ borderTop: '1px solid var(--probex-border)', color: 'var(--probex-text-muted)' }}>
          {market.volume24h !== null ? (
            <span>Vol <strong style={{ color: 'var(--probex-text-secondary)' }}>${formatCompact(market.volume24h)}</strong></span>
          ) : <span />}
          {closes && <span>Closes <strong style={{ color: 'var(--probex-text-secondary)' }}>{closes}</strong></span>}
        </div>
      )}
    </div>
  )
}

// ─── List variant ─────────────────────────────────────────────────────────

function ListRow({ market, edge, onClick, className }: { market: MarketRow; edge: EdgeRow | undefined; onClick: ((id: string) => void) | undefined; className: string }) {
  const category = segmentLabel(market.segment)
  return (
    <div
      onClick={onClick ? () => onClick(market.id) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-100 ${onClick ? 'cursor-pointer hover:bg-[var(--probex-surface-2)]' : ''} ${className}`}
      style={{ borderBottom: '1px solid var(--probex-border)', background: 'var(--probex-surface)' }}
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
          <span className="text-base font-bold tabular-nums" style={{ color: probabilityColorVar(market.probability) }}>
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
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="text-2xs font-bold w-8 text-right tabular-nums" style={{ color }}>{pct}¢</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-2xs font-bold tracking-wider w-6" style={{ color: 'var(--probex-text-muted)' }}>NO</span>
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
          <div className="h-full rounded-full" style={{ width: `${100 - pct}%`, background: 'var(--probex-text-disabled)' }} />
        </div>
        <span className="text-2xs font-bold w-8 text-right tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>{100 - pct}¢</span>
      </div>
    </div>
  )
}
