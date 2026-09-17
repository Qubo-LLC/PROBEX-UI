'use client'

// SettledPositions — the engine's closed-trade record, as a ledger.
//
// Sourced from /api/positions/history, NOT /api/execution/trades. The two are
// not describing the same thing: /api/execution/* tracks REAL order-submission
// activity, and the engine is in paper mode, so that subsystem is legitimately
// empty. positions/history is the paper-trading record, shares its row schema
// with /api/trades/ledger, and is the right source for what has actually
// happened, regardless of mode (see docs/API_AUDIT.md §0.10).
//
// ─── Grammar ─────────────────────────────────────────────────────────────────
// Eight fixed columns scrolled sideways on a phone; the identity ("BTC 15m")
// is now the elastic column with the settled time beneath it at narrow
// widths, and the supplementary columns fold below sm / md. Each row's result
// is its one state carrier — won or lost, at the edge — which is what the
// eye scans a blotter for.

import { useMemo } from 'react'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { certaintyFromSlice } from '@/components/shared/Figure'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { formatEdgePct } from '@/lib/display/engine'
import { marketIdentity } from '@/lib/display/positionDisplay'
import { clockOrDate, formatSeconds as formatHold } from '@/lib/display/time'
import { ROUTES } from '@/config/constants'

const MAX_ROWS = 30

export function SettledPositions() {
  const historySlice = useApplicationStore((s) => s.engine.positionsHistory)
  const ledgerSlice  = useApplicationStore((s) => s.engine.tradesLedger)

  const history = historySlice.data ?? null
  const summary = ledgerSlice.data?.summary ?? null

  const rows = useMemo(
    () => (history?.history ?? []).slice().sort((a, b) => b.closedAt - a.closedAt).slice(0, MAX_ROWS),
    [history],
  )
  const total = history?.count ?? 0
  const cert = certaintyFromSlice(historySlice, 30_000)
  const cell = cert.certainty === 'stale' ? 'c-stale' : ''

  return (
    <section aria-labelledby="pos-settled" className="flex flex-col gap-3 pt-6" style={{ borderTop: '1px solid var(--probex-border)' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-baseline gap-2.5 flex-wrap">
          <h2 id="pos-settled" className="t-section-title">Settled positions</h2>
          {summary && (summary.wins > 0 || summary.losses > 0) && (
            <span className="font-mono text-2xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
              <span style={{ color: 'var(--probex-positive)' }}>{summary.wins}W</span>
              {' · '}
              <span style={{ color: 'var(--probex-negative)' }}>{summary.losses}L</span>
              {' · '}
              <span style={{ color: summary.totalPnl > 0 ? 'var(--probex-positive)' : summary.totalPnl < 0 ? 'var(--probex-negative)' : undefined }}>
                {formatSignedCurrency(summary.totalPnl)}
              </span>
            </span>
          )}
        </span>
        <span className="t-metadata">
          {total > MAX_ROWS ? `most recent ${MAX_ROWS} of ${total}` : `${total} settled`}
          {cert.certainty === 'stale' && <span className="ml-1.5" style={{ color: 'var(--probex-warning)' }}>· stale {cert.staleFor}</span>}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="t-description">
          {historySlice.status === 'error'
            ? 'The settled-position record did not answer.'
            : historySlice.data === null
              ? 'Waiting for the settled-position record.'
              : 'No positions have settled yet — rows appear here as the engine opens and closes positions.'}
        </p>
      ) : (
        <TableShell label="Settled positions">
          <Thead>
            <Th align="left" dense grow>Position</Th>
            <Th align="right" dense hideBelow="md">Entry → exit</Th>
            <Th align="right" dense>Realized</Th>
            <Th align="right" dense hideBelow="sm">Stake</Th>
            <Th align="right" dense hideBelow="lg">Edge at entry</Th>
            <Th align="right" dense hideBelow="sm">Held</Th>
            <Th align="right" dense hideBelow="md">Settled</Th>
          </Thead>
          <tbody>
            {rows.map((t) => {
              const won = t.won
              const tone = won ? 'var(--probex-positive)' : 'var(--probex-negative)'
              const isYes = t.direction === 'yes'
              return (
                <Tr key={`${t.marketId}-${t.closedAt}`} accent={tone}>
                  <Td align="left" dense grow className={cell}>
                    <span className="flex items-baseline gap-2 min-w-0">
                      <span className="text-2xs font-black uppercase tracking-widest flex-shrink-0" style={{ color: isYes ? 'var(--probex-yes)' : 'var(--probex-no)' }}>
                        {t.direction}
                      </span>
                      {/* No `question` on this wire — asset + window length
                          is the readable identity, the id stays in the tooltip. */}
                      <span className="font-semibold truncate min-w-0" style={{ color: 'var(--probex-text-primary)' }} title={t.marketId}>
                        {marketIdentity(t.assetSymbol, t.durationMinutes, t.marketId)}
                      </span>
                      <span className="text-2xs font-semibold flex-shrink-0" style={{ color: tone }}>{won ? 'won' : 'lost'}</span>
                    </span>
                    <span className="md:hidden block font-mono text-2xs mt-0.5 truncate" style={{ color: 'var(--probex-text-muted)' }}>
                      {clockOrDate(t.closedAt)}
                      <span className="sm:hidden"> · {formatCurrency(t.size)} · {formatHold(t.holdTimeSeconds)}</span>
                      <span className="hidden sm:inline"> · {t.entryPrice.toFixed(1)}¢ → {t.exitPrice !== null ? `${t.exitPrice.toFixed(1)}¢` : 'resolved'}</span>
                    </span>
                  </Td>
                  <Td align="right" dense hideBelow="md" className={cell}>
                    <span className="font-mono" style={{ color: 'var(--probex-text-secondary)' }}>
                      {t.entryPrice.toFixed(1)}¢ → {t.exitPrice !== null ? `${t.exitPrice.toFixed(1)}¢` : 'resolved'}
                    </span>
                  </Td>
                  <Td align="right" dense className={cell}>
                    <span className="font-mono font-semibold" style={{ color: tone }}>{formatSignedCurrency(t.pnl)}</span>
                    <span className="hidden sm:inline font-mono text-2xs ml-1.5" style={{ color: 'var(--probex-text-muted)' }}>{formatPercent(t.pnlPercent)}</span>
                  </Td>
                  <Td align="right" dense hideBelow="sm" className={cell}><span className="font-mono">{formatCurrency(t.size)}</span></Td>
                  <Td align="right" dense hideBelow="lg" className={cell}><span className="font-mono">{formatEdgePct(t.edgePct)}</span></Td>
                  <Td align="right" dense hideBelow="sm" className={cell}><span className="font-mono" style={{ color: 'var(--probex-text-muted)' }}>{formatHold(t.holdTimeSeconds)}</span></Td>
                  <Td align="right" dense hideBelow="md" className={cell}>
                    <span className="font-mono" style={{ color: 'var(--probex-text-muted)' }} title={new Date(t.closedAt).toLocaleString()}>
                      {clockOrDate(t.closedAt)}
                    </span>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </TableShell>
      )}

      <Link href={ROUTES.ANALYTICS} className="focus-ring self-start text-2xs font-semibold" style={{ color: 'var(--probex-primary)' }}>
        Where these results come from, on Analytics →
      </Link>
    </section>
  )
}
