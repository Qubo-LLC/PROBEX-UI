'use client'

// SettledPositions — the engine's closed-trade blotter.
//
// Sourced from /api/positions/history, NOT /api/execution/trades. The two are
// not actually describing the same thing: /api/execution/* tracks REAL
// order-submission activity (confirmed via its order_submit rate-limit bucket
// sitting at 0 total_requests), and the engine is currently in paper mode, so
// that subsystem is legitimately empty — not a bug. positions/history is the
// paper-trading record, shares its row schema with /api/trades/ledger, and is
// always the right source for what has actually happened this session,
// regardless of mode (see docs/API_AUDIT.md §0.10).
//
// The W/L chips likewise come from the ledger summary rather than
// execution/status.resolutionStats, which is part of the same live-only
// subsystem and stays at zero until live trading is enabled.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { marketIdentity } from '@/lib/display/positionDisplay'

const GHOST_ROWS = 4
const MAX_ROWS   = 30

/** "2h 14m" / "18m" / "42s". */
function formatHold(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function SettledPositions() {
  const historySlice = useApplicationStore((s) => s.engine.positionsHistory)
  const ledgerSlice  = useApplicationStore((s) => s.engine.tradesLedger)

  const history = historySlice.status === 'success' ? historySlice.data : null
  const ledger  = ledgerSlice.status  === 'success' ? ledgerSlice.data  : null

  const rows = useMemo(
    () => (history?.history ?? []).slice().sort((a, b) => b.closedAt - a.closedAt).slice(0, MAX_ROWS),
    [history],
  )

  const total   = history?.count ?? 0
  const summary = ledger?.summary ?? null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="t-section-title">Settled Positions</h2>
        <div className="flex items-center gap-3">
          {summary && (summary.wins > 0 || summary.losses > 0) && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--probex-positive-dim)', color: 'var(--probex-positive)' }}>{summary.wins}W</span>
              <span className="font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--probex-negative-dim)', color: 'var(--probex-negative)' }}>{summary.losses}L</span>
              <span className="tabular-nums" style={{ color: summary.totalPnl >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)' }}>
                {formatSignedCurrency(summary.totalPnl)}
              </span>
            </div>
          )}
          <ProvenanceBadge provenance="live" detail="/api/positions/history" state={historySlice} />
        </div>
      </div>

      <TableShell label="Settled positions">
        <Thead>
          <Th align="left">Market</Th>
          <Th align="center">Side</Th>
          <Th align="right">Entry → Exit</Th>
          <Th align="center">Result</Th>
          <Th align="right">Stake</Th>
          <Th align="right">Held</Th>
          <Th align="right">Realized P&L</Th>
          <Th align="right">Settled</Th>
        </Thead>
        <tbody>
          {rows.length > 0
            ? rows.map((t) => (
                <Tr key={`${t.marketId}-${t.closedAt}`}>
                  {/* /api/positions/history carries no `question`, but it does
                      carry asset_symbol and duration_minutes — so the blotter
                      can say "BTC 15m" instead of "0x7ac7615f27…". The id stays
                      in the tooltip, where an id is actually useful. */}
                  <Td align="left">
                    <span
                      className="truncate block max-w-[180px] font-medium"
                      style={{ color: 'var(--probex-text-primary)' }}
                      title={t.marketId}
                    >
                      {marketIdentity(t.assetSymbol, t.durationMinutes, t.marketId)}
                    </span>
                  </Td>
                  <Td align="center">
                    <span
                      className="text-2xs font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{
                        background: t.direction === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)',
                        color: t.direction === 'yes' ? 'var(--probex-on-yes)' : 'var(--probex-on-no)',
                      }}
                    >
                      {t.direction}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                      {t.entryPrice.toFixed(1)}¢ → {t.exitPrice !== null ? `${t.exitPrice.toFixed(1)}¢` : 'resolved'}
                    </span>
                  </Td>
                  <Td align="center">
                    <span className="font-semibold text-2xs" style={{ color: t.won ? 'var(--probex-positive)' : 'var(--probex-negative)' }}>
                      {t.won ? 'WON' : 'LOST'}
                    </span>
                  </Td>
                  <Td align="right"><span className="tabular-nums">{formatCurrency(t.size)}</span></Td>
                  <Td align="right"><span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>{formatHold(t.holdTimeSeconds)}</span></Td>
                  <Td align="right">
                    <span className="tabular-nums font-semibold" style={{ color: t.pnl >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)' }}>
                      {formatSignedCurrency(t.pnl)} ({formatPercent(t.pnlPercent)})
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                      {new Date(t.closedAt).toLocaleTimeString()}
                    </span>
                  </Td>
                </Tr>
              ))
            : Array.from({ length: GHOST_ROWS }).map((_, i) => (
                <Tr key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <Td key={j} align="left"><AwaitingValue size="sm" /></Td>
                  ))}
                </Tr>
              ))}
        </tbody>
      </TableShell>

      {total > MAX_ROWS && (
        <p className="text-2xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
          Showing the {MAX_ROWS} most recent of {total} settled positions.
        </p>
      )}
      {total === 0 && (
        <p className="text-2xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
          No positions have settled this session. /api/positions/history is live and will populate
          this blotter as the engine opens and closes positions.
        </p>
      )}
    </div>
  )
}
