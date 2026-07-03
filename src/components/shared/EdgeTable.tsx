'use client'

// EdgeTable — renders a ParseResult<EdgeRow> truthfully. Shared between the
// Strategy console (full table) and the Live Feed (edge alerts).
//
// Three states, no fabrication:
//   empty        → designed empty state (engine found nothing this cycle)
//   rows         → live edge rows
//   unrecognized → items arrived but don't match the proposed schema — say so

import { formatPercent } from '@/lib/utils'
import type { ParseResult } from '@/lib/mappers/parse'
import type { EdgeRow } from '@/lib/mappers/edges'
import { Card }       from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableShell, Thead, Th, Tr, Td } from './DataTable'

interface EdgeTableProps {
  result: ParseResult<EdgeRow>
  emptyTitle?: string
  emptyDescription?: string
}

export function EdgeTable({
  result,
  emptyTitle = 'No qualifying edges this cycle',
  emptyDescription = 'The engine is scanning 5-minute markets. Edges appear here the moment one clears the threshold.',
}: EdgeTableProps) {
  if (result.kind === 'empty') {
    return <EmptyState title={emptyTitle} description={emptyDescription} size="sm" />
  }

  if (result.kind === 'unrecognized') {
    return (
      <Card>
        <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
          The engine reports {result.count} active edge{result.count === 1 ? '' : 's'},
          but the item format doesn’t match the agreed schema yet — raw rows are not
          displayed to avoid showing wrong values. (Backend contract P0-01.)
        </p>
      </Card>
    )
  }

  return (
    <TableShell label="Active edges">
      <Thead>
        <Th align="left">Market</Th>
        <Th align="center">Direction</Th>
        <Th align="right">Edge</Th>
        <Th align="right">Kelly Size</Th>
        <Th align="right">Confidence</Th>
        <Th align="left">Signal</Th>
        <Th align="right">Detected</Th>
      </Thead>
      <tbody>
        {result.rows.map((row) => (
          <Tr key={row.id}>
            <Td align="left">
              <span className="font-medium" style={{ color: 'var(--probex-text-primary)' }}>
                {row.marketTitle ?? row.id}
              </span>
            </Td>
            <Td align="center">
              <span
                className="text-2xs font-bold uppercase rounded px-1.5 py-0.5"
                style={{
                  color:      row.direction === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)',
                  background: 'var(--probex-surface-2)',
                }}
              >
                {row.direction}
              </span>
            </Td>
            <Td align="right">
              <span className="font-bold tabular-nums" style={{ color: 'var(--probex-primary)' }}>
                {row.edgePct.toFixed(2)}%
              </span>
            </Td>
            <Td align="right">
              <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                {row.kellySize !== null ? formatPercent(row.kellySize) : '—'}
              </span>
            </Td>
            <Td align="right">
              <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                {row.confidence !== null ? formatPercent(row.confidence) : '—'}
              </span>
            </Td>
            <Td align="left">
              <span style={{ color: 'var(--probex-text-muted)' }}>{row.signal ?? '—'}</span>
            </Td>
            <Td align="right">
              <span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                {row.detectedAt !== null ? new Date(row.detectedAt).toLocaleTimeString() : '—'}
              </span>
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableShell>
  )
}
