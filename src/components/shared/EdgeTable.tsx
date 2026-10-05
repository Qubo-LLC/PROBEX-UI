'use client'

// EdgeTable — renders a ParseResult<EdgeRow> truthfully. Shared by Strategy
// (the current candidates), Live Feed (edge alerts) and Consensus.
//
// Three states, no fabrication:
//   empty        → designed empty state (engine found nothing this cycle)
//   rows         → live edge rows
//   unrecognized → items arrived but don't match the proposed schema — say so
//
// ─── Columns (2026-09-16) ────────────────────────────────────────────────────
// "Kelly Size" and "Signal" were columns of dashes: neither field has ever
// been on the /api/edges wire. What IS on the wire and was not shown — the
// indicators the detector read (RSI, MACD trend, alignment) — now folds under
// the identity at narrow widths and has its own column at lg. Ledger grammar:
// one elastic identity column, numeric columns fixed, supplementary columns
// hide below a breakpoint rather than scroll.

import Link from 'next/link'
import { formatPercent } from '@/lib/utils'
import { compactWindowTitle } from '@/lib/display/market'
import { formatEdgePct } from '@/lib/display/engine'
import { shortMarketId } from '@/lib/display/eventDisplay'
import { clockOrDate } from '@/lib/display/time'
import { MARKET_DETAIL_PATH } from '@/config/constants'
import type { ParseResult } from '@/lib/mappers/parse'
import type { EdgeRow } from '@/lib/mappers/edges'
import { Card }       from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableShell, Thead, Th, Tr, Td } from './DataTable'

interface EdgeTableProps {
  result: ParseResult<EdgeRow>
  emptyTitle?: string
  emptyDescription?: string
  /** When supplied, rows become clickable and select the row's market
   *  (e.g. Consensus flagship's Opportunity Intelligence → focus market).
   *  Without it, the market title links to Market Detail. */
  onSelectMarket?: (marketId: string) => void
}

/** The indicators the detector reports, as one line. Only present fields. */
function indicatorLine(row: EdgeRow): string | null {
  const parts: string[] = []
  if (row.rsi !== null) parts.push(`RSI ${row.rsi.toFixed(0)}${row.rsiSignal ? ` ${row.rsiSignal}` : ''}`)
  if (row.macdTrend !== null) parts.push(`MACD ${row.macdTrend}`)
  if (row.alignmentScore !== null) parts.push(`align ${row.alignmentScore.toFixed(2)}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

export function EdgeTable({
  result,
  emptyTitle = 'No qualifying edges this cycle',
  emptyDescription = 'The engine is scanning 5-minute markets. Edges appear here the moment one clears the threshold.',
  onSelectMarket,
}: EdgeTableProps) {
  if (result.kind === 'empty') {
    return <EmptyState title={emptyTitle} description={emptyDescription} size="sm" />
  }

  if (result.kind === 'unrecognized') {
    return (
      <Card>
        <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>
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
        <Th align="left" dense grow>Market</Th>
        <Th align="right" dense>Edge</Th>
        <Th align="right" dense hideBelow="sm">Confidence</Th>
        <Th align="left" dense hideBelow="lg">Indicators</Th>
        <Th align="right" dense hideBelow="md">Detected</Th>
      </Thead>
      <tbody>
        {result.rows.map((row) => {
          const marketId = row.marketId
          const onClick = onSelectMarket && marketId ? () => onSelectMarket(marketId) : undefined
          const isYes = row.direction === 'yes'
          const sideColor = isYes ? 'var(--synatra-yes)' : 'var(--synatra-no)'
          const title = row.marketTitle !== null ? compactWindowTitle(row.marketTitle) : `market ${shortMarketId(row.id)}`
          const indicators = indicatorLine(row)
          return (
            <Tr key={row.id} onClick={onClick} accent={sideColor}>
              <Td align="left" dense grow>
                <span className="flex items-baseline gap-2 min-w-0">
                  <span className="text-2xs font-black uppercase tracking-widest flex-shrink-0" style={{ color: sideColor }}>
                    {row.direction}
                  </span>
                  {onClick === undefined && marketId ? (
                    <Link
                      href={MARKET_DETAIL_PATH(marketId)}
                      className="focus-ring rounded-sm font-medium truncate min-w-0"
                      style={{ color: 'var(--synatra-text-primary)' }}
                      title={row.marketTitle ?? marketId}
                    >
                      {title}
                    </Link>
                  ) : (
                    <span className="font-medium truncate min-w-0" style={{ color: 'var(--synatra-text-primary)' }} title={row.marketTitle ?? row.id}>
                      {title}
                    </span>
                  )}
                </span>
                {/* What the folded columns carried, below lg / md / sm. */}
                <span className="lg:hidden block font-mono text-2xs mt-0.5 truncate" style={{ color: 'var(--synatra-text-muted)' }}>
                  {indicators ?? 'no indicators reported'}
                  <span className="sm:hidden">{row.confidence !== null ? ` · ${formatPercent(row.confidence)} conf.` : ''}</span>
                  <span className="md:hidden">{row.detectedAt !== null ? ` · ${clockOrDate(row.detectedAt)}` : ''}</span>
                </span>
              </Td>
              <Td align="right" dense>
                <span className="font-mono font-semibold tabular-nums" style={{ color: 'var(--synatra-text-primary)' }}>
                  {formatEdgePct(row.edgePct, 2)}
                </span>
              </Td>
              <Td align="right" dense hideBelow="sm">
                <span className="font-mono tabular-nums" style={{ color: 'var(--synatra-text-secondary)' }}>
                  {row.confidence !== null ? formatPercent(row.confidence) : '—'}
                </span>
              </Td>
              <Td align="left" dense hideBelow="lg">
                <span className="font-mono text-2xs" style={{ color: 'var(--synatra-text-muted)' }}>{indicators ?? '—'}</span>
              </Td>
              <Td align="right" dense hideBelow="md">
                <span className="font-mono tabular-nums text-2xs" style={{ color: 'var(--synatra-text-muted)' }}>
                  {row.detectedAt !== null ? clockOrDate(row.detectedAt, Date.now(), { seconds: true }) : '—'}
                </span>
              </Td>
            </Tr>
          )
        })}
      </tbody>
    </TableShell>
  )
}
