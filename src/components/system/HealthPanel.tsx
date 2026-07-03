'use client'

// HealthPanel — /health rendered natively (replaces the legacy admin
// SystemHealth mapping). Per-component truth: one failing probe colours its
// own row, never the whole panel.

import { useApplicationStore } from '@/store/applicationStore'
import { formatUptime } from '@/lib/display/engine'
import { Card }       from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'

const STATUS_COLOR: Record<string, string> = {
  online:   'var(--probex-positive)',
  degraded: 'var(--probex-warning)',
  offline:  'var(--probex-negative)',
}

export function HealthPanel() {
  const slice  = useApplicationStore((s) => s.engine.health)
  const health = slice.data

  if (slice.status === 'error') {
    return (
      <ErrorState
        title="Health probe unavailable"
        description={slice.error?.message ?? 'The /health endpoint did not respond.'}
        fullPage={false}
      />
    )
  }

  if (!health) {
    return (
      <Card>
        <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
          Running health check… the engine’s probe cycle takes ~5 seconds.
        </p>
      </Card>
    )
  }

  const statusColor = STATUS_COLOR[health.status] ?? 'var(--probex-text-muted)'
  const healthyCount = health.components.filter((c) => c.healthy).length

  return (
    <Card className="flex flex-col gap-4">
      {/* Header row: overall status + uptime + monitor counters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
            Health
          </h3>
          <span
            className="text-2xs font-bold uppercase tracking-wider rounded px-1.5 py-0.5"
            style={{ color: statusColor, background: 'var(--probex-surface-2)', border: `1px solid ${statusColor}` }}
          >
            {health.status}
          </span>
          <span className="text-2xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
            {healthyCount}/{health.components.length} probes healthy
          </span>
        </div>
        <div className="flex items-center gap-4 text-2xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
          <span>Uptime {formatUptime(health.uptimeSeconds)}</span>
          <span>{health.stats.healthChecks.toLocaleString()} checks</span>
          <span style={{ color: health.stats.errors > 0 ? 'var(--probex-warning)' : undefined }}>
            {health.stats.errors.toLocaleString()} errors
          </span>
          <span>{health.stats.restarts} restarts</span>
        </div>
      </div>

      {/* Probe rows */}
      <div className="flex flex-col gap-2">
        {health.components.map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs"
            style={{
              background: 'var(--probex-surface-2)',
              border:     `1px solid ${c.healthy ? 'var(--probex-border)' : 'var(--probex-warning-border)'}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: c.healthy ? 'var(--probex-positive)' : 'var(--probex-negative)' }}
              aria-hidden="true"
            />
            <span className="font-semibold w-28 flex-shrink-0" style={{ color: 'var(--probex-text-primary)' }}>
              {c.name}
            </span>
            <span className="flex-1 truncate" style={{ color: 'var(--probex-text-muted)' }} title={c.message}>
              {c.message}
            </span>
            {c.latencyMs !== null && (
              <span className="tabular-nums flex-shrink-0" style={{ color: 'var(--probex-text-disabled)' }}>
                {Math.round(c.latencyMs)}ms
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Last warning / error, when the monitor has them */}
      {(health.stats.lastError || health.stats.lastWarning) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
          {health.stats.lastError && (
            <span>Last error: <span style={{ color: 'var(--probex-warning)' }}>{health.stats.lastError}</span></span>
          )}
          {health.stats.lastWarning && (
            <span>Last warning: <span style={{ color: 'var(--probex-warning)' }}>{health.stats.lastWarning}</span></span>
          )}
        </div>
      )}
    </Card>
  )
}
