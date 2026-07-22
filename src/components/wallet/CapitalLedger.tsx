'use client'

// CapitalLedger — V3 redesign of V1's TransactionHistory (git 0e3833a4). No
// persistent transaction/trade ledger existed (P2-02) — deposits/withdrawals/
// tx-hash columns were crypto-wallet concepts that don't apply here anyway.
//
// 2026-07-22: /api/trades/ledger is live — the endpoint P2-02 referred to now
// exists. Its `ledger[]` is empty this session and its item schema is not yet
// observed, so individual rows still can't be shown truthfully, but this is
// no longer "waiting for an endpoint that doesn't exist": it's live and has
// nothing settled yet. The aggregate summary (total P&L, win/loss, win rate)
// IS real and shown above the table shell.

import { useApplicationStore } from '@/store/applicationStore'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { formatSignedCurrency, formatPercent } from '@/lib/utils'

const GHOST_ROWS = 5

export function CapitalLedger() {
  const slice = useApplicationStore((s) => s.engine.tradesLedger)
  const ledger = slice.status === 'success' ? slice.data : null
  const rowCount = ledger?.ledger.length ?? 0

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="px-4 py-3 flex flex-col gap-2.5" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Capital Ledger</h2>
          <ProvenanceBadge provenance="live" detail="/api/trades/ledger" />
        </div>
        {ledger && ledger.count > 0 && (
          <div className="flex items-center gap-4 text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            <span>{ledger.summary.wins}W / {ledger.summary.losses}L</span>
            <span style={{ color: ledger.summary.totalPnl >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)' }}>
              {formatSignedCurrency(ledger.summary.totalPnl)}
            </span>
            <span>{formatPercent(ledger.summary.winRate)} win rate</span>
          </div>
        )}
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
        {rowCount > 0
          ? `The engine reports ${rowCount} ledger entr${rowCount === 1 ? 'y' : 'ies'}, but the row schema isn't confirmed yet — individual rows activate once a non-empty sample is captured.`
          : 'No trades have settled this session. /api/trades/ledger is live and will populate this table as trades close.'}
      </p>
    </div>
  )
}
