'use client'

// CapitalLedger — settled-trade ledger from /api/trades/ledger. Item schema was
// confirmed live 2026-07-25 (SettledTrade), so rows render for real; the ghost
// rows below only appear while the ledger is genuinely empty.

import { useApplicationStore } from '@/store/applicationStore'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { formatSignedCurrency, formatPercent } from '@/lib/utils'

const GHOST_ROWS = 5
const MAX_ROWS   = 25

/** "2h 14m" / "18m" / "42s" — hold times run from seconds to hours. */
function formatHold(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function CapitalLedger() {
  const slice = useApplicationStore((s) => s.engine.tradesLedger)
  const ledger = slice.status === 'success' ? slice.data : null
  const rowCount = ledger?.ledger.length ?? 0
  // Newest first — the wire order is not guaranteed.
  const rows = (ledger?.ledger ?? []).slice().sort((a, b) => b.closedAt - a.closedAt).slice(0, MAX_ROWS)

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
          <Th align="left">Settled</Th>
          <Th align="left">Side</Th>
          <Th align="right">Stake</Th>
          <Th align="right">Entry → Exit</Th>
          <Th align="right">Held</Th>
          <Th align="left">Result</Th>
          <Th align="right">Realized P&L</Th>
          <Th align="left">Market</Th>
        </Thead>
        <tbody>
          {rows.length > 0
            ? rows.map((t) => {
                const pnlColor = t.pnl >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)'
                return (
                  <Tr key={`${t.marketId}-${t.closedAt}`}>
                    <Td align="left">
                      <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                        {new Date(t.closedAt).toLocaleTimeString()}
                      </span>
                    </Td>
                    <Td align="left">
                      <span className="uppercase font-semibold" style={{ color: 'var(--probex-text-secondary)' }}>{t.direction}</span>
                    </Td>
                    <Td align="right"><span className="tabular-nums">{formatSignedCurrency(t.size).replace('+', '')}</span></Td>
                    <Td align="right">
                      <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                        {t.entryPrice.toFixed(1)}¢ → {t.exitPrice !== null ? `${t.exitPrice.toFixed(1)}¢` : 'resolved'}
                      </span>
                    </Td>
                    <Td align="right"><span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>{formatHold(t.holdTimeSeconds)}</span></Td>
                    <Td align="left">
                      <span className="font-semibold" style={{ color: t.won ? 'var(--probex-positive)' : 'var(--probex-negative)' }}>
                        {t.won ? 'WON' : 'LOST'}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="tabular-nums font-semibold" style={{ color: pnlColor }}>
                        {formatSignedCurrency(t.pnl)} ({formatPercent(t.pnlPercent)})
                      </span>
                    </Td>
                    <Td align="left">
                      <span className="truncate block max-w-[240px]" style={{ color: 'var(--probex-text-muted)' }} title={t.marketId}>
                        {t.marketId.slice(0, 10)}…
                      </span>
                    </Td>
                  </Tr>
                )
              })
            : Array.from({ length: GHOST_ROWS }).map((_, i) => (
                <Tr key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <Td key={j} align="left"><AwaitingValue size="sm" /></Td>
                  ))}
                </Tr>
              ))}
        </tbody>
      </TableShell>

      {rowCount > MAX_ROWS && (
        <p className="text-2xs leading-relaxed p-4" style={{ color: 'var(--probex-text-disabled)' }}>
          Showing the {MAX_ROWS} most recent of {rowCount} settled trades.
        </p>
      )}
      {rowCount === 0 && (
        <p className="text-2xs leading-relaxed p-4" style={{ color: 'var(--probex-text-disabled)' }}>
          No trades have settled this session. /api/trades/ledger is live and will populate this table as trades close.
        </p>
      )}
    </div>
  )
}
