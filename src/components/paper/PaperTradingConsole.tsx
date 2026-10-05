'use client'

// PaperTradingConsole — what the paper session has recorded.
//
// A RECORD of simulated execution, not a live execution console: the engine
// prices a trade, records it, and later settles it against the window's
// outcome. Nothing is sent anywhere. Sources: /api/paper-stats (the session's
// figures), /api/paper/status (enabled, pending/completed counts), and the
// event log for the trade and resolution events the session wrote.
//
// ─── Boundaries ──────────────────────────────────────────────────────────────
//   settlements, one by one, with the balance after each → Capital & Ledger
//   the positions themselves                              → Positions
//   why a trade was taken                                → not on the wire
//
// paper-stats.total_trades and paper/status.completed_trades are two counters
// in the engine's own bookkeeping; when they differ, both are shown and the
// difference is named rather than reconciled here.
//
// ─── What changed (2026-09-16) ───────────────────────────────────────────────
// Ten StatCards, a Card per breakdown with its own mini-grid, and a third
// copy of the settled ledger became: a posture sentence, Figures for the
// session, an outcomes ledger, two DataTable breakdowns (hours labelled UTC —
// the engine's clock — rather than bare "22:00"), and the session's own
// events on the shared EventStream.

import { useMemo } from 'react'
import { stamp, clockOrDate } from '@/lib/display/time'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { useMarketLookup } from '@/config/hooks/useMarketLookup'
import { parseEventRows, collapseConsecutiveRepeats } from '@/lib/mappers/events'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { survivalStateColor, survivalStateLabel } from '@/lib/display/engine'
import { bucketRows, hourLabel } from '@/lib/display/execution'
import { ROUTES } from '@/config/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState } from '@/components/ui/ErrorState'
import { StatusChip } from '@/components/ui/StatusChip'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { EventStream } from '@/components/shared/EventStream'
import { PaperTradingControls } from './PaperTradingControls'
import type { BucketRow } from '@/lib/display/execution'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

const POLL_MS = 5_000
const PAPER_EVENTS = new Set(['trade', 'resolution'])
const RECENT_EVENTS = 8


export function PaperTradingConsole({ embedded = false }: EmbeddableProps = {}) {
  const statsSlice  = useApplicationStore((s) => s.engine.paperStats)
  const statusSlice = useApplicationStore((s) => s.engine.paperStatus)
  const events      = useApplicationStore((s) => s.engine.events)
  const lookup      = useMarketLookup()

  const p      = statsSlice.data?.paperTrading ?? null
  const status = statusSlice.data ?? null
  const cert   = certaintyFromSlice(statsSlice, POLL_MS)
  const net    = p ? p.currentCapital - p.initialCapital : null

  const recent = useMemo(() => {
    if (!events.data) return null
    const parsed = parseEventRows(events.data)
    if (parsed.kind !== 'rows') return []
    return collapseConsecutiveRepeats(parsed.rows.filter((r) => PAPER_EVENTS.has(r.type.toLowerCase()))).slice(0, RECENT_EVENTS)
  }, [events.data])

  const edgeBuckets  = useMemo(() => (p ? bucketRows(p.edgeBuckets) : []), [p])
  const hourlyBuckets = useMemo(() => (p ? bucketRows(p.hourlyPerformance, hourLabel) : []), [p])

  return (
    <div className={pageShell(embedded, 'gap-5')}>
      {!embedded && (
        <PageHeader title="Paper Trading" subtitle="What the paper session has recorded — simulated trades, their outcomes, and the events it wrote" />
      )}

      {/* ── A · session posture ──────────────────────────────────────────── */}
      <section aria-label="Paper session state" className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="t-label">Paper session</span>
          {status ? (
            <StatusChip tone={status.enabled ? 'positive' : 'neutral'} dot={false}>{status.enabled ? 'ENABLED' : 'DISABLED'}</StatusChip>
          ) : (
            <StatusChip tone="warning" dot={false}>{statusSlice.status === 'error' ? 'STATUS UNKNOWN' : 'STATUS PENDING'}</StatusChip>
          )}
          {p && <span className="t-helper">since {stamp(p.sessionStart)} · /api/paper-stats · /api/paper/status</span>}
        </div>
        <p className="text-sm font-medium leading-relaxed m-0" style={{ color: 'var(--synatra-text-primary)' }}>
          {p === null
            ? statsSlice.status === 'error' ? 'The paper session did not answer — what it has recorded is unknown.' : 'Waiting for the paper session.'
            : p.totalTrades === 0
              ? `Recording, nothing settled yet — capital is the ${formatCurrency(p.initialCapital)} it started with.`
              : `${p.totalTrades} simulated trade${p.totalTrades === 1 ? '' : 's'} settled: ${p.wins} won, ${p.losses} lost${p.pushes > 0 ? `, ${p.pushes} pushed` : ''} — ${formatSignedCurrency(p.totalPnl)} on ${formatCurrency(p.initialCapital)} of starting capital${p.pending > 0 ? `, ${p.pending} still pending` : ''}.`}
        </p>
        {status && p && status.completedTrades !== p.totalTrades && (
          <p className="t-helper m-0" style={{ color: 'var(--synatra-warning)' }}>
            Two engine counters disagree: /api/paper-stats reports {p.totalTrades} trades, /api/paper/status reports {status.completedTrades} completed ({status.pendingTrades} pending). Both are the engine’s own; neither is chosen here.
          </p>
        )}
      </section>

      {/* Controls render regardless of stats: a session in a bad state is
          exactly when stop/reset must be reachable. */}
      <PaperTradingControls />

      {/* ── B · the session's figures ────────────────────────────────────── */}
      {statsSlice.status === 'error' && !p && (
        <ErrorState title="Paper session data did not answer" description={statsSlice.error?.message ?? 'No response from /api/paper-stats.'} fullPage={false} />
      )}
      {p && (
        <section aria-labelledby="pt-figures" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span className="flex items-baseline gap-2 flex-wrap">
              <h2 id="pt-figures" className="t-section-title">The session</h2>
              <span className="t-description">capital and outcomes as the paper engine reports them</span>
            </span>
            <span className="flex items-baseline gap-3">
              <span className="t-metadata">/api/paper-stats</span>
              <Link href={`${ROUTES.PORTFOLIO}?view=capital`} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>Settlements on Capital &amp; Ledger →</Link>
            </span>
          </div>
          <div className="flex items-start gap-x-8 gap-y-3 flex-wrap">
            <Figure label="Capital" size="lg" title="current_capital" footnote={<span className="t-helper">from {formatCurrency(p.initialCapital)} at session start</span>} {...cert}>
              {formatCurrency(p.currentCapital)}
            </Figure>
            <Figure label="Session P&L" size="md" tone={p.totalPnl > 0 ? 'var(--synatra-positive)' : p.totalPnl < 0 ? 'var(--synatra-negative)' : undefined} title="total_pnl" footnote={net !== null && Math.abs(net - p.totalPnl) > 0.005 ? <span className="t-helper" style={{ color: 'var(--synatra-warning)' }}>capital moved {formatSignedCurrency(net)} — differs</span> : <span className="t-helper">equals the capital change</span>} {...cert}>
              {formatSignedCurrency(p.totalPnl)}
            </Figure>
            <Figure label="Trades" size="md" title="total_trades" footnote={<span className="t-helper">{p.totalTrades > 0 ? `${p.wins} won · ${p.losses} lost${p.pushes > 0 ? ` · ${p.pushes} pushed` : ''}` : 'none settled'}</span>} {...cert}>
              {p.totalTrades}
            </Figure>
            {p.totalTrades > 0 ? (
              <Figure label="Win rate" size="md" title="win_rate" footnote={<span className="t-helper">of settled trades</span>} {...cert}>
                {formatPercent(p.winRate)}
              </Figure>
            ) : (
              <Figure label="Win rate" size="md" certainty="absent" absentReason="no trade has settled">—</Figure>
            )}
            <Figure label="Pending" size="md" title="pending — recorded, not yet settled" footnote={status ? <span className="t-helper">{status.pendingTrades} per /api/paper/status</span> : undefined} {...cert}>
              {p.pending}
            </Figure>
          </div>

          {p.totalTrades > 0 && (
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2 m-0">
              <Outcome label="Average win" value={p.avgWin !== 0 ? formatSignedCurrency(p.avgWin) : '—'} tone={p.avgWin > 0 ? 'var(--synatra-positive)' : undefined} />
              <Outcome label="Average loss" value={p.avgLoss !== 0 ? formatSignedCurrency(p.avgLoss) : '—'} tone={p.avgLoss < 0 ? 'var(--synatra-negative)' : undefined} />
              <Outcome label="Largest win" value={p.largestWin !== 0 ? formatSignedCurrency(p.largestWin) : '—'} tone={p.largestWin > 0 ? 'var(--synatra-positive)' : undefined} />
              <Outcome label="Largest loss" value={p.largestLoss !== 0 ? formatSignedCurrency(p.largestLoss) : '—'} tone={p.largestLoss < 0 ? 'var(--synatra-negative)' : undefined} />
            </dl>
          )}

          {p.survivalStates.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="t-label">Survival states this session</span>
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 list-none m-0 p-0">
                {p.survivalStates.map(([ts, state], i) => (
                  <li key={`${ts}-${i}`} className="flex items-center gap-1.5 text-2xs">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: survivalStateColor(state) }} aria-hidden="true" />
                    <span className="font-semibold" style={{ color: survivalStateColor(state) }}>{survivalStateLabel(state)}</span>
                    <span className="font-mono" style={{ color: 'var(--synatra-text-disabled)' }}>{clockOrDate(ts)}</span>
                    {i < p.survivalStates.length - 1 && <span aria-hidden="true" style={{ color: 'var(--synatra-text-disabled)' }}>→</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {/* ── C · breakdowns ───────────────────────────────────────────────── */}
      {p && p.totalTrades > 0 && (
        <section aria-labelledby="pt-breakdown" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span className="flex items-baseline gap-2 flex-wrap">
              <h2 id="pt-breakdown" className="t-section-title">By edge bucket and hour</h2>
              <span className="t-description">the paper engine’s own tallies; hours are on its clock, which is UTC</span>
            </span>
            <span className="t-metadata">/api/paper-stats</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <BucketLedger label="By edge bucket" head="Edge bucket" rows={edgeBuckets} />
            <BucketLedger label="By hour" head="Hour (UTC)" rows={hourlyBuckets} />
          </div>
        </section>
      )}

      {/* ── D · what the session wrote ───────────────────────────────────── */}
      <section aria-labelledby="pt-events" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-baseline gap-2 flex-wrap">
            <h2 id="pt-events" className="t-section-title">Recorded activity</h2>
            <span className="t-description">the trade and resolution events the engine wrote, newest first</span>
          </span>
          <span className="flex items-baseline gap-3">
            <span className="t-metadata">/api/events</span>
            <Link href={`${ROUTES.SYSTEM}?view=events&type=trade`} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>All trade events →</Link>
          </span>
        </div>
        {events.status === 'error' && !events.data ? (
          <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>The event log did not answer — what the session recorded is unknown.</p>
        ) : recent === null ? (
          <p className="t-description">Waiting for the event log.</p>
        ) : recent.length === 0 ? (
          <p className="t-description">No trade or resolution events in the engine’s retained log.</p>
        ) : (
          <EventStream rows={recent} compact lookup={lookup} />
        )}
      </section>
    </div>
  )
}

function Outcome({ label, value, tone }: { label: string; value: string; tone?: string | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="t-label truncate">{label}</dt>
      <dd className="m-0 font-mono text-xs font-semibold tabular-nums" style={{ color: tone ?? 'var(--synatra-text-primary)' }}>{value}</dd>
    </div>
  )
}

function BucketLedger({ label, head, rows }: { label: string; head: string; rows: BucketRow[] }) {
  if (rows.length === 0) return <p className="t-description">{label}: nothing tallied yet.</p>
  return (
    <TableShell label={label}>
      <Thead>
        <Th align="left" dense grow>{head}</Th>
        <Th align="right" dense>Trades</Th>
        <Th align="right" dense>Win rate</Th>
        <Th align="right" dense hideBelow="sm">P&amp;L</Th>
      </Thead>
      <tbody>
        {rows.map((r) => (
          <Tr key={r.key} accent={r.totalPnl > 0 ? 'var(--synatra-positive)' : r.totalPnl < 0 ? 'var(--synatra-negative)' : undefined}>
            <Td align="left" dense grow>
              <span className="font-medium" style={{ color: 'var(--synatra-text-primary)' }}>{r.label}</span>
              <span className="sm:hidden block font-mono text-2xs mt-0.5" style={{ color: 'var(--synatra-text-muted)' }}>{formatSignedCurrency(r.totalPnl)}</span>
            </Td>
            <Td align="right" dense><span className="font-mono tabular-nums">{r.trades} <span style={{ color: 'var(--synatra-text-muted)' }}>({r.wins}W {r.losses}L)</span></span></Td>
            <Td align="right" dense><span className="font-mono tabular-nums font-semibold" style={{ color: r.winRate >= 0.5 ? 'var(--synatra-positive)' : 'var(--synatra-text-secondary)' }}>{formatPercent(r.winRate)}</span></Td>
            <Td align="right" dense hideBelow="sm"><span className="font-mono tabular-nums" style={{ color: r.totalPnl > 0 ? 'var(--synatra-positive)' : r.totalPnl < 0 ? 'var(--synatra-negative)' : 'var(--synatra-text-secondary)' }}>{formatSignedCurrency(r.totalPnl)}</span></Td>
          </Tr>
        ))}
      </tbody>
    </TableShell>
  )
}
