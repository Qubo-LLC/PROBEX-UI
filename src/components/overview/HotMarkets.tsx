'use client'

// HotMarkets — replaces ActivityFeed in the Overview's sticky sidebar rail
// (2026-07-24, direct product feedback: "Live Activity" showed raw engine
// events, which read as internal log noise in the one slot meant to help a
// visitor pick a market to watch). This rail shows the markets themselves —
// ranked so the engine's own active edges surface first (the most actionable
// thing to look at), then by soonest-closing (these are 5–15 minute markets;
// "closes in 2m" is far more useful here than a 24h-volume ranking) — each
// row clicks through to Market Detail. Reuses the existing MarketRow/EdgeRow
// mappers and EdgeBadge; no new data source.

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { parseMarketRows, type MarketRow } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { MARKET_DETAIL_PATH } from '@/config/constants'
import { EdgeBadge } from '@/components/shared/EdgeBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

function formatCountdown(closesAt: number | null): string | null {
  if (closesAt === null) return null
  const ms = closesAt - Date.now()
  if (ms <= 0) return 'closing'
  const mins = Math.floor(ms / 60_000)
  const secs = Math.floor((ms % 60_000) / 1_000)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

interface HotMarketsProps {
  className?: string
}

export function HotMarkets({ className = '' }: HotMarketsProps) {
  const router = useRouter()
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const edgesSlice    = useApplicationStore((s) => s.engine.edges)

  const marketRows = useMemo(
    () => (marketsSlice.data ? parseMarketRows(marketsSlice.data) : null),
    [marketsSlice.data],
  )
  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  const ranked = useMemo(() => {
    if (marketRows?.kind !== 'rows') return []
    return [...marketRows.rows].sort((a, b) => {
      const edgeA = edgeMap.get(a.id)
      const edgeB = edgeMap.get(b.id)
      if (!!edgeB !== !!edgeA) return edgeB ? 1 : -1
      if (edgeA && edgeB && edgeA.edgePct !== edgeB.edgePct) return edgeB.edgePct - edgeA.edgePct
      return (a.closesAt ?? Infinity) - (b.closesAt ?? Infinity)
    })
  }, [marketRows, edgeMap])

  if (marketsSlice.status === 'error') {
    return (
      <div className={`rounded-md overflow-hidden ${className}`} style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
        <ErrorState title="Markets unavailable" description={marketsSlice.error?.message ?? 'The /api/markets endpoint did not respond.'} fullPage={false} />
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-md ${className}`}
      style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}
    >
      <div className="px-3.5 py-3 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div className="flex items-center gap-1.5">
          <span className="live-dot w-1.5 h-1.5" aria-hidden="true" />
          <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--probex-text-primary)' }}>Hot Markets</h3>
        </div>
        <span className="text-2xs font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>{ranked.length} open</span>
      </div>

      <div className="overflow-y-auto flex-1">
        {marketRows?.kind === 'empty' && (
          <EmptyState size="sm" title="No markets open right now" description="The engine's 5- and 15-minute BTC markets appear here as they open — pick one to watch its live edge." />
        )}

        {marketRows?.kind === 'unrecognized' && (
          <div className="p-3.5">
            <p className="text-2xs" style={{ color: 'var(--probex-warning)' }}>
              {marketRows.count} market{marketRows.count === 1 ? '' : 's'} reported, but the format doesn't match the agreed schema yet.
            </p>
          </div>
        )}

        {ranked.map((m: MarketRow) => {
          const edge = edgeMap.get(m.id)
          const countdown = formatCountdown(m.closesAt)
          return (
            <button
              key={m.id}
              onClick={() => router.push(MARKET_DETAIL_PATH(m.id))}
              className="w-full flex flex-col gap-1.5 px-3.5 py-2.5 text-left cursor-pointer transition-colors duration-100 hover:bg-[var(--probex-surface-2)] focus-ring"
              style={{ borderBottom: '1px solid var(--probex-border)', borderLeft: edge ? `2.5px solid ${edge.direction === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)'}` : '2.5px solid transparent' }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xs font-semibold truncate flex-1" style={{ color: 'var(--probex-text-primary)' }}>{m.title}</span>
                {countdown && <span className="text-[9px] font-mono tabular-nums flex-shrink-0" style={{ color: 'var(--probex-text-muted)' }}>{countdown}</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <EdgeBadge edge={edge} size="sm" showEmpty={false} />
                {m.probability !== null && (
                  <span className="text-2xs font-mono tabular-nums font-bold ml-auto" style={{ color: 'var(--probex-text-secondary)' }}>
                    {Math.round(m.probability * 100)}¢
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
