'use client'

// SegmentPerformance — restored V1 concept (per-segment breakdown), redirected
// at real segments. No trade-attribution-by-segment endpoint exists yet
// (analytics.segmentPerformance, awaiting-backend) since it requires a
// persistent trade ledger (same P2-02 dependency as Positions' settled
// history). Full table shell renders for every real Bitcoin segment; only
// the performance figures are marked pending.

import { BITCOIN_SEGMENTS } from '@/types/market'
import { segmentLabel } from '@/lib/display/market'
import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'

export function SegmentPerformance() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Segment Performance</h2>
          <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>Win rate, avg. edge, and trade count by Bitcoin market segment</p>
        </div>
        <ProvenanceBadge provenance="awaiting" detail="segmentPerformance" />
      </div>

      <TableShell label="Segment performance">
        <Thead>
          <Th align="left">Segment</Th>
          <Th align="right">Trades</Th>
          <Th align="right">Win Rate</Th>
          <Th align="right">Avg. Edge</Th>
          <Th align="right">Realized P&L</Th>
        </Thead>
        <tbody>
          {BITCOIN_SEGMENTS.map((seg) => (
            <Tr key={seg}>
              <Td align="left"><span className="font-medium" style={{ color: 'var(--probex-text-primary)' }}>{segmentLabel(seg)}</span></Td>
              <Td align="right"><AwaitingValue size="sm" /></Td>
              <Td align="right"><AwaitingValue size="sm" /></Td>
              <Td align="right"><AwaitingValue size="sm" /></Td>
              <Td align="right"><AwaitingValue size="sm" /></Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  )
}
