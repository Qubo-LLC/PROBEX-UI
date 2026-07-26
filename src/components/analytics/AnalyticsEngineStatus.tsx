'use client'

// AnalyticsEngineStatus — surfaces the five /api/analytics/* endpoints that
// were previously polled into the store and never rendered.
//
// All five currently return zeros/empties, so the honest presentation is not
// four empty tables. It is one panel that reports what the analytics engine
// says about itself and names the discrepancy: the engine reports
// `total_trades_analyzed: 0` while the trade ledger reports 100+ settled
// trades. That contradiction is the useful signal — it tells the operator the
// analytics are not merely "waiting for data" but inconsistent with the rest of
// the system, and that it is a known backend issue rather than a UI fault.
//
// NOT explained by paper vs. live mode (unlike the execution/orders and
// execution/trades gaps — see OrdersTable.tsx): analytics is pure computation
// over already-settled trade history, and that history exists regardless of
// mode. There is no live-only subsystem boundary here to justify the zeros.
//
// The tables below activate automatically once the arrays populate; the guard
// is on array length, not on a hardcoded assumption that they are empty.

import { useApplicationStore } from '@/store/applicationStore'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { formatSignedCurrency, formatPercent } from '@/lib/utils'

export function AnalyticsEngineStatus() {
  const summarySlice  = useApplicationStore((s) => s.engine.analyticsSummary)
  const signalsSlice  = useApplicationStore((s) => s.engine.analyticsSignals)
  const hourlySlice   = useApplicationStore((s) => s.engine.analyticsHourly)
  const topSlice      = useApplicationStore((s) => s.engine.analyticsTopSegments)
  const ledgerSlice   = useApplicationStore((s) => s.engine.tradesLedger)

  const summary = summarySlice.status === 'success' ? summarySlice.data?.summary ?? null : null
  const signals = signalsSlice.status === 'success' ? signalsSlice.data?.signals ?? [] : []
  const hourly  = hourlySlice.status  === 'success' ? hourlySlice.data?.hourly  ?? [] : []
  const top     = topSlice.status     === 'success' ? topSlice.data?.topSegments ?? [] : []
  const ledger  = ledgerSlice.status  === 'success' ? ledgerSlice.data : null

  const analysed  = summary?.totalTradesAnalyzed ?? 0
  const settled   = ledger?.count ?? 0
  // The engine claiming zero analysed trades while trades have demonstrably
  // settled is a backend inconsistency worth stating plainly.
  const mismatch  = analysed === 0 && settled > 0
  const populated = signals.length > 0 || hourly.length > 0 || top.length > 0

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>
            Analytics Engine
          </h2>
          <p className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            Segment, signal and hourly attribution computed by the backend
          </p>
        </div>
        <ProvenanceBadge provenance={mismatch ? 'awaiting' : 'live'} detail="/api/analytics/*" />
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Metric label="Trades analysed" value={String(analysed)} warn={mismatch} />
          <Metric label="Win rate"  value={summary ? formatPercent(summary.overallWinRate) : '—'} />
          <Metric label="Total P&L" value={summary ? formatSignedCurrency(summary.totalPnl) : '—'} />
          <Metric label="Segments"  value={String(summary?.segmentCount ?? 0)} />
          <Metric label="Signals"   value={String(summary?.signalCount ?? 0)} />
          <Metric label="History"   value={String(summary?.historySize ?? 0)} />
        </div>

        {mismatch && (
          <div
            className="rounded-lg p-2.5 text-2xs leading-relaxed"
            style={{ background: 'var(--probex-warning-dim, var(--probex-surface-2))', color: 'var(--probex-text-secondary)', border: '1px solid var(--probex-border-default)' }}
          >
            <span className="font-semibold" style={{ color: 'var(--probex-warning)' }}>Engine reports no analysed trades. </span>
            The analytics engine says it has processed <strong>0</strong> trades, but the trade
            ledger records <strong>{settled}</strong> settled. Segment, signal and hourly
            attribution stay empty until the backend connects them — reported as finding D-03.
            Meanwhile, <strong>Segment Performance</strong> below is sourced from{' '}
            <span className="mono">/api/survival/patterns</span>, which does report real
            per-hour and per-edge-bucket data.
          </div>
        )}

        {populated && (
          <div className="flex flex-col gap-4">
            {top.length > 0 && (
              <Section title="Top segments">
                <RawTable rows={top} />
              </Section>
            )}
            {signals.length > 0 && (
              <Section title="Signal effectiveness">
                <RawTable rows={signals} />
              </Section>
            )}
            {hourly.length > 0 && (
              <Section title="Hourly breakdown">
                <RawTable rows={hourly} />
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs uppercase tracking-wider" style={{ color: 'var(--probex-text-disabled)' }}>{label}</span>
      <span
        className="text-base font-bold tabular-nums"
        style={{ color: warn ? 'var(--probex-warning)' : 'var(--probex-text-primary)' }}
      >
        {value}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>{title}</h3>
      {children}
    </div>
  )
}

/**
 * Renders whatever keys the rows actually carry.
 *
 * These arrays are typed `unknown[]` because the backend has never returned a
 * non-empty sample, so there is no schema to code against. Rather than guess at
 * field names — which would silently render nothing when they turn out wrong,
 * the exact failure mode that hid live position data before — this derives
 * columns from the first row at runtime. It is deliberately generic: when a
 * real sample lands it can be replaced with a typed table.
 */
function RawTable({ rows }: { rows: unknown[] }) {
  const objects = rows.filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
  if (objects.length === 0) return null

  const columns = Object.keys(objects[0]!)

  return (
    <TableShell label="Analytics rows">
      <Thead>
        {columns.map((c) => (
          <Th key={c} align="left">{c.replace(/_/g, ' ')}</Th>
        ))}
      </Thead>
      <tbody>
        {objects.slice(0, 24).map((row, i) => (
          <Tr key={i}>
            {columns.map((c) => {
              const v = row[c]
              return (
                <Td key={c} align="left">
                  <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                    {v === null || v === undefined
                      ? '—'
                      : typeof v === 'object'
                        ? JSON.stringify(v)
                        : String(v)}
                  </span>
                </Td>
              )
            })}
          </Tr>
        ))}
      </tbody>
    </TableShell>
  )
}
