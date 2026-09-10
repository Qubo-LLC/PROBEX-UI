'use client'

// PositionsConsole — the engine's open positions (/positions).
//
// Sources: /api/positions (envelope + items), /api/execution/status (closed
// count + resolution record), /api/edges (live edge alignment per position).
//
// V3 Phase 4 enrichment: restores V1's filters (search/side/segment/P&L),
// a click-to-expand detail panel (market link + live Edge Alignment, not
// V1's fabricated consensus snapshot/entry thesis), and the Settled
// Positions section as a full table shell with real aggregate win/loss
// counts and honestly-pending per-row ledger data (P2-02).
//
// Truth rules unchanged from M4/M6: envelope figures render even while item
// schemas are unconfirmed; unrecognized items are reported, not guessed at.

import { useMemo, useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'
import { parseMarketRows } from '@/lib/mappers/markets'
import { parsePositionRows, type PositionRow } from '@/lib/mappers/positions'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { formatSignedCurrency } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Panel, Focal, Row, RowGroup, PanelPending } from '@/components/ui/Panel'
import { Card }       from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PositionFilters, type Side, type PnlState } from './PositionFilters'
import { PositionTable } from './PositionTable'
import { PositionDetail } from './PositionDetail'
import { SettledPositions } from './SettledPositions'

export function PositionsConsole() {
  const positions = useApplicationStore((s) => s.engine.positions)
  const execution = useApplicationStore((s) => s.engine.executionStatus)
  const edgesSlice = useApplicationStore((s) => s.engine.edges)
  // The persisted ledger — see the Realized panel below for why.
  const portfolioSlice = useApplicationStore((s) => s.engine.portfolio)
  // Already polled for the Markets domain; joined here for market close state.
  const marketsSlice = useApplicationStore((s) => s.engine.markets)

  const [search, setSearch]   = useState('')
  const [side, setSide]       = useState<Side | null>(null)
  // Segment is whatever the wire says (`asset_category`), not a fixed union —
  // the old BitcoinSegment vocabulary never matched a single live value.
  const [segment, setSegment] = useState<string | null>(null)
  const [pnlState, setPnl]    = useState<PnlState | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const pos = positions.data
  const ex  = execution.data
  const pf  = portfolioSlice.status === 'success' ? portfolioSlice.data : null

  // marketId → closes_at, for the position rows. The engine's market cache
  // holds only what it is currently tracking, so this map legitimately misses
  // older markets; positionCloseState returns 'unknown' for those rather than
  // inventing a resolution time from duration_minutes.
  const closesAtByMarketId = useMemo(() => {
    const m = new Map<string, number | null>()
    if (!marketsSlice.data) return m
    const parsed = parseMarketRows(marketsSlice.data)
    if (parsed.kind !== 'rows') return m
    for (const mk of parsed.rows) m.set(mk.id, mk.closesAt)
    return m
  }, [marketsSlice.data])

  const rows = useMemo(
    () => (pos ? parsePositionRows(pos) : null),
    [pos],
  )

  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  const filteredRows: PositionRow[] = useMemo(() => {
    if (rows?.kind !== 'rows') return []
    let result = rows.rows
    if (side) result = result.filter((p) => p.side === side)
    if (segment) result = result.filter((p) => p.segment === segment)
    if (pnlState) result = result.filter((p) => pnlState === 'profit' ? (p.unrealizedPnl ?? 0) >= 0 : (p.unrealizedPnl ?? 0) < 0)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((p) => (p.marketTitle ?? '').toLowerCase().includes(q))
    }
    return result
  }, [rows, side, segment, pnlState, search])

  // Filter options derived from the rows themselves, so a pill can never
  // offer a value that matches nothing.
  const segmentOptions = useMemo(() => {
    if (rows?.kind !== 'rows') return []
    const seen = new Set<string>()
    for (const p of rows.rows) if (p.segment !== null) seen.add(p.segment)
    return [...seen].sort()
  }, [rows])

  const selectedPosition = filteredRows.find((p) => p.id === selectedId)

  return (
    // Positions answers "what exposure does the engine have", not "which
    // endpoint served this row". Badges keep their word and move the path to
    // the tooltip and the accessible name.
    <ProvenanceScope detail="tooltip">
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader
        title="Positions"
        subtitle="Capital currently deployed by the engine, and how resolutions have gone"
      />

      {positions.status === 'loading' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {['Open Exposure', 'Resolution Record', 'Session'].map((label) => (
            <Panel key={label} title={label}>
              <PanelPending note="Awaiting position state." />
            </Panel>
          ))}
        </div>
      )}

      {positions.status === 'error' && (
        <ErrorState
          title="Positions unavailable"
          description={positions.error?.message ?? 'The /api/positions endpoint did not respond.'}
          fullPage={false}
        />
      )}

      {pos && (
        <>
          {/* Summary — envelope + execution truth.
              Was four StatCards holding one figure each; the resolution
              tracker in particular had three separate facts (record, tracked
              count, auto-closed) competing for a single `deltaLabel` line. */}
          <section aria-label="Exposure summary" className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Panel title="Open Exposure" provenance="live" source="/api/positions" slice={positions}>
              <Focal
                value={formatSignedCurrency(pos.totalUnrealizedPnl)}
                unit="unrealized"
                color={
                  pos.totalUnrealizedPnl > 0 ? 'var(--probex-positive)'
                  : pos.totalUnrealizedPnl < 0 ? 'var(--probex-negative)' : undefined
                }
                caption={
                  pos.count === 0
                    ? <span className="t-helper">No capital deployed right now.</span>
                    : undefined
                }
              />
              <RowGroup>
                <Row label="Positions held" value={`${pos.count}`} />
                <Row label="Closed this session" value={ex ? `${ex.closedPositions}` : '—'} title="Scoped to the current engine process — resets on restart" />
                <Row label="Account" value={pf ? pf.mode : ex ? ex.mode : '—'} color={(pf?.mode ?? ex?.mode) === 'live' ? 'var(--probex-negative)' : undefined} />
              </RowGroup>
            </Panel>

            {/* The resolution tracker genuinely IS per-process, so this panel
                keeps its source and instead says so. "No position has resolved
                yet this session" was true of the process and false of the
                account; only the missing word "session-scoped" made it read as
                a claim about the account. */}
            <Panel title="Resolution Record" provenance="live" source="/api/execution/status" slice={execution} subtitle="This engine process">
              {!ex ? (
                <PanelPending note="Awaiting the resolution tracker." />
              ) : (
                <>
                  <Focal
                    value={
                      ex.resolutionStats.totalResolved > 0
                        ? `${ex.resolutionStats.wins}W / ${ex.resolutionStats.losses}L`
                        : ex.resolutionStats.isRunning ? 'Tracking' : 'Stopped'
                    }
                    color={
                      ex.resolutionStats.totalResolved > 0
                        ? (ex.resolutionStats.wins >= ex.resolutionStats.losses ? 'var(--probex-positive)' : 'var(--probex-negative)')
                        : undefined
                    }
                    caption={
                      ex.resolutionStats.totalResolved === 0
                        ? <span className="t-helper">No position has resolved yet this session.</span>
                        : undefined
                    }
                  />
                  <RowGroup>
                    <Row label="Resolved" value={`${ex.resolutionStats.totalResolved}`} />
                    <Row label="Auto-closed" value={`${ex.resolutionStats.autoClosed}`} />
                    <Row label="Tracked" value={`${ex.resolutionStats.trackedPositions}`} />
                  </RowGroup>
                </>
              )}
            </Panel>

            {/* Realized reads the PERSISTED ledger. It previously read
                execution/status, which is process-scoped: it showed $0.00
                banked over 0 trades while this page's own Settled Positions
                table, three sections below, showed −$86.87 over 186. */}
            <Panel title="Realized" provenance="live" source="/api/portfolio" slice={portfolioSlice}>
              {!pf ? (
                <PanelPending note="Awaiting the trading record." />
              ) : (
                <>
                  <Focal
                    value={formatSignedCurrency(pf.pnl.realized)}
                    unit="banked"
                    color={
                      pf.pnl.realized > 0 ? 'var(--probex-positive)'
                      : pf.pnl.realized < 0 ? 'var(--probex-negative)' : undefined
                    }
                  />
                  <RowGroup>
                    <Row label="Trades" value={`${pf.performance.totalTrades}`} />
                    <Row label="Wins" value={`${pf.performance.wins}`} color={pf.performance.wins > 0 ? 'var(--probex-positive)' : undefined} />
                    <Row label="Losses" value={`${pf.performance.losses}`} color={pf.performance.losses > 0 ? 'var(--probex-negative)' : undefined} />
                  </RowGroup>
                </>
              )}
            </Panel>
          </section>

          {/* Open positions: filters + table + detail panel */}
          <section className="flex flex-col gap-3">
            <SectionHeading
              title="Open Positions"
              {...(rows?.kind === 'rows' ? { count: rows.rows.length } : {})}
            />

            {rows?.kind === 'empty' && (
              <EmptyState
                size="sm"
                title="No open positions"
                description="The engine has no capital deployed right now. Positions open automatically when an edge clears the strategy filter."
              />
            )}

            {rows?.kind === 'unrecognized' && (
              <Card>
                <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
                  The engine reports {rows.count} open position{rows.count === 1 ? '' : 's'},
                  but the item format doesn’t match the agreed schema yet — rows are not
                  displayed to avoid showing wrong values. (Backend contract P0-01.)
                </p>
              </Card>
            )}

            {rows?.kind === 'rows' && rows.rows.length > 0 && (
              <>
                <PositionFilters
                  search={search} onSearchChange={setSearch}
                  side={side} onSideChange={setSide}
                  segment={segment} onSegmentChange={setSegment} segmentOptions={segmentOptions}
                  pnlState={pnlState} onPnlChange={setPnl}
                />

                {filteredRows.length === 0 ? (
                  <EmptyState size="sm" title="No positions match your filters" description="Clear a filter to see more results." />
                ) : (
                  <PositionTable positions={filteredRows} edgeMap={edgeMap} closesAtByMarketId={closesAtByMarketId} selectedId={selectedId} onSelectRow={(id) => setSelectedId(id === selectedId ? null : id)} dense />
                )}

                {selectedPosition && (
                  <PositionDetail
                    position={selectedPosition}
                    edge={selectedPosition.marketId ? edgeMap.get(selectedPosition.marketId) : undefined}
                    closesAtByMarketId={closesAtByMarketId}
                    onClose={() => setSelectedId(null)}
                  />
                )}
              </>
            )}
          </section>

          {/* Settled history */}
          <SettledPositions />
        </>
      )}
    </div>
    </ProvenanceScope>
  )
}
