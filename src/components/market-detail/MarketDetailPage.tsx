'use client'

// MarketDetailPage — one market, as an investigation.
//
//   MARKET          header: the question, the window, whether it still exists
//   ENGINE VIEW     verdict · YES price · engine edge · edge required · book
//   THE BOOK        the engine's position and settled trades on this id
//   ACTIVITY        the events that name this id (shared EventStream)
//   HISTORY         the recorded snapshots, as a path and as charts
//   OTHER MARKETS   the rest of the cycle, for orientation
//
// ─── Sources, and what each survives ─────────────────────────────────────────
// /api/markets/:id is the market's own record and the primary source — but
// every market here rotates out within minutes, after which it answers 404.
// The previous page treated that as a dead end: "no longer active", a back
// button, and the charts. Everything else the engine knows about the market —
// its question (in the history), the trade it recorded (in the ledger), the
// events that name it — was in the store and not shown. An expired market is
// the COMMON case on this page, and it is where the investigation flow from
// Positions and Portfolio lands. So the page now composes from every record
// that names the id, and the header says which of them is speaking.
//
// The scanned-markets envelope (/api/markets) remains a fallback for a market
// the detail call cannot fetch but the engine is still scanning. A 404 is
// phrased as expiry rather than error: it is frequently true and never a bug.

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { useMarketDetail } from '@/config/hooks/useServices'
import { useMarketHistory } from '@/config/hooks/useMarketHistory'
import { parseMarketRows, marketDetailToRow } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { parsePositionRows } from '@/lib/mappers/positions'
import { identityReading, marketBook } from '@/lib/display/marketDetail'
import { MARKET_DETAIL_PATH } from '@/config/constants'
import { Skeleton } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'
import { MarketHeader } from './MarketHeader'
import { MarketEngineView } from './MarketEngineView'
import { MarketBook } from './MarketBook'
import { MarketActivityFeed } from './MarketActivityFeed'
import { MarketCharts } from './MarketCharts'
import { RelatedMarkets } from './RelatedMarkets'

export function MarketDetailPage({ marketId }: { marketId: string }) {
  const router = useRouter()
  const marketsSlice   = useApplicationStore((s) => s.engine.markets)
  const edgesSlice     = useApplicationStore((s) => s.engine.edges)
  const survivalSlice  = useApplicationStore((s) => s.engine.survival)
  const statsSlice     = useApplicationStore((s) => s.engine.stats)
  const positionsSlice = useApplicationStore((s) => s.engine.positions)
  const ledgerSlice    = useApplicationStore((s) => s.engine.tradesLedger)
  const historySlice   = useApplicationStore((s) => s.engine.positionsHistory)

  // Primary source: the market's own endpoint. Secondary: its recorded history,
  // which outlives it.
  const detailSlice = useMarketDetail(marketId)
  const history = useMarketHistory(marketId)

  const marketRows = useMemo(() => {
    if (!marketsSlice.data) return null
    const parsed = parseMarketRows(marketsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [marketsSlice.data])

  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  // The engine's book on this id, once the records that hold it have answered.
  // Positions is required (an open position is the most current fact); the
  // ledger and the history back each other up, so either suffices for settled.
  const book = useMemo(() => {
    if (!positionsSlice.data) return null
    if (!ledgerSlice.data && !historySlice.data) return null
    const parsed = parsePositionRows(positionsSlice.data)
    const open = parsed.kind === 'rows' ? parsed.rows : []
    return marketBook(marketId, open, ledgerSlice.data?.ledger ?? [], historySlice.data?.history ?? [])
  }, [marketId, positionsSlice.data, ledgerSlice.data, historySlice.data])

  // The detail endpoint wins when it answered; the scanned-markets envelope is
  // the fallback. Both project onto the same MarketRow.
  const detailRow = detailSlice.data ? marketDetailToRow(detailSlice.data.market) : undefined
  const market    = detailRow ?? marketRows?.find((m) => m.id === marketId)
  const marketSlice = detailRow ? detailSlice : marketsSlice

  // "Expired" is the detail endpoint's own verdict (404 — it looked the id up
  // and does not have it). An error on both sources is a different fact: we
  // could not ask.
  const expired = market === undefined && detailSlice.error?.code === 'NOT_FOUND'
  const unreachable = market === undefined && !expired
    && detailSlice.status === 'error' && (marketsSlice.status === 'error' || marketsSlice.data !== null)
  const resolving = market === undefined && !expired && !unreachable

  const identity = identityReading(market, history.status === 'ready' ? history.data.history : [])
  const btcNow = statsSlice.data?.currentPrice ?? null

  return (
    <ProvenanceScope detail="tooltip">
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      {resolving ? (
        <header className="flex flex-col gap-3" aria-busy="true">
          <Skeleton height={10} width={70} />
          <Skeleton height={22} width="55%" />
          <div className="flex items-center gap-3">
            <Skeleton height={22} width={120} />
            <Skeleton height={22} width={90} />
          </div>
        </header>
      ) : (
        <MarketHeader marketId={marketId} identity={identity} market={market} expired={expired} />
      )}

      {unreachable && (
        <ErrorState
          title="The market record did not answer"
          description={`${detailSlice.error?.message ?? 'No response from /api/markets/:id.'} Current pricing and the engine's edge are unknown; what the engine recorded about this market is still shown below.`}
          fullPage={false}
        />
      )}

      {!resolving && (
        <MarketEngineView
          market={market}
          expired={expired}
          marketSlice={marketSlice}
          edge={market !== undefined ? edgeMap.get(market.id) : edgeMap.get(marketId)}
          edges={edgesSlice}
          survival={survivalSlice}
          btcNow={btcNow}
          book={book}
        />
      )}

      <MarketBook book={book} ledger={ledgerSlice} positions={positionsSlice} />
      <MarketActivityFeed marketId={marketId} />
      <MarketCharts history={history} />

      <RelatedMarkets currentMarketId={marketId} segment={market?.segment ?? null} onSelect={(id) => router.push(MARKET_DETAIL_PATH(id))} />
    </div>
    </ProvenanceScope>
  )
}
