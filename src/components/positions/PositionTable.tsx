'use client'

// PositionTable — extracted from PositionsConsole's inline table (M4/M6) so
// it can gain a detail-row interaction without bloating the console, and so
// Settled positions can reuse the same shell. V1's rightmost "Consensus"
// column (fabricated per-position score) is replaced with a live Edge column
// — the same real /api/edges signal used throughout V3 — showing whether
// the engine currently has an active view on this position's market at all.

import { formatCurrency, formatSignedCurrency, formatDelta } from '@/lib/utils'
import type { PositionRow } from '@/lib/mappers/positions'
import type { EdgeRow } from '@/lib/mappers/edges'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { EdgeBadge } from '@/components/shared/EdgeBadge'
import { formatRuntime, positionCloseState } from '@/lib/display/positionDisplay'
import { lifecycleLabel, formatCloseTime } from '@/lib/display/marketLifecycle'

interface PositionTableProps {
  positions:   PositionRow[]
  edgeMap:     Map<string, EdgeRow>
  /** marketId → closes_at. Missing entries mean "not in the engine's current
   *  market cache", which renders as no claim rather than as "open". */
  closesAtByMarketId?: Map<string, number | null>
  selectedId?: string | null
  onSelectRow?: (id: string) => void
  /** Phase 6A: tighter row height for the Positions tape. */
  dense?:      boolean
}

export function PositionTable({ positions, edgeMap, closesAtByMarketId, selectedId, onSelectRow, dense = false }: PositionTableProps) {
  const closes = closesAtByMarketId ?? new Map<string, number | null>()
  return (
    <TableShell label="Open positions">
      <Thead>
        <Th align="left" dense={dense}>Market</Th>
        <Th align="center" dense={dense}>Side</Th>
        <Th align="right" dense={dense}>Entry → Now</Th>
        <Th align="right" dense={dense}>Cost / Value</Th>
        <Th align="left" dense={dense}>Edge</Th>
        <Th align="right" dense={dense}>Unrealized P&L</Th>
        <Th align="right" dense={dense}>Runtime</Th>
        <Th align="left" dense={dense}>Market State</Th>
      </Thead>
      <tbody>
        {positions.map((p) => {
          const edge = p.marketId ? edgeMap.get(p.marketId) : undefined
          const isSelected = selectedId === p.id
          return (
            <Tr key={p.id} onClick={onSelectRow ? () => onSelectRow(p.id) : undefined}>
              <Td align="left" dense={dense}>
                <span className="font-medium" style={{ color: isSelected ? 'var(--probex-primary)' : 'var(--probex-text-primary)' }}>{p.marketTitle ?? p.id}</span>
              </Td>
              <Td align="center" dense={dense}>
                <span className="text-2xs font-bold uppercase rounded px-1.5 py-0.5" style={{ color: p.side === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)', background: 'var(--probex-surface-2)' }}>{p.side}</span>
              </Td>
              <Td align="right" dense={dense}>
                <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>{p.entryPrice !== null && p.currentPrice !== null ? `${p.entryPrice}¢ → ${p.currentPrice}¢` : '—'}</span>
              </Td>
              <Td align="right" dense={dense}>
                <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>{p.costBasis !== null && p.currentValue !== null ? `${formatCurrency(p.costBasis)} / ${formatCurrency(p.currentValue)}` : '—'}</span>
              </Td>
              <Td align="left" dense={dense}>
                <EdgeBadge edge={edge} size="sm" />
              </Td>
              <Td align="right" dense={dense}>
                <span className="tabular-nums font-bold" style={{ color: p.unrealizedPnl === null ? 'var(--probex-text-muted)' : p.unrealizedPnl > 0 ? 'var(--probex-positive)' : p.unrealizedPnl < 0 ? 'var(--probex-negative)' : 'var(--probex-text-primary)' }}>
                  {p.unrealizedPnl !== null ? `${formatSignedCurrency(p.unrealizedPnl)}${p.unrealizedPnlPct !== null ? ` (${formatDelta(p.unrealizedPnlPct)})` : ''}` : '—'}
                </span>
              </Td>
              {/* RUNTIME — `time_held_seconds`, a field the contract has always
                  carried and nothing displayed. The opened timestamp moves to
                  the tooltip: how long it has been open is the operational
                  question, the wall-clock moment is the reference. */}
              <Td align="right" dense={dense}>
                <span
                  className="tabular-nums"
                  style={{ color: 'var(--probex-text-secondary)' }}
                  {...(p.openedAt !== null ? { title: `Opened ${new Date(p.openedAt).toLocaleString()}` } : {})}
                >
                  {formatRuntime(p.timeHeldSeconds)}
                </span>
              </Td>
              {/* Market state comes from a join that can miss; an unknown
                  market renders as a dash, never as "open". */}
              <Td align="left" dense={dense}>
                {(() => {
                  const cs = positionCloseState(p.marketId, closes)
                  if (cs.lifecycle === 'unknown') {
                    return <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }} title="This market is not in the engine's current market cache, so its close time is unknown.">—</span>
                  }
                  const tone =
                    cs.lifecycle === 'closed' ? 'var(--probex-warning)'
                    : cs.lifecycle === 'closing' ? 'var(--probex-warning)'
                    : 'var(--probex-text-secondary)'
                  return (
                    <span className="text-2xs flex items-center gap-1.5" style={{ color: tone }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tone }} aria-hidden="true" />
                      <span className="font-semibold">{lifecycleLabel(cs.lifecycle)}</span>
                      <span style={{ color: 'var(--probex-text-disabled)' }}>{formatCloseTime(cs.closesAt)}</span>
                    </span>
                  )
                })()}
              </Td>
            </Tr>
          )
        })}
      </tbody>
    </TableShell>
  )
}
