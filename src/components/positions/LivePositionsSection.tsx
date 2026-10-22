'use client'

// LivePositionsSection — revives PositionTable + PositionFilters (orphaned
// when the Positions route was repointed to SleevesPage during the sleeve
// pivot; the data layer they depend on — the `positions` store slice — was
// never removed and is still polled by ApplicationStateLoader). Financial
// Performance & Trade Transparency redesign, Phase 4.
//
// Simulated: the `positions` slice now reads the engine's sleeve book
// (/api/sleeves/positions), not live order flow — see the corrected comment
// in PositionTable.tsx. This section shows mark price, unrealized P&L and
// edge alignment per position, none of which SleevesPage's own inline table
// (below, unedited) carries; the two are not fully redundant.

import { useMemo, useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parsePositionRows } from '@/lib/mappers/positions'
import { parseEdgeRows } from '@/lib/mappers/edges'
import { PositionTable } from './PositionTable'
import { PositionFilters, type Side, type PnlState } from './PositionFilters'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

export function LivePositionsSection() {
  const positionsSlice = useApplicationStore((s) => s.engine.positions)
  const edgesSlice = useApplicationStore((s) => s.engine.edges)

  const [search, setSearch] = useState('')
  const [side, setSide] = useState<Side | null>(null)
  const [segment, setSegment] = useState<string | null>(null)
  const [pnlState, setPnlState] = useState<PnlState | null>(null)

  const parsed = positionsSlice.data ? parsePositionRows(positionsSlice.data) : null
  const allRows = parsed?.kind === 'rows' ? parsed.rows : []

  const edgeMap = useMemo(() => {
    const edgeParsed = edgesSlice.data ? parseEdgeRows(edgesSlice.data) : null
    const rows = edgeParsed?.kind === 'rows' ? edgeParsed.rows : []
    return new Map(rows.filter((e) => e.marketId !== null).map((e) => [e.marketId as string, e]))
  }, [edgesSlice.data])

  const segmentOptions = useMemo(
    () => [...new Set(allRows.map((r) => r.segment).filter((s): s is string => s !== null))],
    [allRows],
  )

  const filtered = useMemo(() => {
    let rows = allRows
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((r) => (r.marketTitle?.toLowerCase().includes(q) ?? false) || r.marketId?.toLowerCase().includes(q))
    }
    if (side) rows = rows.filter((r) => r.side === side)
    if (segment) rows = rows.filter((r) => r.segment === segment)
    if (pnlState) rows = rows.filter((r) => (pnlState === 'profit' ? (r.unrealizedPnl ?? 0) > 0 : (r.unrealizedPnl ?? 0) < 0))
    return rows
  }, [allRows, search, side, segment, pnlState])

  if (positionsSlice.status === 'loading') {
    return <p className="t-description">Loading positions…</p>
  }
  if (positionsSlice.status === 'error') {
    return <ErrorState title="Positions unavailable" description={positionsSlice.error?.message ?? 'The engine did not answer.'} fullPage={false} />
  }
  if (parsed?.kind === 'unrecognized') {
    return (
      <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>
        The engine reports {parsed.count} open position{parsed.count === 1 ? '' : 's'}, but the item format doesn&apos;t
        match the agreed schema — withheld rather than shown with wrong values.
      </p>
    )
  }
  if (allRows.length === 0) {
    return <EmptyState size="sm" title="No open positions" description="The sleeve book currently holds nothing open." />
  }

  return (
    <div className="flex flex-col gap-3">
      <PositionFilters
        search={search} onSearchChange={setSearch}
        side={side} onSideChange={setSide}
        segment={segment} onSegmentChange={setSegment}
        segmentOptions={segmentOptions}
        pnlState={pnlState} onPnlChange={setPnlState}
      />
      {filtered.length === 0 ? (
        <EmptyState size="sm" title="No positions match these filters" description="Clear a filter to see more." />
      ) : (
        <PositionTable positions={filtered} edgeMap={edgeMap} stale={positionsSlice.isStale} />
      )}
    </div>
  )
}
