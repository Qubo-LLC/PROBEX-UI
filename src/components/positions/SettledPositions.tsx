'use client'

// SettledPositions — restored V1 visual (git 0e3833a4). The engine keeps no
// persistent trade ledger yet (P2-02), so individual settled rows can't be
// shown truthfully — but the AGGREGATE win/loss count IS real today, from
// /api/execution/status's resolutionStats. Per the Phase 4 "never collapse
// premium layouts" directive: the full table shell (header, columns, 4 ghost
// rows) renders at full weight; only the per-row figures are marked pending.

import { useApplicationStore } from '@/store/applicationStore'
import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'

const GHOST_ROWS = 4

export function SettledPositions() {
  const executionSlice = useApplicationStore((s) => s.engine.executionStatus)
  const ex = executionSlice.status === 'success' ? executionSlice.data : null
  const rs = ex?.resolutionStats

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>Settled Positions</h2>
        <div className="flex items-center gap-3">
          {rs && rs.totalResolved > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--probex-positive-dim)', color: 'var(--probex-positive)' }}>{rs.wins}W</span>
              <span className="font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--probex-negative-dim)', color: 'var(--probex-negative)' }}>{rs.losses}L</span>
            </div>
          )}
          <ProvenanceBadge provenance="awaiting" detail="P2-02" />
        </div>
      </div>

      <TableShell label="Settled positions">
        <Thead>
          <Th align="left">Market</Th>
          <Th align="center">Side</Th>
          <Th align="right">Entry</Th>
          <Th align="center">Result</Th>
          <Th align="right">Stake</Th>
          <Th align="right">Realized P&L</Th>
          <Th align="right">Settled</Th>
        </Thead>
        <tbody>
          {Array.from({ length: GHOST_ROWS }).map((_, i) => (
            <Tr key={i}>
              <Td align="left"><AwaitingValue size="sm" /></Td>
              <Td align="center"><AwaitingValue size="sm" /></Td>
              <Td align="right"><AwaitingValue size="sm" /></Td>
              <Td align="center"><AwaitingValue size="sm" /></Td>
              <Td align="right"><AwaitingValue size="sm" /></Td>
              <Td align="right"><AwaitingValue size="sm" /></Td>
              <Td align="right"><AwaitingValue size="sm" /></Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>

      <p className="text-2xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
        {rs && rs.totalResolved > 0
          ? `The engine has resolved ${rs.totalResolved} position${rs.totalResolved === 1 ? '' : 's'} this session (${rs.wins}W / ${rs.losses}L), but keeps no persistent trade ledger yet — individual settled rows activate once a history endpoint ships (P2-02).`
          : 'Settled-position history is not available: the engine keeps no trade ledger yet, and in-memory state resets on restart. A persistent trade history endpoint is on the backend roadmap (P2-02) — this section becomes the full blotter when it lands.'}
      </p>
    </div>
  )
}
