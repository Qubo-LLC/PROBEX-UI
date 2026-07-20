'use client'

// MarketDetailPage — V3 Phase 2 assembly root, restoring V1's market detail
// experience (git 0e3833a4) on the live data spine. V1 used a 3-column grid
// (Consensus panel | content | TradingDrawer). V3 folds the consensus
// column into the header's EdgeBadge/ProbabilityValue (a full Consensus
// flagship panel is out of scope for this phase — see Phase 3 boundary) and
// replaces TradingDrawer with the read-only AutoExecutionPanel, giving a
// 2-column layout: content + auto-execution rail.
//
// No single-market-by-id endpoint exists, so the market is looked up
// client-side from the live /api/markets envelope. Polymarket's 5-minute
// markets rotate constantly, so "not found" is phrased as "no longer active"
// rather than a permanent 404 — it is frequently true and never a bug.

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { parseMarketRows } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { MARKET_DETAIL_PATH, ROUTES } from '@/config/constants'
import { Skeleton } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { MarketHeader } from './MarketHeader'
import { MarketCharts } from './MarketCharts'
import { EngineThesisPanel } from './EngineThesisPanel'
import { MarketActivityFeed } from './MarketActivityFeed'
import { RelatedMarkets } from './RelatedMarkets'
import { AutoExecutionPanel } from './AutoExecutionPanel'

export function MarketDetailPage({ marketId }: { marketId: string }) {
  const router = useRouter()
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const edgesSlice   = useApplicationStore((s) => s.engine.edges)

  const marketRows = useMemo(() => {
    if (!marketsSlice.data) return null
    const parsed = parseMarketRows(marketsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [marketsSlice.data])

  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  const goToMarket = (id: string) => router.push(MARKET_DETAIL_PATH(id))

  // Phase 6A: render the real page shell immediately instead of blocking on
  // a single full-page spinner (the one page in the product that violated
  // its own standard — every other page shows its structure right away with
  // per-widget pending states). Same 2-column grid, same rail width, just
  // skeleton content in place of the not-yet-resolved market.
  if (marketsSlice.status === 'loading') {
    return (
      <div className="flex flex-col" style={{ background: 'var(--probex-bg)' }}>
        <header className="px-6 pt-5 pb-4 flex flex-col gap-3" style={{ borderBottom: '1px solid var(--probex-border)', background: 'var(--probex-surface)' }}>
          <Skeleton height={10} width={70} />
          <Skeleton height={20} width="55%" />
          <div className="flex items-center gap-3">
            <Skeleton height={22} width={90} />
            <Skeleton height={22} width={56} />
          </div>
        </header>
        <div className="grid gap-0" style={{ gridTemplateColumns: 'minmax(0, 1fr) 320px' }}>
          <div className="min-w-0 flex flex-col" style={{ borderRight: '1px solid var(--probex-border)' }}>
            <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--probex-border)' }}>
              <Skeleton height={192} width="100%" />
            </div>
            <div className="px-6 py-5 flex flex-col gap-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
              <Skeleton height={12} width={110} />
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={54} />)}
              </div>
            </div>
          </div>
          <div className="p-4">
            <Skeleton height={240} width="100%" />
          </div>
        </div>
      </div>
    )
  }

  if (marketsSlice.status === 'error') {
    return (
      <ErrorState
        title="Markets unavailable"
        description={marketsSlice.error?.message ?? 'The /api/markets endpoint did not respond.'}
        secondary={<button onClick={() => router.push(ROUTES.MARKETS)} className="btn-secondary px-4 py-2 text-sm">Back to Markets</button>}
      />
    )
  }

  const market = marketRows?.find((m) => m.id === marketId)

  if (!market) {
    return (
      <EmptyState
        size="lg"
        title="This market is no longer active"
        description="Polymarket's 5-minute Bitcoin markets rotate continuously — this one has likely closed or been replaced. Browse the current set instead."
        action={<button onClick={() => router.push(ROUTES.MARKETS)} className="btn-primary px-4 py-2 text-sm">Back to Markets</button>}
      />
    )
  }

  const edge = edgeMap.get(market.id)

  return (
    <div className="flex flex-col" style={{ background: 'var(--probex-bg)' }}>
      <MarketHeader market={market} edge={edge} />

      <div className="grid gap-0" style={{ gridTemplateColumns: 'minmax(0, 1fr) 320px' }}>
        <div className="min-w-0" style={{ borderRight: '1px solid var(--probex-border)' }}>
          <MarketCharts />
          <EngineThesisPanel market={market} edge={edge} />
          <MarketActivityFeed marketId={market.id} />
          <RelatedMarkets currentMarketId={market.id} segment={market.segment} onSelect={goToMarket} />
        </div>

        <div className="p-4">
          <AutoExecutionPanel edge={edge} />
        </div>
      </div>
    </div>
  )
}
