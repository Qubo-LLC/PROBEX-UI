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

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { certaintyFromSlice } from '@/components/shared/Figure'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { formatEdgePct } from '@/lib/display/engine'
import { marketIdentity } from '@/lib/display/positionDisplay'
import { clockOrDate, formatSeconds as formatHold } from '@/lib/display/time'
import { selectPerformanceSource } from '@/lib/display/performanceSource'
import { readFinancialTrust, suppressesTone } from '@/lib/display/financialTrust'
import { describeHistoryScope } from '@/lib/display/historyScope'
import { ROUTES } from '@/config/constants'

const MAX_ROWS = 30

export function SettledPositions() {
  const historySlice = useApplicationStore((s) => s.engine.positionsHistory)
  const paperStats   = useApplicationStore((s) => s.engine.paperStats)
  const execution    = useApplicationStore((s) => s.engine.executionStatus)
  const identity     = useApplicationStore((s) => s.engine.identity)
  const [showAll, setShowAll] = useState(false)

  const history = historySlice.data ?? null

  // The header totals are SESSION-scoped, from the same mode-selected surface
  // Overview uses. They used to come from the trade-ledger summary, which the
  // engine computes over the PAGE this console requested (200) — so it read
  // "200W" beside a figure for a different population.
  const session = selectPerformanceSource({
    engineMode:      identity.data?.mode ?? execution.data?.mode ?? null,
    paperStats:      paperStats.data,
    executionStatus: execution.data,
  }).metrics

  const sorted = useMemo(
    () => (history?.history ?? []).slice().sort((a, b) => b.closedAt - a.closedAt),
    [history],
  )
  const rows = showAll ? sorted : sorted.slice(0, MAX_ROWS)
  // `history.count` is the page length the engine returned — never a total.
  const scope = describeHistoryScope({ shown: rows.length, loaded: sorted.length, sessionTotal: session?.totalTrades ?? null, cursorTotal: history?.total ?? null })
  const trust = readFinancialTrust({ trades: history?.history ?? null, sourceStatus: historySlice.status, engineIntegrity: paperStats.data?.integrity ?? null })
  // Until the record has loaded there is no evidence either way, so no
  // gain/loss colour: the session totals arrive first and used to flash green.
  const neutral = suppressesTone(trust) || history === null
  const cert = certaintyFromSlice(historySlice, 30_000)
  const cell = cert.certainty === 'stale' ? 'c-stale' : ''

  return (
    <section aria-labelledby="pos-settled" className="flex flex-col gap-3 pt-6" style={{ borderTop: '1px solid var(--synatra-border)' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-baseline gap-2.5 flex-wrap">
          <h2 id="pos-settled" className="t-section-title">Settled positions</h2>
          {session && (session.wins > 0 || session.losses > 0) && (
            <span className="font-mono text-2xs tabular-nums" style={{ color: 'var(--synatra-text-muted)' }} title="Whole session, not this page">
              session{' '}
              <span style={neutral ? undefined : { color: 'var(--synatra-positive)' }}>{session.wins}W</span>
              {' · '}
              <span style={neutral ? undefined : { color: 'var(--synatra-negative)' }}>{session.losses}L</span>
              {' · '}
              <span style={neutral ? undefined : { color: session.totalPnl > 0 ? 'var(--synatra-positive)' : session.totalPnl < 0 ? 'var(--synatra-negative)' : undefined }}>
                {formatSignedCurrency(session.totalPnl)}
              </span>
            </span>
          )}
        </span>
        <span className="t-metadata">
          {history !== null && scope.line}
          {cert.certainty === 'stale' && <span className="ml-1.5" style={{ color: 'var(--synatra-warning)' }}>· stale {cert.staleFor}</span>}
        </span>
      </div>

      {trust && (
        <p role="status" className="t-description" style={{ color: 'var(--synatra-warning)' }}>
          <span className="font-semibold">{trust.headline}.</span> {trust.detail}
        </p>
      )}

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
              const tone = won ? 'var(--synatra-positive)' : 'var(--synatra-negative)'
              const isYes = t.direction === 'yes'
              return (
                <Tr key={`${t.marketId}-${t.closedAt}`} accent={tone}>
                  <Td align="left" dense grow className={cell}>
                    <span className="flex items-baseline gap-2 min-w-0">
                      <span className="text-2xs font-black uppercase tracking-widest flex-shrink-0" style={{ color: isYes ? 'var(--synatra-yes)' : 'var(--synatra-no)' }}>
                        {t.direction}
                      </span>
                      {/* No `question` on this wire — asset + window length
                          is the readable identity, the id stays in the tooltip. */}
                      <span className="font-semibold truncate min-w-0" style={{ color: 'var(--synatra-text-primary)' }} title={t.marketId}>
                        {marketIdentity(t.assetSymbol, t.durationMinutes, t.marketId)}
                      </span>
                      <span className="text-2xs font-semibold flex-shrink-0" style={{ color: tone }}>{won ? 'won' : 'lost'}</span>
                    </span>
                    <span className="md:hidden block font-mono text-2xs mt-0.5 truncate" style={{ color: 'var(--synatra-text-muted)' }}>
                      {clockOrDate(t.closedAt)}
                      <span className="sm:hidden"> · {formatCurrency(t.size)} · {formatHold(t.holdTimeSeconds)}</span>
                      <span className="hidden sm:inline"> · {t.entryPrice.toFixed(1)}¢ → {t.exitPrice !== null ? `${t.exitPrice.toFixed(1)}¢` : 'resolved'}</span>
                    </span>
                  </Td>
                  <Td align="right" dense hideBelow="md" className={cell}>
                    <span className="font-mono" style={{ color: 'var(--synatra-text-secondary)' }}>
                      {t.entryPrice.toFixed(1)}¢ → {t.exitPrice !== null ? `${t.exitPrice.toFixed(1)}¢` : 'resolved'}
                    </span>
                  </Td>
                  <Td align="right" dense className={cell}>
                    <span className="font-mono font-semibold" style={{ color: tone }}>{formatSignedCurrency(t.pnl)}</span>
                    <span className="hidden sm:inline font-mono text-2xs ml-1.5" style={{ color: 'var(--synatra-text-muted)' }}>{formatPercent(t.pnlPercent)}</span>
                  </Td>
                  <Td align="right" dense hideBelow="sm" className={cell}><span className="font-mono">{formatCurrency(t.size)}</span></Td>
                  <Td align="right" dense hideBelow="lg" className={cell}><span className="font-mono">{formatEdgePct(t.edgePct)}</span></Td>
                  <Td align="right" dense hideBelow="sm" className={cell}><span className="font-mono" style={{ color: 'var(--synatra-text-muted)' }}>{formatHold(t.holdTimeSeconds)}</span></Td>
                  <Td align="right" dense hideBelow="md" className={cell}>
                    <span className="font-mono" style={{ color: 'var(--synatra-text-muted)' }} title={new Date(t.closedAt).toLocaleString()}>
                      {clockOrDate(t.closedAt)}
                    </span>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </TableShell>
      )}

      {/* Reveals rows this console already holds — it does not page the
          engine. Real paging waits for the backend cursor contract (spec §8). */}
      {sorted.length > MAX_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="focus-ring self-start text-2xs font-semibold"
          style={{ color: 'var(--synatra-primary)' }}
          aria-expanded={showAll}
        >
          {showAll ? `Show the most recent ${MAX_ROWS}` : `Show all ${sorted.length} loaded`}
        </button>
      )}

      {/* Paging through the WHOLE settled record lives in one place — the
          Trade ledger reads the same records with the engine's cursor where
          the engine supports one. This section stays the recent view. */}
      <Link href={ROUTES.LEDGER} className="focus-ring self-start text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>
        Browse the full settled history on the Trade ledger →
      </Link>
      <Link href={ROUTES.ANALYTICS} className="focus-ring self-start text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>
        Where these results come from, on Analytics →
      </Link>
    </section>
  )
}
