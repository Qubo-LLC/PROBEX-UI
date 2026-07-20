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
import { parsePositionRows, type PositionRow } from '@/lib/mappers/positions'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { formatSignedCurrency } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard }   from '@/components/ui/StatCard'
import { Card }       from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PositionFilters, type Side, type PnlState } from './PositionFilters'
import { PositionTable } from './PositionTable'
import { PositionDetail } from './PositionDetail'
import { SettledPositions } from './SettledPositions'
import type { BitcoinSegment } from '@/types/market'

export function PositionsConsole() {
  const positions = useApplicationStore((s) => s.engine.positions)
  const execution = useApplicationStore((s) => s.engine.executionStatus)
  const edgesSlice = useApplicationStore((s) => s.engine.edges)

  const [search, setSearch]   = useState('')
  const [side, setSide]       = useState<Side | null>(null)
  const [segment, setSegment] = useState<BitcoinSegment | null>(null)
  const [pnlState, setPnl]    = useState<PnlState | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const pos = positions.data
  const ex  = execution.data

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

  const selectedPosition = filteredRows.find((p) => p.id === selectedId)

  return (
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader
        title="Positions"
        subtitle="Capital currently deployed by the engine, and how resolutions have gone"
      />

      {positions.status === 'loading' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['Open Positions', 'Unrealized P&L', 'Closed', 'Resolutions'].map((label) => (
            <StatCard key={label} label={label} value="" isLoading />
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
          {/* Summary vitals — envelope + execution truth */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Open Positions"
              value={String(pos.count)}
              deltaLabel={pos.count === 0 ? 'no capital deployed' : 'currently held'}
            />
            <StatCard
              label="Unrealized P&L"
              value={formatSignedCurrency(pos.totalUnrealizedPnl)}
              valueColor={
                pos.totalUnrealizedPnl > 0 ? 'var(--probex-positive)'
                : pos.totalUnrealizedPnl < 0 ? 'var(--probex-negative)' : undefined
              }
              deltaLabel="across open positions"
            />
            {ex && (
              <StatCard
                label="Closed"
                value={String(ex.closedPositions)}
                deltaLabel="this session"
              />
            )}
            {ex && (
              <StatCard
                label="Resolutions"
                value={
                  ex.resolutionStats.totalResolved > 0
                    ? `${ex.resolutionStats.wins}W / ${ex.resolutionStats.losses}L`
                    : ex.resolutionStats.isRunning ? 'Tracking' : 'Stopped'
                }
                valueColor={
                  ex.resolutionStats.totalResolved > 0
                    ? (ex.resolutionStats.wins >= ex.resolutionStats.losses ? 'var(--probex-positive)' : 'var(--probex-negative)')
                    : undefined
                }
                deltaLabel={
                  ex.resolutionStats.totalResolved > 0
                    ? `${ex.resolutionStats.autoClosed} auto-closed`
                    : `${ex.resolutionStats.trackedPositions} tracked`
                }
              />
            )}
          </div>

          {/* Open positions: filters + table + detail panel */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>
              Open Positions
            </h2>

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
                  segment={segment} onSegmentChange={setSegment}
                  pnlState={pnlState} onPnlChange={setPnl}
                />

                {filteredRows.length === 0 ? (
                  <EmptyState size="sm" title="No positions match your filters" description="Clear a filter to see more results." />
                ) : (
                  <PositionTable positions={filteredRows} edgeMap={edgeMap} selectedId={selectedId} onSelectRow={(id) => setSelectedId(id === selectedId ? null : id)} dense />
                )}

                {selectedPosition && (
                  <PositionDetail
                    position={selectedPosition}
                    edge={selectedPosition.marketId ? edgeMap.get(selectedPosition.marketId) : undefined}
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
  )
}
