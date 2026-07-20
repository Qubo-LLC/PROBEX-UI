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

interface PositionTableProps {
  positions:   PositionRow[]
  edgeMap:     Map<string, EdgeRow>
  selectedId?: string | null
  onSelectRow?: (id: string) => void
  /** Phase 6A: tighter row height for the Positions tape. */
  dense?:      boolean
}

export function PositionTable({ positions, edgeMap, selectedId, onSelectRow, dense = false }: PositionTableProps) {
  return (
    <TableShell label="Open positions">
      <Thead>
        <Th align="left" dense={dense}>Market</Th>
        <Th align="center" dense={dense}>Side</Th>
        <Th align="right" dense={dense}>Entry → Now</Th>
        <Th align="right" dense={dense}>Cost / Value</Th>
        <Th align="left" dense={dense}>Edge</Th>
        <Th align="right" dense={dense}>Unrealized P&L</Th>
        <Th align="right" dense={dense}>Opened</Th>
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
              <Td align="right" dense={dense}>
                <span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>{p.openedAt !== null ? new Date(p.openedAt).toLocaleTimeString() : '—'}</span>
              </Td>
            </Tr>
          )
        })}
      </tbody>
    </TableShell>
  )
}
