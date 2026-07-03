'use client'

// DiagnosticsPanel — production endpoint observability, driven by the
// diagnostics singleton (src/lib/diagnostics.ts) that the Axios interceptors
// feed on every completed request. This replaces the dev-only EngineChainProbe:
// same insight (per-endpoint status + latency), zero duplicate HTTP.

import { useEffect, useState } from 'react'
import { diagnostics, type DiagnosticsSnapshot } from '@/lib/diagnostics'
import { Card } from '@/components/ui/Card'

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
        <div className="flex flex-col gap-1" role="table" aria-label="Endpoint diagnostics">
          {/* Header */}
          <div
            className="grid items-center gap-3 px-2.5 pb-1 text-2xs font-semibold uppercase tracking-wider"
            style={{ gridTemplateColumns: 'minmax(0,1fr) 64px 72px 64px 88px', color: 'var(--probex-text-disabled)' }}
            role="row"
          >
            <span>Endpoint</span>
            <span className="text-right">Status</span>
            <span className="text-right">Latency</span>
            <span className="text-right">Calls</span>
            <span className="text-right">Errors</span>
          </div>

          {records.map((r) => {
            const failed = r.lastStatus === null || r.lastStatus >= 400
            const errorRate = r.count > 0 ? r.errorCount / r.count : 0
            return (
              <div
                key={`${r.method} ${r.endpoint}`}
                className="grid items-center gap-3 rounded-md px-2.5 py-1.5 text-xs tabular-nums"
                style={{
                  gridTemplateColumns: 'minmax(0,1fr) 64px 72px 64px 88px',
                  background: 'var(--probex-surface-2)',
                  border: `1px solid ${failed ? 'var(--probex-negative-border)' : 'var(--probex-border)'}`,
                }}
                role="row"
              >
                <span className="truncate font-medium" style={{ color: 'var(--probex-text-secondary)' }}>
                  <span style={{ color: 'var(--probex-text-disabled)' }}>{r.method}</span> {r.endpoint || '/'}
                </span>
                <span className="text-right font-bold" style={{ color: failed ? 'var(--probex-negative)' : 'var(--probex-positive)' }}>
                  {r.lastStatus ?? 'ERR'}
                </span>
                <span className="text-right" style={{ color: 'var(--probex-text-muted)' }}>
                  {Math.round(r.lastDurationMs).toLocaleString()}ms
                </span>
                <span className="text-right" style={{ color: 'var(--probex-text-muted)' }}>
                  {r.count.toLocaleString()}
                </span>
                <span
                  className="text-right"
                  style={{ color: r.errorCount > 0 ? 'var(--probex-warning)' : 'var(--probex-text-disabled)' }}
                >
                  {r.errorCount.toLocaleString()}{r.errorCount > 0 ? ` (${Math.round(errorRate * 100)}%)` : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
        Live view of this browser session’s requests to {snap.apiBaseUrl || 'the engine API'} —
        latency includes network transit, not just engine processing.
      </p>
    </Card>
  )
}
