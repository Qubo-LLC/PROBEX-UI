'use client'

// LiveFeedConsole — V3 restoration of V1's LiveMarketsView (git 0e3833a4) on
// top of M4's truthful polling-based console. Real engine polling only — no
// simulated WebSocket (the mock stream stays permanently removed).
//
//   1. Feed status + BTC price stream  → genuinely sub-second /api/stats
//   2. Global stat pills               → live markets/edges counts +
//                                         Global Consensus (awaiting CE-1)
//   3. Ticker                          → real /api/events, not a fake stream
//   4. Full sortable market table      → shared MarketTable (Phase 2)
//   5. Edge alerts                     → shared EdgeTable (M6)
//
// Pause freezes what THIS VIEW shows — the engine keeps polling in the
// background regardless (ApplicationStateLoader is untouched).

import { useMemo, useRef, useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { useEnginePriceChart } from '@/config/hooks/useServices'
import { useEndpointAvailability } from '@/config/hooks/useEndpointAvailability'
import { useUIStore } from '@/store/uiStore'
import { useRouter } from 'next/navigation'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { MARKET_DETAIL_PATH } from '@/config/constants'
import { parseMarketRows } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PriceCard } from '@/components/shared/PriceCard'
import { EdgeTable } from '@/components/shared/EdgeTable'
import { AwaitingBackend } from '@/components/shared/AwaitingBackend'
import { MarketTable } from '@/components/markets/MarketTable'
import { LiveTicker } from './LiveTicker'
import { LivePauseControl } from './LivePauseControl'

export function LiveFeedConsole() {
  const router = useRouter()
  const setSort = useUIStore((s) => s.setMarketSort)
  const sortBy  = useUIStore((s) => s.marketSortBy)
  const sortDir = useUIStore((s) => s.marketSortDir)

  const liveStats   = useApplicationStore((s) => s.engine.stats)
  const liveMarkets = useApplicationStore((s) => s.engine.markets)
  const liveEdges   = useApplicationStore((s) => s.engine.edges)
  const liveChart   = useEnginePriceChart()
  const consensusGlobal = useEndpointAvailability(ENDPOINTS.consensus.global)

  // ── Pause: freeze what this view renders; the poll itself is untouched ──
  const [isPaused, setIsPaused] = useState(false)
  const frozenRef = useRef<{ stats: typeof liveStats; markets: typeof liveMarkets; edges: typeof liveEdges; chart: typeof liveChart } | null>(null)

  const togglePause = () => {
    if (!isPaused) frozenRef.current = { stats: liveStats, markets: liveMarkets, edges: liveEdges, chart: liveChart }
    setIsPaused((p) => !p)
  }

  const frozen  = isPaused ? frozenRef.current : null
  const stats   = frozen ? frozen.stats   : liveStats
  const markets = frozen ? frozen.markets : liveMarkets
  const edges   = frozen ? frozen.edges   : liveEdges
  const chart   = frozen ? frozen.chart   : liveChart

  const marketRows = useMemo(
    () => (markets.data ? parseMarketRows(markets.data) : null),
    [markets.data],
  )
  const edgeRows = useMemo(
    () => (edges.data ? parseEdgeRows(edges.data) : null),
    [edges.data],
  )
  const edgeMap = useMemo(
    () => (edges.data ? toEdgeRowMap(parseEdgeRows(edges.data)) : new Map<string, EdgeRow>()),
    [edges.data],
  )

  const sortedMarkets = useMemo(() => {
    if (marketRows?.kind !== 'rows') return []
    const mult = sortDir === 'asc' ? 1 : -1
    return [...marketRows.rows].sort((a, b) => {
      switch (sortBy) {
        case 'probability': return mult * ((a.probability ?? 0) - (b.probability ?? 0))
        case 'liquidity':   return mult * ((a.liquidity ?? 0) - (b.liquidity ?? 0))
        case 'closesAt':    return mult * ((a.closesAt ?? 0) - (b.closesAt ?? 0))
        case 'volume24h':
        default:            return mult * ((a.volume24h ?? 0) - (b.volume24h ?? 0))
      }
    })
  }, [marketRows, sortBy, sortDir])

  const feed = stats.data
    ? { connected: stats.data.feedConnected, latencyMs: stats.data.feedLatencyMs }
    : null

  return (
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader
        title="Live Feed"
        subtitle="Real-time engine data — price stream, current market cycle, edge alerts"
        actions={<LivePauseControl isPaused={isPaused} onToggle={togglePause} />}
      />

      {/* Global stat pills */}
      <div className="flex items-center gap-6 flex-wrap px-1">
        {!consensusGlobal.available && (
          <AwaitingBackend bare layout="inline" title="Global Consensus" description="Platform-wide sentiment" endpoint="CE-1" />
        )}
        <StatPill label="Markets" value={markets.data ? String(markets.data.count) : '—'} />
        <StatPill label="Active Edges" value={edges.data ? String(edges.data.count) : '—'} />
        {feed && (
          <span className="flex items-center gap-1.5 text-xs tabular-nums ml-auto" style={{ color: 'var(--probex-text-muted)' }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: feed.connected ? 'var(--probex-positive)' : 'var(--probex-negative)' }} aria-hidden="true" />
            {feed.connected ? `Feed live · ${Math.round(feed.latencyMs)}ms` : 'Feed disconnected'}
          </span>
        )}
      </div>

      {/* Ticker */}
      <LiveTicker />

      {/* Price stream */}
      {chart.data ? (
        <PriceCard chart={chart.data} feed={feed} />
      ) : chart.status === 'error' ? (
        <ErrorState title="Price stream unavailable" description={chart.error?.message ?? 'The /api/price-history endpoint did not respond.'} fullPage={false} />
      ) : null}

      {/* Current market cycle */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>
            Current Market Cycle{markets.data && markets.data.count > 0 ? ` (${markets.data.count})` : ''}
          </h2>
          <div className="flex items-center gap-1.5 text-2xs">
            <span style={{ color: 'var(--probex-text-muted)' }}>Sort:</span>
            {(['volume24h', 'probability', 'liquidity', 'closesAt'] as const).map((field) => (
              <button
                key={field}
                onClick={() => setSort(field, sortBy === field && sortDir === 'desc' ? 'asc' : 'desc')}
                className="px-1.5 py-0.5 rounded cursor-pointer focus-ring"
                style={{ color: sortBy === field ? 'var(--probex-primary)' : 'var(--probex-text-muted)', fontWeight: sortBy === field ? 700 : 500 }}
              >
                {field === 'volume24h' ? 'Volume' : field === 'probability' ? 'Probability' : field === 'liquidity' ? 'Liquidity' : 'Closing'}
                {sortBy === field && (sortDir === 'desc' ? ' ↓' : ' ↑')}
              </button>
            ))}
          </div>
        </div>

        {markets.status === 'loading' && (
          <p className="text-xs py-2" style={{ color: 'var(--probex-text-disabled)' }}>
            Waiting for /api/markets — the engine’s market fetcher can take several seconds under rate limiting.
          </p>
        )}

        {markets.status === 'error' && (
          <ErrorState title="Market cycle unavailable" description={markets.error?.message ?? 'The /api/markets endpoint did not respond.'} fullPage={false} />
        )}

        {marketRows?.kind === 'unrecognized' && (
          <Card>
            <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
              The engine reports {marketRows.count} active market{marketRows.count === 1 ? '' : 's'}, but the
              item format doesn’t match the agreed schema yet — rows are not displayed to avoid showing wrong
              values. (Backend contract P0-01.)
            </p>
          </Card>
        )}

        {marketRows?.kind === 'empty' && (
          <EmptyState
            size="sm"
            title="No qualifying markets this cycle"
            description="The engine scans Polymarket 5-minute BTC markets continuously. Candidates appear here the moment the fetcher returns them."
          />
        )}

        {marketRows?.kind === 'rows' && (
          <MarketTable markets={sortedMarkets} edgeMap={edgeMap} onSelect={(id) => router.push(MARKET_DETAIL_PATH(id))} dense />
        )}
      </section>

      {/* Edge alerts */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>
          Edge Alerts{edges.data && edges.data.count > 0 ? ` (${edges.data.count})` : ''}
        </h2>
        {edges.status === 'error' ? (
          <ErrorState title="Edges unavailable" description={edges.error?.message ?? 'The /api/edges endpoint did not respond.'} fullPage={false} />
        ) : edgeRows ? (
          <EdgeTable
            result={edgeRows}
            emptyTitle="No active edge alerts"
            emptyDescription="When the engine detects a mispricing worth trading, the edge appears here in the same 5-second polling cycle."
          />
        ) : null}
      </section>
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="t-label">{label}</span>
      <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{value}</span>
    </div>
  )
}
