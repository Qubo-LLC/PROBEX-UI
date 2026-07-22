'use client'

// SegmentPerformance — originally assumed a per-Bitcoin-category breakdown
// (price-targets/volatility/etf-flows/…) via analytics.segmentPerformance.
// 2026-07-22: /api/analytics/segments IS live, but returns segments: [] with
// zero real items — that fictional Bitcoin-category taxonomy was never a
// real backend concept (confirmed: no market ever carried a `segment` field
// either). /api/survival/patterns, however, is live WITH real, non-empty
// data — segmented by edge-size bucket and hour-of-day, which is what this
// backend actually tracks. Repointed to that real source; same table shell.

import { useApplicationStore } from '@/store/applicationStore'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { formatSignedCurrency, formatPercent } from '@/lib/utils'

export function SegmentPerformance() {
  const slice = useApplicationStore((s) => s.engine.survivalPatterns)
  const patterns = slice.status === 'success' && slice.data ? slice.data.patterns : []

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Pattern Performance</h2>
          <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>Win rate and P&L by edge-size bucket and hour of day</p>
        </div>
        <ProvenanceBadge provenance="live" detail="/api/survival/patterns" />
      </div>

      {patterns.length === 0 ? (
        <div className="p-4">
          <EmptyState size="sm" title="No patterns recorded yet" description="Populates as the survival brain accumulates trade outcomes per edge bucket and hour." />
        </div>
      ) : (
        <TableShell label="Pattern performance">
          <Thead>
            <Th align="left">Hour</Th>
            <Th align="left">Edge Bucket</Th>
            <Th align="right">Trades</Th>
            <Th align="right">Win Rate</Th>
            <Th align="right">Avg P&L</Th>
            <Th align="center">Filtered</Th>
          </Thead>
          <tbody>
            {patterns.map((p) => (
              <Tr key={p.key}>
                <Td align="left"><span className="font-medium tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{p.hour}:00</span></Td>
                <Td align="left"><span style={{ color: 'var(--probex-text-secondary)' }}>{p.edgeBucket}</span></Td>
                <Td align="right"><span className="tabular-nums">{p.totalTrades}</span></Td>
                <Td align="right">
                  <span className="tabular-nums font-semibold" style={{ color: p.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)' }}>
                    {formatPercent(p.winRate)}
                  </span>
                </Td>
                <Td align="right">
                  <span className="tabular-nums" style={{ color: p.avgPnl >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)' }}>
                    {formatSignedCurrency(p.avgPnl)}
                  </span>
                </Td>
                <Td align="center">
                  {p.isFiltered && (
                    <span className="text-2xs font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--probex-warning-dim)', color: 'var(--probex-warning)' }}>filtered</span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  )
}
