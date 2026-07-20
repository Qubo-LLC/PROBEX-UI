'use client'

// CapitalLedger — V3 redesign of V1's TransactionHistory (git 0e3833a4). No
// persistent transaction/trade ledger exists yet (P2-02) — deposits/
// withdrawals/tx-hash columns were crypto-wallet concepts that don't apply
// here anyway. The full table shell (header, filter row, sortable columns,
// ghost rows) renders at full visual weight per the "never collapse premium
// layouts" directive; filter controls are shown dimmed/non-interactive
// (same technique as Market Detail's MarketCharts preview) since wiring them
// to zero real rows would imply functionality that doesn't exist yet.

import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'

const GHOST_ROWS = 5

export function CapitalLedger() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="px-4 py-3 flex flex-col gap-2.5" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Capital Ledger</h2>
          <ProvenanceBadge provenance="awaiting" detail="P2-02" />
        </div>
        <div className="flex flex-wrap items-center gap-2 opacity-40 pointer-events-none select-none" aria-hidden="true">
          <div className="h-8 min-w-[160px] max-w-xs flex-1 rounded-md" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border-default)' }} />
          {['All Types', 'All Statuses'].map((label) => (
            <span key={label} className="h-8 flex items-center px-2.5 text-xs rounded-md" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border-default)', color: 'var(--probex-text-muted)' }}>{label}</span>
          ))}
        </div>
      </div>

      <TableShell label="Capital ledger">
        <Thead>
          <Th align="left">Date</Th>
          <Th align="left">Type</Th>
          <Th align="right">Amount</Th>
          <Th align="left">Status</Th>
          <Th align="left">Market</Th>
        </Thead>
        <tbody>
          {Array.from({ length: GHOST_ROWS }).map((_, i) => (
            <Tr key={i}>
              <Td align="left"><AwaitingValue size="sm" /></Td>
              <Td align="left"><AwaitingValue size="sm" /></Td>
              <Td align="right"><AwaitingValue size="sm" /></Td>
              <Td align="left"><AwaitingValue size="sm" /></Td>
              <Td align="left"><AwaitingValue size="sm" /></Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>

      <p className="text-2xs leading-relaxed p-4" style={{ color: 'var(--probex-text-disabled)' }}>
        The engine keeps no persistent trade/capital ledger yet — this becomes a full searchable, sortable history the moment a ledger endpoint ships (P2-02).
      </p>
    </div>
  )
}
