'use client'

// FeaturedMarkets — restored from V1's "Featured Markets" grid (git
// 0e3833a4). V1 filtered by consensus availability; V3 has no consensus map
// yet, so featured = highest-liquidity live markets, each carrying a live
// edge chip when the engine has one for it. Uses the shared MarketCard (Phase
// 2) rather than an Overview-only card. Now navigates to Market Detail,
// restored in this same phase.

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { parseMarketRows } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { MARKET_DETAIL_PATH } from '@/config/constants'
import { SectionHeader } from './SectionHeader'
import { MarketCard, MarketCardSkeleton } from '@/components/markets/MarketCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Card } from '@/components/ui/Card'

const MAX_FEATURED = 6

export function FeaturedMarkets() {
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

  const featured = useMemo(() => {
    if (marketRows?.kind !== 'rows') return []
    return [...marketRows.rows]
      .sort((a, b) => (b.liquidity ?? b.volume24h ?? 0) - (a.liquidity ?? a.volume24h ?? 0))
      .slice(0, MAX_FEATURED)
  }, [marketRows])

  return (
    <section>
      <SectionHeader title="Featured Markets" subtitle="Highest-liquidity markets — accented where the engine sees an edge" />

      {marketsSlice.status === 'loading' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <MarketCardSkeleton key={i} />)}
        </div>
      )}

      {marketsSlice.status === 'error' && (
        <ErrorState
          title="Markets unavailable"
          description={marketsSlice.error?.message ?? 'The /api/markets endpoint did not respond.'}
          fullPage={false}
        />
      )}

      {marketRows?.kind === 'unrecognized' && (
        <Card>
          <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
            The engine reports {marketRows.count} active market{marketRows.count === 1 ? '' : 's'}, but the
            item format doesn’t match the agreed schema yet. (Backend contract P0-01.)
          </p>
        </Card>
      )}

      {marketRows?.kind === 'empty' && (
        <EmptyState
          size="sm"
          title="The engine is scanning"
          description="Featured markets appear here the moment the scanner returns qualifying candidates — the engine prefers patience over noise."
        />
      )}

      {featured.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {featured.map((m) => (
            <MarketCard
              key={m.id}
              market={m}
              edge={edgeMap.get(m.id)}
              onClick={(id) => router.push(MARKET_DETAIL_PATH(id))}
            />
          ))}
        </div>
      )}
    </section>
  )
}
