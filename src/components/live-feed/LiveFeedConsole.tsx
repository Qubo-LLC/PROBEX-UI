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
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { useEnginePriceChart } from '@/config/hooks/useServices'
import { useSystemStatus } from '@/config/hooks/useSystemStatus'
import { useMarketLookup } from '@/config/hooks/useMarketLookup'
import { useUIStore } from '@/store/uiStore'
import { MARKET_DETAIL_PATH, ROUTES } from '@/config/constants'
import { parseMarketRows } from '@/lib/mappers/markets'
import { parseEventRows, collapseConsecutiveRepeats, countByType, type EventRow } from '@/lib/mappers/events'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { latestActivity, isAlerting } from '@/lib/display/eventDisplay'
import { formatAge, deriveFreshness } from '@/lib/display/freshness'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PriceCard } from '@/components/shared/PriceCard'
import { EdgeTable } from '@/components/shared/EdgeTable'
import { EventStream, categoryFor } from '@/components/shared/EventStream'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { MarketTable } from '@/components/markets/MarketTable'
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'
import { LivePauseControl } from './LivePauseControl'

/** How much of the stream the console shows. The full log, with type and
 *  severity filters, remains System › Event Log — this is the live tail. */
const STREAM_ROWS = 14

/** Events poll at MEDIUM cadence (ApplicationStateLoader). Used only to
 *  derive the slice's own certainty; the engine's cycle is a separate clock. */
const EVENTS_POLL_MS = 5_000

/** Past this, the newest event is old enough that "live" would overstate what
 *  is on screen — the engine trades 5- and 15-minute windows, so a quarter
 *  hour without a single recorded event is a real quiet spell, not jitter. */
const QUIET_AFTER_MS = 15 * 60_000

/** Where a type's full history lives. The Event Log reads `type` from the
 *  URL, so this is the same filter the log's own chips apply. */
function eventLogPath(type?: string): string {
  return type === undefined ? `${ROUTES.SYSTEM}?view=events` : `${ROUTES.SYSTEM}?view=events&type=${encodeURIComponent(type)}`
}

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
  // Derived from the result above rather than parsing the same payload twice.
  // parseEdgeRows ran on every edges poll — once for the table, once for the
  // map — on a route that polls every 8 seconds.
  const edgeMap = useMemo(
    () => (edgeRows ? toEdgeRowMap(edgeRows) : new Map<string, EdgeRow>()),
    [edgeRows],
  )

  // ── The stream ────────────────────────────────────────────────────────────
  // parseEventRows already orders newest-first and parses the engine's naive
  // UTC clock correctly; this only collapses consecutive repeats and takes
  // the tail. `all` keeps the full window for the type tally and the
  // last-activity reading, which describe the log, not the fourteen rows.
  const stream = useMemo(() => {
    if (!events.data) return null
    const parsed = parseEventRows(events.data)
    if (parsed.kind === 'unrecognized') return { kind: 'unrecognized' as const, count: parsed.count }
    const all: EventRow[] = parsed.kind === 'rows' ? parsed.rows : []
    return {
      kind:     'rows' as const,
      all,
      rows:     collapseConsecutiveRepeats(all).slice(0, STREAM_ROWS),
      byType:   countByType(all),
      alerting: all.filter((r) => isAlerting(r.severity)).length,
      latest:   latestActivity(all),
    }
  }, [events.data])

  const lookup = useMarketLookup()

  // Two different clocks, stated separately: whether THIS SLICE is current
  // (did the last poll succeed?) and whether THE ENGINE has done anything
  // lately (how old is its newest event?). A healthy poll of a silent engine
  // is fresh AND quiet, and the page must say both.
  const eventsCertainty = certaintyFromSlice(events, EVENTS_POLL_MS)
  const eventsFreshness = deriveFreshness(events, EVENTS_POLL_MS)
  const latest = stream?.kind === 'rows' ? stream.latest : null
  const quiet  = latest !== null && latest.ageMs > QUIET_AFTER_MS

  const sortedMarkets = useMemo(() => {
    if (marketRows?.kind !== 'rows') return []
    const mult = sortDir === 'asc' ? 1 : -1
    return [...marketRows.rows].sort((a, b) => {
      switch (sortBy) {
        case 'probability': return mult * ((a.probability ?? 0) - (b.probability ?? 0))
        case 'closesAt':    return mult * ((a.closesAt ?? 0) - (b.closesAt ?? 0))
        case 'volume24h':
        default:            return mult * ((a.volume24h ?? 0) - (b.volume24h ?? 0))
      }
    })
  }, [marketRows, sortBy, sortDir])

  const feed = stats.data ? { connected: stats.data.feedConnected, latencyMs: stats.data.feedLatencyMs } : null

  return (
    // Live Feed answers "what is the engine doing right now", not "which
    // endpoint produced this" — the same register Overview declares. Every
    // badge keeps its claim and moves the path to its tooltip and accessible
    // name. System is unaffected: the scope defaults to inline.
    <ProvenanceScope detail="tooltip">
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader
        title="Live Feed"
        subtitle="The engine's operational stream — what it is observing, deciding, and executing right now"
        actions={<LivePauseControl isPaused={isPaused} onToggle={togglePause} />}
      />

      {/* ── The engine now ──────────────────────────────────────────────────
          One row of figures, no container: the answer to "is anything
          happening" leads, and every figure carries its own slice's
          certainty. "Last activity" is the age of the newest event the engine
          has recorded — a fresh poll of a silent engine is exactly the case
          this reading exists to show. */}
      <div className="flex items-start gap-x-8 gap-y-3 flex-wrap pb-1">
        {latest !== null ? (
          <Figure
            label="Last activity"
            size="sm"
            title="Age of the newest event in /api/events"
            footnote={
              <span className="t-metadata">
                {new Date(latest.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            }
            {...eventsCertainty}
          >
            {formatAge(latest.ageMs)}
          </Figure>
        ) : (
          <Figure
            label="Last activity"
            size="sm"
            certainty="absent"
            absentReason={events.status === 'error' ? 'the event log did not answer' : events.data ? 'no events recorded' : 'waiting for the event log'}
          >
            —
          </Figure>
        )}
        <Figure label="Markets scanned" size="sm" title="/api/markets" {...certaintyFromSlice(markets, 8_000)}>
          {markets.data ? String(markets.data.count) : '—'}
        </Figure>
        <Figure label="Active edges" size="sm" title="/api/edges" {...certaintyFromSlice(edges, 8_000)}>
          {edges.data ? String(edges.data.count) : '—'}
        </Figure>
        <Figure label="Events retained" size="sm" title="/api/events" footnote={events.data ? <span className="t-metadata">of {events.data.limit} kept</span> : undefined} {...eventsCertainty}>
          {events.data ? String(events.data.count) : '—'}
        </Figure>

        {feed && (
          <span
            className="flex items-center gap-1.5 text-2xs tabular-nums self-end pb-1 ml-auto"
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
              : `Feed connected · ${Math.round(feed.latencyMs)}ms`}
          </span>
        )}
      </div>

      {/* ── 1 · The stream — the reason this page exists ─────────────────── */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading
          title="Engine activity"
          subtitle="Newest first · consecutive repeats collapsed"
          actions={<ProvenanceBadge provenance="live" detail="/api/events" state={events} />}
        />

        {/* What kind of activity the window holds, each a link into the full
            log already filtered to that type. Counts are of EVENTS, not rows:
            they describe the retained window, not the tail below. */}
        {stream?.kind === 'rows' && stream.byType.length > 0 && (
          <p className="t-helper flex items-baseline gap-x-3 gap-y-1 flex-wrap">
            {stream.byType.map(({ type, count }) => {
              const cat = categoryFor(type)
              return (
                <Link
                  key={type}
                  href={eventLogPath(type)}
                  className="focus-ring rounded-sm inline-flex items-baseline gap-1 whitespace-nowrap"
                  title={`Open the event log filtered to ${cat.label.toLowerCase()} events`}
                >
                  <span className="tabular-nums font-semibold" style={{ color: 'var(--probex-text-secondary)' }}>{count}</span>
                  <span>{cat.label.toLowerCase()}{count === 1 ? '' : 's'}</span>
                </Link>
              )
            })}
            {stream.alerting > 0 && (
              <span style={{ color: 'var(--probex-warning)' }}>
                {stream.alerting} flagged by the engine
              </span>
            )}
          </p>
        )}

        {events.status === 'error' ? (
          // No data has ever arrived from /api/events. This says the LOG did
          // not answer — nothing here knows whether the engine is reachable,
          // and the page must not claim more than the one endpoint reports.
          <ErrorState
            title="The event log did not answer"
            description={`${events.error?.message ?? 'No response from /api/events.'} Whether the engine has done anything recently is unknown — not "nothing".`}
            fullPage={false}
          />
        ) : stream === null ? (
          <div className="flex flex-col gap-1.5" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : stream.kind === 'unrecognized' ? (
          <Card>
            <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
              The engine reports {stream.count} event{stream.count === 1 ? '' : 's'}, but the item
              format doesn&rsquo;t match the agreed schema — rows are withheld rather than shown
              with guessed fields.
            </p>
          </Card>
        ) : stream.rows.length === 0 ? (
          // The endpoint answered and holds nothing. That is a fact about the
          // retained window — "the log is empty" — not a claim that nothing
          // has ever happened.
          <EmptyState
            size="sm"
            title="The event log is empty"
            description={`The engine has no events in its retained window (up to ${events.data?.limit ?? '—'}). Edge detections, trades, resolutions and errors appear here as it records them.`}
          />
        ) : (
          <>
            {/* The feed is chronological and the endpoint is answering, but the
                newest event is old. Said above the rows, in the warning
                register, so yesterday's activity is not read as this
                morning's — the rows themselves carry their dates too. */}
            {quiet && latest !== null && (
              <p className="t-helper" style={{ color: 'var(--probex-warning)' }}>
                No activity recorded for {formatAge(latest.ageMs).replace(/ ago$/, '')} — the newest event is from{' '}
                {new Date(latest.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                {isPaused ? ' (View frozen.)' : ''}
              </p>
            )}
            {eventsFreshness.level === 'stale' && (
              <p className="t-helper" style={{ color: 'var(--probex-warning)' }}>
                Retained from the last successful refresh {eventsFreshness.ageLabel ?? ''} — the latest poll of /api/events failed
                {eventsFreshness.error ? ` (${eventsFreshness.error.message})` : ''}.
              </p>
            )}
            <EventStream rows={stream.rows} lookup={lookup} />
            {/* Rows are not events: a collapsed run stands for several. State
                what is on screen against what the window holds. */}
            <p className="t-helper">
              {stream.rows.length} row{stream.rows.length === 1 ? '' : 's'} of {stream.all.length} event{stream.all.length === 1 ? '' : 's'} retained
              {' · '}
              <Link href={eventLogPath()} className="focus-ring rounded-sm font-semibold" style={{ color: 'var(--probex-primary)' }}>
                full log with filters →
              </Link>
            </p>
          </>
        )}
      </section>

      {/* ── 2 · Price stream ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading
          title="Price Stream"
          actions={<ProvenanceBadge provenance="live" detail="/api/price-history" state={chart} />}
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
              {(['volume24h', 'probability', 'closesAt'] as const).map((field) => (
                <button
                  key={field}
                  onClick={() => setSort(field, sortBy === field && sortDir === 'desc' ? 'asc' : 'desc')}
                  // py-0.5 gave these a 20px hit box — under the 24px WCAG
                  // 2.5.8 AA minimum, on the only interactive controls in this
                  // section. py-1.5 takes them to 28px without changing the
                  // type size or the row it sits in.
                  className="px-2 py-1.5 rounded-sm cursor-pointer focus-ring"
                  style={{
                    color: sortBy === field ? 'var(--probex-primary)' : 'var(--probex-text-muted)',
                    fontWeight: sortBy === field ? 700 : 500,
                  }}
                >
                  {field === 'volume24h' ? 'Volume' : field === 'probability' ? 'YES price' : 'Closing'}
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
            description="The engine scans Polymarket 5- and 15-minute Up-or-Down windows (BTC, ETH and SOL have appeared). Candidates appear here the moment the fetcher returns them."
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
          actions={<ProvenanceBadge provenance="live" detail="/api/edges" state={edges} />}
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
    </ProvenanceScope>
  )
}
