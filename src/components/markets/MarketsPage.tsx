'use client'

// MarketsPage — restored from V1's MarketsView (git 0e3833a4). The catalog of
// opportunities the engine is watching. Filter/sort/search state lives in
// uiStore (its first real consumer); data is live /api/markets + /api/edges
// via the same parse-or-report mappers used everywhere else in V3.

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { useUIStore } from '@/store/uiStore'
import { parseMarketRows } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { MARKET_DETAIL_PATH } from '@/config/constants'
import { MarketFilterBar } from './MarketFilterBar'
import { MarketCard } from './MarketCard'
import { MarketTable } from './MarketTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Card } from '@/components/ui/Card'

export function MarketsPage() {
  const router = useRouter()
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const edgesSlice    = useApplicationStore((s) => s.engine.edges)

  const search    = useUIStore((s) => s.marketSearch)
  const segment   = useUIStore((s) => s.marketSegment)
  const sortBy    = useUIStore((s) => s.marketSortBy)
  const sortDir   = useUIStore((s) => s.marketSortDir)
  const viewMode  = useUIStore((s) => s.marketViewMode)

  const marketRows = useMemo(
    () => (marketsSlice.data ? parseMarketRows(marketsSlice.data) : null),
    [marketsSlice.data],
  )
  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  const filtered = useMemo(() => {
    if (marketRows?.kind !== 'rows') return []
    let list = marketRows.rows

    if (segment) list = list.filter((m) => m.segment === segment)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((m) => m.title.toLowerCase().includes(q))
    }

    const mult = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'probability': return mult * ((a.probability ?? 0) - (b.probability ?? 0))
        case 'liquidity':   return mult * ((a.liquidity ?? 0) - (b.liquidity ?? 0))
        case 'closesAt':    return mult * ((a.closesAt ?? 0) - (b.closesAt ?? 0))
        case 'volume24h':
        default:            return mult * ((a.volume24h ?? 0) - (b.volume24h ?? 0))
      }
    })
  }, [marketRows, segment, search, sortBy, sortDir])

  const handleSelect = (id: string) => router.push(MARKET_DETAIL_PATH(id))

  return (
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader title="Markets" subtitle="Bitcoin 5-minute markets the engine is scanning right now" />

      <div className="sticky top-0 z-10 -mx-5 px-5 pb-2" style={{ background: 'var(--probex-bg)', borderBottom: '1px solid var(--probex-border)' }}>
        <MarketFilterBar />
      </div>

      {marketsSlice.status === 'loading' && (
        <p className="text-xs py-2" style={{ color: 'var(--probex-text-disabled)' }}>
          Waiting for /api/markets — the engine’s market fetcher can take several seconds under rate limiting.
        </p>
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
            The engine reports {marketRows.count} active market{marketRows.count === 1 ? '' : 's'}, but the item
            format doesn’t match the agreed schema yet — the catalog is not shown to avoid displaying wrong
            values. (Backend contract P0-01.)
          </p>
        </Card>
      )}

      {marketRows?.kind === 'empty' && (
        <EmptyState
          title="No markets this cycle"
          description="The engine's market scanner hasn't returned qualifying 5-minute candidates yet. The catalog fills in automatically the moment it does."
        />
      )}

      {marketRows?.kind === 'rows' && (
        <>
          <p className="text-xs" style={{ color: 'var(--probex-text-muted)' }}>
            {filtered.length} market{filtered.length === 1 ? '' : 's'}{segment ? ` in ${segment}` : ''}
          </p>

          {viewMode === 'table' ? (
            <MarketTable markets={filtered} edgeMap={edgeMap} onSelect={handleSelect} />
          ) : filtered.length === 0 ? (
            <EmptyState size="sm" title="No markets match your filters" description="Try adjusting your segment or search query." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((m) => (
                <MarketCard key={m.id} market={m} edge={edgeMap.get(m.id)} onClick={handleSelect} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
