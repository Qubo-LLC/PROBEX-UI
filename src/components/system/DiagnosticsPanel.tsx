'use client'

// DiagnosticsPanel — per-endpoint observability from the diagnostics singleton
// (fed by the Axios interceptors). One RadialGauge per endpoint showing its
// session success rate, with latency/call/error counts in a caption.

import { useEffect, useState } from 'react'
import { diagnostics, type DiagnosticsSnapshot, type EndpointRecord } from '@/lib/diagnostics'
import { Card } from '@/components/ui/Card'
import { RadialGauge } from '@/components/shared/RadialGauge'

export function DiagnosticsPanel() {
  // The singleton is not reactive — poll a snapshot once per second while
  // the panel is mounted (client-side only; renders nothing on the server).
  const [snap, setSnap] = useState<DiagnosticsSnapshot | null>(null)

  useEffect(() => {
    setSnap(diagnostics.snapshot())
    const id = setInterval(() => setSnap(diagnostics.snapshot()), 1_000)
    return () => clearInterval(id)
  }, [])

  if (!snap) return null

  const records = Object.values(snap.endpoints)
    .sort((a, b) => a.endpoint.localeCompare(b.endpoint))

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
          Endpoint Diagnostics
        </h3>
        <span className="text-2xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
          {snap.apiMode.toUpperCase()} mode · {snap.registryImpl} · {snap.requestCount.toLocaleString()} requests this session
        </span>
      </div>

      {records.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
          No requests recorded yet this session.
        </p>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))' }}
          role="table"
          aria-label="Endpoint diagnostics"
        >
          {records.map((r) => <EndpointGauge key={`${r.method} ${r.endpoint}`} record={r} />)}
        </div>
      )}

      <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
        Live view of this browser session's requests to {snap.apiBaseUrl || 'the engine API'} — each ring is this
        endpoint's session success rate; latency includes network transit, not just engine processing.
      </p>
    </Card>
  )
}

function EndpointGauge({ record: r }: { record: EndpointRecord }) {
  const successRate = r.count > 0 ? (r.count - r.errorCount) / r.count : 1
  const failed       = r.lastStatus === null || r.lastStatus >= 400
  const color =
    successRate >= 0.95 ? 'var(--probex-positive)'
    : successRate >= 0.8 ? 'var(--probex-warning)'
    : 'var(--probex-negative)'

  return (
    <div
      className="flex flex-col items-center gap-1.5 p-2 rounded-lg"
      style={{ background: 'var(--probex-surface-2)', border: `1px solid ${failed ? 'var(--probex-negative-border)' : 'var(--probex-border)'}` }}
      role="row"
      title={`${r.method} ${r.endpoint || '/'} — ${Math.round(successRate * 100)}% success, ${r.count} call${r.count === 1 ? '' : 's'}, ${r.errorCount} error${r.errorCount === 1 ? '' : 's'}`}
    >
      <RadialGauge
        value={successRate}
        color={color}
        size={64}
        strokeWidth={6}
        ariaLabel={`${r.endpoint || '/'} success rate ${Math.round(successRate * 100)}%`}
      >
        <span className="text-2xs font-bold tabular-nums" style={{ color }}>
          {Math.round(successRate * 100)}%
        </span>
      </RadialGauge>
      <span className="text-2xs font-medium truncate w-full text-center" style={{ color: 'var(--probex-text-secondary)' }}>
        {r.endpoint || '/'}
      </span>
      <span className="text-2xs tabular-nums" style={{ color: 'var(--probex-text-disabled)' }}>
        {Math.round(r.lastDurationMs)}ms · {r.count}×{r.errorCount > 0 ? ` · ${r.errorCount} err` : ''}
      </span>
    </div>
  )
}
