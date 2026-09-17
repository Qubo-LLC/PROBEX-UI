'use client'

// SignalReport — what the analytics engine says about its own signals, shown
// to the extent it can be believed.
//
// ─── What replaced what ──────────────────────────────────────────────────────
// AnalyticsEngineStatus rendered whatever keys the wire carried, verbatim:
// "correct predictions 0 · accuracy 0" on every signal row, "wins 0 · losses
// 6 · total pnl 0" per hour. Read as a table, that says every signal has been
// wrong 100% of the time — a damning finding about the engine. It is not. The
// analytics engine's outcome columns are not joined to the settled ledger
// (six losses with zero P&L is the signature — see lib/mappers/analytics),
// so the finding is "the join has not happened", and the page said so only in
// a warning paragraph beneath six equally weighted metrics.
//
// This shows what IS evidence — which signals fire, how often, at what edge,
// in which hours — and withholds the outcome columns with the reason, until
// the wire reports figures the ledger agrees with. It also absorbs the old
// "Signal Accuracy — awaiting" module, which was an empty chart saying the
// same thing at chart size.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { formatPercent, formatSignedCurrency } from '@/lib/utils'
import { formatEdgePct } from '@/lib/display/engine'
import { parseSignalRows, parseHourlyRows, outcomesReconciled } from '@/lib/mappers/analytics'
import { certaintyFromSlice } from '@/components/shared/Figure'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'

export function SignalReport() {
  const summarySlice = useApplicationStore((s) => s.engine.analyticsSummary)
  const signalsSlice = useApplicationStore((s) => s.engine.analyticsSignals)
  const hourlySlice  = useApplicationStore((s) => s.engine.analyticsHourly)
  const ledgerSlice  = useApplicationStore((s) => s.engine.tradesLedger)

  const signals = useMemo(() => parseSignalRows(signalsSlice.data?.signals ?? []), [signalsSlice.data])
  const hourly  = useMemo(() => parseHourlyRows(hourlySlice.data?.hourly ?? []), [hourlySlice.data])
  const reconciled = useMemo(() => outcomesReconciled(hourly), [hourly])

  const analysed = summarySlice.data?.summary.totalTradesAnalyzed ?? null
  const settled  = ledgerSlice.data?.count ?? null
  const cert = certaintyFromSlice(signalsSlice, 30_000)
  const cell = cert.certainty === 'stale' ? 'c-stale' : ''

  const unavailable = signalsSlice.status === 'error' && hourlySlice.status === 'error'

  return (
    <section aria-labelledby="an-signals" className="flex flex-col gap-5 pt-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <h2 id="an-signals" className="t-section-title">Signal report</h2>
          <span className="t-description">the analytics engine&rsquo;s own account</span>
          <Popover
            label="About the signal report"
            trigger={(p) => <InfoButton what="the signal report" {...p} />}
          >
            <PopoverTitle>Occurrences are evidence; outcomes are not yet</PopoverTitle>
            <PopoverText>
              The analytics engine counts which signals fired on each analysed trade and
              at what edge. Those counts are shown as reported.
            </PopoverText>
            <PopoverText>
              Its per-signal accuracy and per-hour P&amp;L are withheld while they disagree
              with the settled ledger — it currently reports losses with zero P&amp;L, which
              means outcomes have not been joined to signal history. The columns appear the
              moment the engine reports figures the ledger agrees with. Until then, whether
              a signal is right is on the ledger, not here.
            </PopoverText>
          </Popover>
        </span>
        <span className="t-metadata">
          {analysed !== null && `${analysed} trade${analysed === 1 ? '' : 's'} analysed`}
          {analysed !== null && settled !== null && analysed < settled && ` · ${settled} settled`}
          {cert.certainty === 'stale' && <span className="ml-1.5" style={{ color: 'var(--probex-warning)' }}>· stale {cert.staleFor}</span>}
        </span>
      </div>

      {!reconciled && (
        // Not a warning box: a qualifier at the description register. The
        // outcome columns are absent from the tables beneath, which is the
        // treatment; this line says why once.
        <p className="t-description max-w-3xl">
          Accuracy and P&amp;L columns are withheld — the analytics engine reports losses
          with zero P&amp;L, so its outcomes are not yet joined to the ledger. Signal
          occurrence counts are unaffected.
        </p>
      )}

      {unavailable ? (
        <p className="t-description">The analytics endpoints did not answer.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
          {/* ── Signals ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2 min-w-0">
            <h3 className="t-label">Signals fired</h3>
            {signals.length === 0 ? (
              <p className="t-helper">{signalsSlice.data ? 'No signals recorded yet.' : 'Waiting for /api/analytics/signals.'}</p>
            ) : (
              <TableShell label="Signals fired on analysed trades">
                <Thead>
                  <Th align="left" dense grow>Signal</Th>
                  <Th align="right" dense>Fired</Th>
                  {reconciled && <Th align="right" dense>Correct</Th>}
                  {reconciled && <Th align="right" dense hideBelow="sm">Accuracy</Th>}
                  {reconciled && <Th align="right" dense hideBelow="md">Edge when right</Th>}
                </Thead>
                <tbody>
                  {signals.map((s) => (
                    <Tr key={s.name}>
                      <Td align="left" dense grow className={cell}>
                        <span className="font-mono block truncate" style={{ color: 'var(--probex-text-primary)' }}>{s.name}</span>
                      </Td>
                      <Td align="right" dense className={cell}><span className="font-mono font-semibold">{s.occurrences}</span></Td>
                      {reconciled && <Td align="right" dense className={cell}><span className="font-mono">{s.correct}</span></Td>}
                      {reconciled && (
                        <Td align="right" dense hideBelow="sm" className={cell}>
                          <span className="font-mono font-semibold" style={{ color: s.accuracy >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-text-secondary)' }}>
                            {formatPercent(s.accuracy)}
                          </span>
                        </Td>
                      )}
                      {reconciled && <Td align="right" dense hideBelow="md" className={cell}><span className="font-mono">{formatEdgePct(s.avgEdgeCorrect)}</span></Td>}
                    </Tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </div>

          {/* ── Hours ───────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2 min-w-0">
            <h3 className="t-label">By hour analysed</h3>
            {hourly.length === 0 ? (
              <p className="t-helper">{hourlySlice.data ? 'No hours recorded yet.' : 'Waiting for /api/analytics/hourly.'}</p>
            ) : (
              <TableShell label="Analysed trades by hour">
                <Thead>
                  <Th align="left" dense grow>Hour</Th>
                  <Th align="right" dense>Trades</Th>
                  <Th align="right" dense>Avg edge</Th>
                  {reconciled && <Th align="right" dense hideBelow="sm">Won</Th>}
                  {reconciled && <Th align="right" dense hideBelow="sm">P&amp;L</Th>}
                </Thead>
                <tbody>
                  {hourly.map((h) => (
                    <Tr key={h.hour}>
                      <Td align="left" dense grow className={cell}><span className="font-mono" style={{ color: 'var(--probex-text-primary)' }}>{h.label}</span></Td>
                      <Td align="right" dense className={cell}><span className="font-mono font-semibold">{h.trades}</span></Td>
                      <Td align="right" dense className={cell}><span className="font-mono">{formatEdgePct(h.avgEdgePct)}</span></Td>
                      {reconciled && <Td align="right" dense hideBelow="sm" className={cell}><span className="font-mono">{h.wins}</span></Td>}
                      {reconciled && (
                        <Td align="right" dense hideBelow="sm" className={cell}>
                          <span className="font-mono" style={{ color: h.totalPnl > 0 ? 'var(--probex-positive)' : h.totalPnl < 0 ? 'var(--probex-negative)' : undefined }}>
                            {formatSignedCurrency(h.totalPnl, true)}
                          </span>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
