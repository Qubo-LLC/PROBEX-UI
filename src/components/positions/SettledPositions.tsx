'use client'

// SettledPositions — restored V1 visual (git 0e3833a4). Settled history now has a
// live source: /api/execution/trades exposes closed_positions (Phase 2, 2026-07-21).
// In the current paper session that list is empty and its per-row item schema is not
// yet observed, so individual rows still can't be shown truthfully — but the section
// is no longer "waiting for an endpoint that doesn't exist": the endpoint is live and
// simply has nothing settled this session. The AGGREGATE win/loss count remains real
// today, from /api/execution/status's resolutionStats. Per the Phase 4 "never collapse
// premium layouts" directive the full table shell renders at full weight; only the
// per-row figures are marked pending until a non-empty closed_positions sample lands.

import { useApplicationStore } from '@/store/applicationStore'
import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'

const GHOST_ROWS = 4

export function SettledPositions() {
  const executionSlice = useApplicationStore((s) => s.engine.executionStatus)
  const tradesSlice    = useApplicationStore((s) => s.engine.executionTrades)
  const ex = executionSlice.status === 'success' ? executionSlice.data : null
  const rs = ex?.resolutionStats
  const trades = tradesSlice.status === 'success' ? tradesSlice.data : null
  const closedCount = trades ? trades.closedPositions.length : 0

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
          <ProvenanceBadge provenance="awaiting" detail="closed_positions schema" />
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
        {closedCount > 0
          ? `The engine reports ${closedCount} closed trade${closedCount === 1 ? '' : 's'} via /api/execution/trades, but their row schema isn't confirmed yet — individual settled rows activate once a closed-position sample is captured.`
          : rs && rs.totalResolved > 0
            ? `The engine has resolved ${rs.totalResolved} position${rs.totalResolved === 1 ? '' : 's'} this session (${rs.wins}W / ${rs.losses}L). /api/execution/trades is live but its closed list is empty right now — individual settled rows populate as trades close.`
            : 'No positions have settled this session. /api/execution/trades is live and will populate this blotter as the engine opens and closes paper positions.'}
      </p>
    </div>
  )
}
