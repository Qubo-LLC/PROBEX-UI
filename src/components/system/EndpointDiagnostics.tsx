'use client'

// EndpointDiagnostics — the browser's own view of its requests, as a table.
//
// ─── What this replaces, and why ─────────────────────────────────────────────
// DiagnosticsPanel rendered one card per endpoint, each containing a 64px
// RadialGauge with a status-coloured ring, in an auto-fill grid, repainting
// every second. With ~40 endpoints registered that was ~40 animated rings — the
// largest, most colourful cluster on the System page, positioned last.
//
// Two things were wrong with that, and neither was fixable by shrinking them.
//
// 1. VISUAL WEIGHT INVERTED THE READING ORDER. The page's own header declares
//    the order state → health → runtime → diagnostics, and the reason: "a
//    generated '4/4 probes healthy' is indistinguishable from a real one" if
//    you read the evidence before the verdict. Forty rings at the bottom
//    out-shouted every one of those sections.
//
// 2. IT DEVALUED THE GAUGE. A radial gauge is a COMPARISON TO A TARGET — which
//    is why it works for consensus score, edge strength and Kelly utilization,
//    where there is a target to compare against. An HTTP success counter has
//    none. Spending the product's signature primitive forty times on something
//    it does not describe made it mean nothing anywhere.
//
// A table is also simply better at this job: it sorts, it aligns latencies into
// a scannable column, and it makes the slowest or most-failing endpoint findable
// in one pass rather than by comparing forty rings by eye.
//
// ─── What is preserved exactly ───────────────────────────────────────────────
// Every figure, the circuit-breaker "requests paused" disclosure, the
// development-only base-URL gating, and — most importantly — the statement that
// these numbers are CLIENT-side. Rendered as rings beside genuine engine
// telemetry they read as backend truth; the origin stays in the heading where a
// reader scanning instruments actually meets it.

import { useEffect, useState } from 'react'
import { diagnostics, type DiagnosticsSnapshot, type EndpointRecord } from '@/lib/diagnostics'
import { circuitSnapshot } from '@/lib/api/circuitBreaker'
import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'

type SortKey = 'endpoint' | 'success' | 'latency' | 'calls'

export function EndpointDiagnostics() {
  const { deployment } = useRuntimeConfig()

  // The singleton is not reactive — poll a snapshot while the section is open.
  //
  // Cadence note: this used to read every 1000ms, which made the most animated
  // thing on the System page a client-side counter, while the engine's own
  // vitals sat on the 30s tier. 2s matches the fastest thing it can actually be
  // reporting on (the FAST poll tier), and the section is collapsed by default,
  // so on most visits this interval never runs at all.
  const [snap, setSnap] = useState<DiagnosticsSnapshot | null>(null)
  // Endpoints the client has deliberately stopped calling. Without this the
  // operator sees an endpoint go quiet and cannot tell whether the engine
  // stopped answering or the app stopped asking — see circuitBreaker.ts.
  const [paused, setPaused] = useState<ReturnType<typeof circuitSnapshot>>([])
  const [sort, setSort] = useState<SortKey>('endpoint')

  useEffect(() => {
    const read = () => {
      setSnap(diagnostics.snapshot())
      setPaused(circuitSnapshot().filter((c) => c.open))
    }
    read()
    const id = setInterval(read, 2_000)
    return () => clearInterval(id)
  }, [])

  if (!snap) return null

  const records = [...Object.values(snap.endpoints)].sort((a, b) => {
    switch (sort) {
      case 'success': return successRate(a) - successRate(b)          // worst first
      case 'latency': return b.lastDurationMs - a.lastDurationMs       // slowest first
      case 'calls':   return b.count - a.count                         // busiest first
      default:        return a.endpoint.localeCompare(b.endpoint)
    }
  })

  return (
    <section aria-label="Endpoint diagnostics" className="flex flex-col gap-3">
      {/* No heading here: the disclosure button in SystemConsole names this
          section, and repeating it produced the title twice, four lines apart.
          The origin caveat stays — it belongs ABOVE the data, because a reader
          scanning instruments never reaches a footnote. */}
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <span className="t-metadata">
          Not engine-side telemetry — these are this browser&rsquo;s own requests
        </span>
        <span className="t-metadata">
          {snap.apiMode.toUpperCase()} mode · {snap.registryImpl} · {snap.requestCount.toLocaleString()} requests this session
        </span>
      </div>

      {paused.length > 0 && (
        <div
          className="flex flex-col gap-1 px-3 py-2 rounded-md"
          style={{ background: 'var(--synatra-surface-2)', border: '1px solid var(--synatra-border)' }}
          role="status"
        >
          <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--synatra-warning)' }}>
            Requests paused
          </span>
          {paused.map((c) => (
            <span key={c.key} className="text-2xs tabular-nums" style={{ color: 'var(--synatra-text-muted)' }}>
              {c.key} — stopped responding {c.consecutiveFailures}× in a row; retrying in {c.cooldownSeconds}s
            </span>
          ))}
        </div>
      )}

      {records.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--synatra-text-disabled)' }}>
          No requests recorded yet this session.
        </p>
      ) : (
        <TableShell label="Endpoint diagnostics">
          <Thead>
            <Th align="left"><SortButton label="Endpoint" k="endpoint" sort={sort} onSort={setSort} /></Th>
            <Th align="left">Method</Th>
            <Th align="right"><SortButton label="Success" k="success" sort={sort} onSort={setSort} /></Th>
            <Th align="right"><SortButton label="Latency" k="latency" sort={sort} onSort={setSort} /></Th>
            <Th align="right"><SortButton label="Calls" k="calls" sort={sort} onSort={setSort} /></Th>
            <Th align="right">Errors</Th>
          </Thead>
          <tbody>
            {records.map((r) => <EndpointRow key={`${r.method} ${r.endpoint}`} record={r} />)}
          </tbody>
        </TableShell>
      )}

      {/* The engine's address is named only under the development policy —
          elsewhere this section is just as useful without printing an internal
          host onto a console that gets screen-shared. */}
      <p className="t-helper">
        This browser session&rsquo;s requests to{' '}
        {deployment === 'development' && snap.apiBaseUrl ? snap.apiBaseUrl : 'the engine API'} — latency
        includes network transit, not just engine processing.
      </p>
    </section>
  )
}

function successRate(r: EndpointRecord): number {
  return r.count > 0 ? (r.count - r.errorCount) / r.count : 1
}

function EndpointRow({ record: r }: { record: EndpointRecord }) {
  const rate = successRate(r)
  const failing = r.lastStatus === null || r.lastStatus >= 400

  // Same thresholds the gauges used, now carried by the figure's own colour and
  // weight rather than by a ring. A degraded rate is bold as well as coloured,
  // so it survives greyscale.
  const rateColor =
    rate >= 0.95 ? 'var(--synatra-text-secondary)'
    : rate >= 0.8 ? 'var(--synatra-warning)'
    : 'var(--synatra-negative)'

  const latency = Math.round(r.lastDurationMs)
  const slow = latency >= 1000
  const sluggish = latency >= 250 && latency < 1000

  return (
    <Tr>
      <Td align="left">
        <span
          className="flex items-center gap-2 min-w-0"
          title={`${r.method} ${r.endpoint || '/'} — ${Math.round(rate * 100)}% success, ${r.count} call${r.count === 1 ? '' : 's'}, ${r.errorCount} error${r.errorCount === 1 ? '' : 's'}`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: failing ? 'var(--synatra-negative)' : 'var(--synatra-positive)' }}
            aria-hidden="true"
          />
          <span className="truncate font-medium" style={{ color: 'var(--synatra-text-secondary)' }}>
            {r.endpoint || '/'}
          </span>
        </span>
      </Td>
      <Td align="left">
        <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--synatra-text-disabled)' }}>
          {r.method}
        </span>
      </Td>
      <Td align="right">
        <span
          className="tabular-nums"
          style={{ color: rateColor, fontWeight: rate >= 0.95 ? 500 : 700 }}
        >
          {Math.round(rate * 100)}%
        </span>
      </Td>
      <Td align="right">
        <span
          className="tabular-nums"
          style={{
            color: slow ? 'var(--synatra-negative)' : sluggish ? 'var(--synatra-warning)' : 'var(--synatra-text-disabled)',
            fontWeight: slow ? 700 : sluggish ? 600 : 500,
          }}
          {...(slow ? { title: 'Responding slowly' } : {})}
        >
          {latency.toLocaleString()}ms
        </span>
      </Td>
      <Td align="right">
        <span className="tabular-nums" style={{ color: 'var(--synatra-text-disabled)' }}>
          {r.count.toLocaleString()}
        </span>
      </Td>
      <Td align="right">
        <span
          className="tabular-nums"
          style={{ color: r.errorCount > 0 ? 'var(--synatra-negative)' : 'var(--synatra-text-disabled)' }}
        >
          {r.errorCount.toLocaleString()}
        </span>
      </Td>
    </Tr>
  )
}

/** A sortable column head. The whole point of the table over the gauge grid is
 *  that "which endpoint is worst" becomes one click rather than forty
 *  comparisons by eye, so the sorts are the ones that answer that. */
function SortButton({
  label, k, sort, onSort,
}: { label: string; k: SortKey; sort: SortKey; onSort: (k: SortKey) => void }) {
  const active = sort === k
  return (
    <button
      type="button"
      onClick={() => onSort(k)}
      aria-pressed={active}
      className="inline-flex items-center gap-1 cursor-pointer"
      style={{ color: active ? 'var(--synatra-primary)' : 'inherit' }}
    >
      {label}
      <span aria-hidden="true" style={{ opacity: active ? 1 : 0.3 }}>↓</span>
    </button>
  )
}
