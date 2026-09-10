'use client'

// MarketDetailPage — V3 Phase 2 assembly root, restoring V1's market detail
// experience (git 0e3833a4) on the live data spine. V1 used a 3-column grid
// (Consensus panel | content | TradingDrawer). V3 folds the consensus
// column into the header's EdgeBadge/ProbabilityValue (a full Consensus
// flagship panel is out of scope for this phase — see Phase 3 boundary) and
// replaces TradingDrawer with the read-only AutoExecutionPanel, giving a
// 2-column layout: content + auto-execution rail.
//
// ─── Market lookup (corrected 2026-09-07) ────────────────────────────────────
// This file previously stated "No single-market-by-id endpoint exists", and so
// looked the market up client-side inside the live /api/markets envelope. That
// was true when written — GET /api/markets/:market_id hung — and it stopped
// being true without anyone re-probing. The consequence was not cosmetic:
// /api/markets contains only what the engine is scanning RIGHT NOW, so a closed
// or expired market could not be displayed at all, and the page reassembled
// from two endpoints what one endpoint returns in a single 32KB response.
//
// The detail endpoint is now the primary source. The envelope lookup is kept as
// a fallback for the case where the detail call fails but the market happens to
// be in the currently-scanned list — strictly more coverage than either alone.
//
// Polymarket's 5-minute markets rotate constantly, so a 404 is phrased as "no
// longer active" rather than as an error: it is frequently true and never a bug.

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { useMarketDetail } from '@/config/hooks/useServices'
import { parseMarketRows, marketDetailToRow } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { MARKET_DETAIL_PATH, ROUTES } from '@/config/constants'
import { Skeleton } from '@/components/ui/LoadingState'
import { MarketHeader } from './MarketHeader'
import { MarketCharts } from './MarketCharts'
import { EngineThesisPanel } from './EngineThesisPanel'
import { MarketActivityFeed } from './MarketActivityFeed'
import { RelatedMarkets } from './RelatedMarkets'
import { AutoExecutionPanel } from './AutoExecutionPanel'
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'

export function MarketDetailPage({ marketId }: { marketId: string }) {
  const router = useRouter()
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const edgesSlice   = useApplicationStore((s) => s.engine.edges)

  // Primary source: the market's own endpoint.
  const detailSlice = useMarketDetail(marketId)

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
  // Skeleton only while BOTH sources are still loading. Once either resolves
  // there is something real to render, and holding a spinner over available
  // data would be its own small dishonesty.
  if (detailSlice.status === 'loading' && marketsSlice.status === 'loading') {
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

  // The detail endpoint wins when it answered; the scanned-markets envelope is
  // the fallback. Both project onto the same MarketRow, so everything below is
  // agnostic about which one supplied it.
  const detailRow = detailSlice.data ? marketDetailToRow(detailSlice.data.market) : undefined
  const market    = detailRow ?? marketRows?.find((m) => m.id === marketId)
  const hasClosed = detailSlice.data?.market.hasClosed ?? false

  // Degraded path. /api/markets intermittently stalls (audit finding B-02) and
  // is also scoped to CURRENTLY-scanned markets, so a closed market won't be in
  // it either. Neither case should blank the page: /api/markets/:id/history is a
  // separate endpoint that still resolves and carries the market's own
  // question, so the charts remain useful on their own. Previously both cases
  // returned a dead end.
  if (market === undefined) {
    // "Expired" and "the feed is down" are different facts and get different
    // copy. A NOT_FOUND from the detail endpoint is definitive — the engine
    // looked this id up and does not have it — whereas an error on both
    // sources means we simply could not ask.
    const expired     = detailSlice.error?.code === 'NOT_FOUND'
    const marketsDown = !expired && (marketsSlice.status === 'error' || detailSlice.status === 'error')
    return (
      <div className="flex flex-col" style={{ background: 'var(--probex-bg)' }}>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--probex-border)' }}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-base font-bold" style={{ color: 'var(--probex-text-primary)' }}>
                {marketsDown ? 'Live market data unavailable' : 'This market is no longer active'}
              </h1>
              <p className="text-xs mt-1 max-w-[62ch]" style={{ color: 'var(--probex-text-muted)' }}>
                {marketsDown
                  ? `The engine didn't respond (${detailSlice.error?.message ?? marketsSlice.error?.message ?? 'request failed'}), so current pricing and edge aren't available. Recorded history for this market is shown below.`
                  : "Polymarket's 5-minute Bitcoin markets rotate continuously — this one has closed or been replaced. Its recorded history is shown below."}
              </p>
            </div>
            <button onClick={() => router.push(ROUTES.MARKETS)} className="btn-secondary px-4 py-2 text-sm flex-shrink-0">
              Back to Markets
            </button>
          </div>
        </div>
        <MarketCharts marketId={marketId} />
      </div>
    )
  }

  const edge = edgeMap.get(market.id)

  return (
    // Same register as Markets, which this is the drill-down from.
    <ProvenanceScope detail="tooltip">
    <div className="flex flex-col" style={{ background: 'var(--probex-bg)' }}>
      <MarketHeader market={market} edge={edge} />

      {/* D-4. The engine's /api/health reports `api_access` unhealthy with
          "Market data stale (24623.8s old, 10 markets cached)", but /api/markets
          and /api/markets/:id both return those cached markets with no
          staleness field of their own — so a closed market renders with a live
          price and nothing says it has expired. `closes_at` IS on the wire, so
          this is derived from confirmed data, not inferred. See the backend
          handoff for the request to expose freshness metadata directly. */}
      {hasClosed && (
        <div
          className="mx-6 mt-4 flex items-start gap-2 px-3 py-2 rounded text-2xs"
          style={{
            background: 'var(--probex-warning-dim)',
            color:      'var(--probex-warning)',
            border:     '1px solid var(--probex-warning)',
          }}
          role="status"
        >
          <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: 'currentColor' }} aria-hidden="true" />
          <span>
            <strong className="font-semibold">This market has closed.</strong>{' '}
            Its scheduled close time has passed, so the prices below are the last
            recorded values rather than a tradeable quote. The engine is still
            returning it from its market cache.
          </span>
        </div>
      )}

      <div className="grid gap-0" style={{ gridTemplateColumns: 'minmax(0, 1fr) 320px' }}>
        <div className="min-w-0" style={{ borderRight: '1px solid var(--probex-border)' }}>
          <MarketCharts marketId={market.id} />
          <EngineThesisPanel market={market} edge={edge} />
          <MarketActivityFeed marketId={market.id} />
          <RelatedMarkets currentMarketId={market.id} segment={market.segment} onSelect={goToMarket} />
        </div>

        <div className="p-4">
          <AutoExecutionPanel edge={edge} />
        </div>
      </div>
    </div>
    </ProvenanceScope>
  )
}
