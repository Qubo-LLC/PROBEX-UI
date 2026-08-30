'use client'

// LiveFeedConsole — the engine's operational stream.
//
// Primary question: WHAT IS THE ENGINE OBSERVING AND DOING RIGHT NOW?
//
// ─── What changed, and why ───────────────────────────────────────────────────
// This page previously answered a different question than its name promised. It
// showed a price card, a market table and an edge table — all useful, all also
// present on Markets and Strategy — plus a scrolling marquee of event text with
// the reasoning stripped out. The one thing a live console must have, a
// chronological record of what the engine did, was missing; the full event
// stream lived on System › Event Log, two clicks away.
//
// So the stream is now the spine of the page, rendered with the shared
// EventStream component (same rows System uses), and the marquee is gone. A
// permanently scrolling ribbon is decorative motion by definition: it moves at
// the same speed whether the engine is trading or unreachable.
//
// ─── Honesty ─────────────────────────────────────────────────────────────────
// The vitals strip used to print "Feed live · 366ms" unconditionally. In
// synthetic mode that was a live claim over generated numbers, on a route that
// carried no provenance badges at all. Both are fixed: the label derives from
// the shared system-state model, and every section declares its source.
//
// Pause freezes what THIS VIEW shows — the engine keeps polling in the
// background regardless (ApplicationStateLoader is untouched).

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { useEnginePriceChart } from '@/config/hooks/useServices'
import { useSystemStatus } from '@/config/hooks/useSystemStatus'
import { useUIStore } from '@/store/uiStore'
import { MARKET_DETAIL_PATH } from '@/config/constants'
import { parseMarketRows } from '@/lib/mappers/markets'
import { parseEventRows, dedupeEventRows } from '@/lib/mappers/events'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PriceCard } from '@/components/shared/PriceCard'
import { EdgeTable } from '@/components/shared/EdgeTable'
import { EventStream } from '@/components/shared/EventStream'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { MarketTable } from '@/components/markets/MarketTable'
import { LivePauseControl } from './LivePauseControl'

/** How much of the stream the console shows. The full log, with type and
 *  severity filters, remains System › Event Log — this is the live tail. */
const STREAM_ROWS = 14

export function LiveFeedConsole() {
  const router = useRouter()
  const setSort = useUIStore((s) => s.setMarketSort)
  const sortBy = useUIStore((s) => s.marketSortBy)
  const sortDir = useUIStore((s) => s.marketSortDir)

  const status = useSystemStatus()

  const liveStats = useApplicationStore((s) => s.engine.stats)
  const liveMarkets = useApplicationStore((s) => s.engine.markets)
  const liveEdges = useApplicationStore((s) => s.engine.edges)
  const liveEvents = useApplicationStore((s) => s.engine.events)
  const liveChart = useEnginePriceChart()

  // ── Pause: freeze what this view renders; the poll itself is untouched ──
  const [isPaused, setIsPaused] = useState(false)
  const frozenRef = useRef<{
    stats: typeof liveStats
    markets: typeof liveMarkets
    edges: typeof liveEdges
    events: typeof liveEvents
    chart: typeof liveChart
  } | null>(null)

  const togglePause = () => {
    if (!isPaused) {
      frozenRef.current = { stats: liveStats, markets: liveMarkets, edges: liveEdges, events: liveEvents, chart: liveChart }
    }
    setIsPaused((p) => !p)
  }

  const frozen = isPaused ? frozenRef.current : null
  const stats = frozen ? frozen.stats : liveStats
  const markets = frozen ? frozen.markets : liveMarkets
  const edges = frozen ? frozen.edges : liveEdges
  const events = frozen ? frozen.events : liveEvents
  const chart = frozen ? frozen.chart : liveChart

  const marketRows = useMemo(() => (markets.data ? parseMarketRows(markets.data) : null), [markets.data])
  const edgeRows = useMemo(() => (edges.data ? parseEdgeRows(edges.data) : null), [edges.data])
  const edgeMap = useMemo(
    () => (edges.data ? toEdgeRowMap(parseEdgeRows(edges.data)) : new Map<string, EdgeRow>()),
    [edges.data],
  )

  const streamRows = useMemo(() => {
    if (!events.data) return null
    const parsed = parseEventRows(events.data)
    if (parsed.kind !== 'rows') return []
    const sorted = [...parsed.rows].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    return dedupeEventRows(sorted).slice(0, STREAM_ROWS)
  }, [events.data])

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

  const feed = stats.data ? { connected: stats.data.feedConnected, latencyMs: stats.data.feedLatencyMs } : null

  return (
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader
        title="Live Feed"
        subtitle="The engine's operational stream — what it is observing, deciding, and executing right now"
        actions={<LivePauseControl isPaused={isPaused} onToggle={togglePause} />}
      />

      {/* Vitals strip. Compact by design: these are context for the stream
          below, not the point of the page. */}
      <div
        className="flex items-center gap-5 flex-wrap rounded-lg px-4 py-2.5"
        style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}
      >
        <Vital label="Markets" value={markets.data ? String(markets.data.count) : '—'} />
        <Vital label="Active edges" value={edges.data ? String(edges.data.count) : '—'} />
        <Vital label="Events" value={events.data ? String(events.data.count) : '—'} />

        {feed && (
          <span
            className="flex items-center gap-1.5 text-2xs tabular-nums"
            style={{ color: 'var(--probex-text-muted)' }}
            title={
              status.dataIsSynthetic
                ? 'Latency figure is generated — no feed is connected'
                : feed.connected ? 'Price feed connected' : 'Price feed disconnected'
            }
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: feed.connected ? 'var(--probex-positive)' : 'var(--probex-negative)' }}
              aria-hidden="true"
            />
            {/* Was "Feed live · 366ms" unconditionally — a live claim printed
                over generated numbers whenever the engine was unreachable. */}
            {!feed.connected ? 'Feed disconnected'
              : status.dataIsSynthetic ? `Feed simulated · ${Math.round(feed.latencyMs)}ms`
              : `Feed live · ${Math.round(feed.latencyMs)}ms`}
          </span>
        )}

        {isPaused && (
          <span className="text-2xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-warning)' }}>
            View frozen
          </span>
        )}

        <span className="ml-auto">
          <ProvenanceBadge provenance="live" detail="/api/stats" />
        </span>
      </div>

      {/* ── 1 · The stream — the reason this page exists ─────────────────── */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading
          title="Engine Activity"
          subtitle="Newest first — repeated events are collapsed"
          {...(events.data ? { count: events.data.count } : {})}
          actions={<ProvenanceBadge provenance="live" detail="/api/events" />}
        />

        {events.status === 'error' ? (
          <ErrorState
            title="Event stream unavailable"
            description={events.error?.message ?? 'The /api/events endpoint did not respond.'}
            fullPage={false}
          />
        ) : streamRows === null ? (
          <div className="flex flex-col gap-1.5" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : streamRows.length === 0 ? (
          <EmptyState
            size="sm"
            title="The engine has not logged activity yet"
            description="Edge detections, trades, resolutions and health changes stream here as they happen. The log resets when the engine restarts."
          />
        ) : (
          <>
            <EventStream rows={streamRows} />
            <p className="t-helper">
              Showing the {streamRows.length} most recent · full history with filters in System › Event Log
            </p>
          </>
        )}
      </section>

      {/* ── 2 · Price stream ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading
          title="Price Stream"
          actions={<ProvenanceBadge provenance="live" detail="/api/price-history" />}
        />
        {chart.data ? (
          <PriceCard chart={chart.data} feed={feed} />
        ) : chart.status === 'error' ? (
          <ErrorState
            title="Price stream unavailable"
            description={chart.error?.message ?? 'The /api/price-history endpoint did not respond.'}
            fullPage={false}
          />
        ) : (
          <div className="skeleton rounded-lg" style={{ height: 200 }} />
        )}
      </section>

      {/* ── 3 · Current market cycle ─────────────────────────────────────── */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading
          title="Current Market Cycle"
          {...(markets.data ? { count: markets.data.count } : {})}
          actions={
            <div className="flex items-center gap-1.5 text-2xs">
              <span style={{ color: 'var(--probex-text-muted)' }}>Sort</span>
              {(['volume24h', 'probability', 'liquidity', 'closesAt'] as const).map((field) => (
                <button
                  key={field}
                  onClick={() => setSort(field, sortBy === field && sortDir === 'desc' ? 'asc' : 'desc')}
                  className="px-1.5 py-0.5 rounded cursor-pointer focus-ring"
                  style={{
                    color: sortBy === field ? 'var(--probex-primary)' : 'var(--probex-text-muted)',
                    fontWeight: sortBy === field ? 700 : 500,
                  }}
                >
                  {field === 'volume24h' ? 'Volume' : field === 'probability' ? 'Probability' : field === 'liquidity' ? 'Liquidity' : 'Closing'}
                  {sortBy === field && (sortDir === 'desc' ? ' ↓' : ' ↑')}
                </button>
              ))}
            </div>
          }
        />

        {markets.status === 'loading' && (
          <p className="t-helper py-1">
            Waiting for /api/markets — the engine&rsquo;s market fetcher can take several seconds under rate limiting.
          </p>
        )}

        {markets.status === 'error' && (
          <ErrorState
            title="Market cycle unavailable"
            description={markets.error?.message ?? 'The /api/markets endpoint did not respond.'}
            fullPage={false}
          />
        )}

        {marketRows?.kind === 'unrecognized' && (
          <Card>
            <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
              The engine reports {marketRows.count} active market{marketRows.count === 1 ? '' : 's'}, but the
              item format doesn&rsquo;t match the agreed schema yet — rows are not displayed to avoid showing wrong
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

      {/* ── 4 · Edge alerts ──────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading
          title="Edge Alerts"
          {...(edges.data ? { count: edges.data.count } : {})}
          actions={<ProvenanceBadge provenance="live" detail="/api/edges" />}
        />
        {edges.status === 'error' ? (
          <ErrorState
            title="Edges unavailable"
            description={edges.error?.message ?? 'The /api/edges endpoint did not respond.'}
            fullPage={false}
          />
        ) : edgeRows ? (
          <EdgeTable
            result={edgeRows}
            emptyTitle="No active edge alerts"
            emptyDescription="When the engine detects a mispricing worth trading, the edge appears here in the same polling cycle."
          />
        ) : null}
      </section>
    </div>
  )
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="t-label">{label}</span>
      <span className="t-metric-sm">{value}</span>
    </span>
  )
}
