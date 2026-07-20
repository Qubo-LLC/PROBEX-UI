'use client'

// PortfolioOverview — restored from V1 (git 0e3833a4). V1's secondary row was
// Top Exposure | Consensus Alignment (fabricated) | Performance Snapshot
// (historical win/loss aggregates that assume a settled-trade ledger we
// don't have). V3 keeps the 3-card shape but replaces the middle card with
// Edge Alignment — a genuinely live check of whether the engine's CURRENT
// edge for each open position's market still agrees with the side already
// taken — and repoints Performance Snapshot at the open positions that
// actually exist today (best/worst by live unrealized return).

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parsePositionRows, type PositionRow } from '@/lib/mappers/positions'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { formatCurrency } from '@/lib/utils'
import { segmentLabel } from '@/lib/display/market'
import { PortfolioMetrics } from './PortfolioMetrics'

const SEGMENT_COLORS = [
  'var(--probex-primary)', 'var(--probex-positive)', 'var(--probex-warning)',
  'var(--probex-yes)', 'var(--probex-no)', 'var(--probex-text-muted)',
]

export function PortfolioOverview() {
  const positionsSlice = useApplicationStore((s) => s.engine.positions)
  const edgesSlice = useApplicationStore((s) => s.engine.edges)

  const openPositions: PositionRow[] = useMemo(() => {
    if (!positionsSlice.data) return []
    const parsed = parsePositionRows(positionsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [positionsSlice.data])

  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  const totalValue = openPositions.reduce((s, p) => s + (p.currentValue ?? 0), 0)

  const exposure = useMemo(() => {
    const bySegment = new Map<string, number>()
    for (const p of openPositions) {
      const key = p.segment ?? 'unknown'
      bySegment.set(key, (bySegment.get(key) ?? 0) + (p.currentValue ?? 0))
    }
    return [...bySegment.entries()]
      .map(([segment, value]) => ({ segment, value, pct: totalValue > 0 ? value / totalValue : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
  }, [openPositions, totalValue])

  const alignment = useMemo(() => {
    let aligned = 0, contrarian = 0, noSignal = 0
    for (const p of openPositions) {
      const edge = p.marketId ? edgeMap.get(p.marketId) : undefined
      if (!edge) noSignal++
      else if (edge.direction === p.side) aligned++
      else contrarian++
    }
    return { aligned, contrarian, noSignal, total: openPositions.length }
  }, [openPositions, edgeMap])

  const alignedPct = alignment.total > 0 ? alignment.aligned / alignment.total : 0

  const snapshot = useMemo(() => {
    const withPct = openPositions.filter((p) => p.unrealizedPnlPct !== null)
    if (withPct.length === 0) return null
    const best = [...withPct].sort((a, b) => (b.unrealizedPnlPct ?? 0) - (a.unrealizedPnlPct ?? 0))[0]!
    const worst = [...withPct].sort((a, b) => (a.unrealizedPnlPct ?? 0) - (b.unrealizedPnlPct ?? 0))[0]!
    return { best, worst }
  }, [openPositions])

  const hasPositions = openPositions.length > 0

  return (
    <div className="flex flex-col gap-4">
      <PortfolioMetrics />

      {/* Phase 6A: one shared note instead of three cards each repeating
         "no open positions" — the individual cards fall back to a plain
         dash once this note has already said why. */}
      {!hasPositions && (
        <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
          No open positions right now — exposure, edge alignment, and performance below populate the moment the engine deploys capital.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Top Exposure */}
        <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
          <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>Top Exposure</h3>
          {exposure.length === 0 ? (
            <span className="text-xl font-bold" style={{ color: 'var(--probex-text-disabled)' }}>—</span>
          ) : (
            <div className="flex flex-col gap-2">
              {exposure.map((slice, i) => (
                <div key={slice.segment} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} aria-hidden="true" />
                  <span className="text-xs flex-1 truncate" style={{ color: 'var(--probex-text-secondary)' }}>{segmentLabel(slice.segment) ?? 'Unknown segment'}</span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{Math.round(slice.pct * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edge Alignment — replaces V1's fabricated Consensus Alignment */}
        <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-2xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--probex-primary)' }}>
              <span className="live-dot w-1.5 h-1.5" aria-hidden="true" />
              Edge Alignment
            </h3>
            {alignment.total > 0 && (
              <span className="text-lg font-bold tabular-nums" style={{ color: alignedPct >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)' }}>
                {Math.round(alignedPct * 100)}%
              </span>
            )}
          </div>

          {alignment.total === 0 ? (
            <span className="text-xl font-bold" style={{ color: 'var(--probex-text-disabled)' }}>—</span>
          ) : (
            <>
              <div className="flex h-2 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
                <div className="h-full" style={{ width: `${(alignment.aligned / alignment.total) * 100}%`, background: 'var(--probex-positive)' }} title="Aligned" />
                <div className="h-full" style={{ width: `${(alignment.noSignal / alignment.total) * 100}%`, background: 'var(--probex-text-muted)' }} title="No active edge" />
                <div className="h-full" style={{ width: `${(alignment.contrarian / alignment.total) * 100}%`, background: 'var(--probex-warning)' }} title="Contrarian" />
              </div>
              <div className="flex items-center justify-between text-2xs">
                <span style={{ color: 'var(--probex-positive)' }}>{alignment.aligned} aligned</span>
                <span style={{ color: 'var(--probex-text-muted)' }}>{alignment.noSignal} no signal</span>
                <span style={{ color: 'var(--probex-warning)' }}>{alignment.contrarian} contrarian</span>
              </div>
              <p className="text-2xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
                Of open positions, how many still match the engine's currently-detected edge direction for that market — a live cross-check, not a historical score.
              </p>
            </>
          )}
        </div>

        {/* Performance Snapshot — live open-position performance, not a historical ledger */}
        <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
          <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>Performance Snapshot</h3>
          {!snapshot ? (
            <span className="text-xl font-bold" style={{ color: 'var(--probex-text-disabled)' }}>—</span>
          ) : (
            <div className="flex flex-col gap-2">
              <SnapshotRow label="Best Performer" title={snapshot.best.marketTitle ?? snapshot.best.id} value={`${(snapshot.best.unrealizedPnlPct ?? 0) >= 0 ? '+' : ''}${((snapshot.best.unrealizedPnlPct ?? 0) * 100).toFixed(1)}%`} color="var(--probex-positive)" />
              <SnapshotRow label="Worst Performer" title={snapshot.worst.marketTitle ?? snapshot.worst.id} value={`${((snapshot.worst.unrealizedPnlPct ?? 0) * 100).toFixed(1)}%`} color={(snapshot.worst.unrealizedPnlPct ?? 0) < 0 ? 'var(--probex-negative)' : 'var(--probex-positive)'} />
              <SnapshotRow label="Total Deployed" title={`${openPositions.length} open positions`} value={formatCurrency(totalValue)} color="var(--probex-text-primary)" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SnapshotRow({ label, title, value, color }: { label: string; title: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
        <span className="truncate" style={{ color: 'var(--probex-text-secondary)' }}>{title}</span>
      </div>
      <span className="font-semibold tabular-nums flex-shrink-0" style={{ color }}>{value}</span>
    </div>
  )
}
