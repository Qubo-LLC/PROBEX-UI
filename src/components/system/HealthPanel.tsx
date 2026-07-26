'use client'

// HealthPanel — /health rendered natively (replaces the legacy admin
// SystemHealth mapping). Per-component truth: one failing probe colours its
// own row, never the whole panel.

import { useApplicationStore } from '@/store/applicationStore'
import { formatUptime } from '@/lib/display/engine'
import { cn } from '@/lib/utils'
import { Card }       from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { StatusChip, toneForStatus } from '@/components/ui/StatusChip'

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

  const healthyCount = health.components.filter((c) => c.healthy).length
  const allHealthy   = healthyCount === health.components.length

  return (
    <Card className="flex flex-col gap-5">
      {/* Header row: overall status + uptime + monitor counters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="t-card-title">Health</h3>
          <StatusChip tone={toneForStatus(health.status)} live={health.status === 'online'}>
            {health.status}
          </StatusChip>
          <span
            className="t-value"
            style={!allHealthy ? { color: 'var(--probex-warning)' } : undefined}
          >
            {healthyCount}/{health.components.length} probes healthy
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Counter label="uptime" value={formatUptime(health.uptimeSeconds)} />
          <Counter label="checks" value={health.stats.healthChecks.toLocaleString()} />
          <Counter
            label="errors"
            value={health.stats.errors.toLocaleString()}
            {...(health.stats.errors > 0 ? { tone: 'var(--probex-warning)' } : {})}
          />
          <Counter label="restarts" value={String(health.stats.restarts)} />
        </div>
      </div>

      {/* Probe rows.
          Healthy rows are deliberately quiet so the eye slides down them
          without stopping; an unhealthy row gets a tinted fill and a coloured
          left rule so it breaks the column and pulls attention. Previously
          every row carried identical weight, which meant scanning for a problem
          required reading all of them.

          Latency is the other half of that: a probe can report "healthy" while
          answering in 8.7 seconds. Slow-but-healthy is now amber and slow is
          bold, so the number is scannable instead of uniformly muted. */}
      <div className="flex flex-col gap-1.5">
        {health.components.map((c) => {
          const latency = c.latencyMs
          const slow    = latency !== null && latency >= 1000
          const sluggish = latency !== null && latency >= 250 && latency < 1000
          return (
            <div
              key={c.name}
              className="row-hover flex items-center gap-3 rounded-md pl-3 pr-3.5 py-2.5 text-xs"
              style={{
                background: c.healthy
                  ? 'var(--probex-surface-2)'
                  : 'color-mix(in srgb, var(--probex-negative) 9%, var(--probex-surface-2))',
                border: `1px solid ${c.healthy ? 'var(--probex-border)' : 'color-mix(in srgb, var(--probex-negative) 38%, transparent)'}`,
                borderLeftWidth: c.healthy ? '1px' : '3px',
                borderLeftColor: c.healthy ? 'var(--probex-border)' : 'var(--probex-negative)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: c.healthy ? 'var(--probex-positive)' : 'var(--probex-negative)' }}
                aria-hidden="true"
              />
              <span
                className="font-semibold w-32 flex-shrink-0 truncate"
                style={{ color: c.healthy ? 'var(--probex-text-secondary)' : 'var(--probex-text-primary)' }}
              >
                {c.name}
              </span>
              <span className="flex-1 truncate" style={{ color: 'var(--probex-text-muted)' }} title={c.message}>
                {c.message}
              </span>
              {latency !== null && (
                <span
                  className={cn(
                    'tabular-nums flex-shrink-0 text-right',
                    slow ? 'font-bold' : sluggish ? 'font-semibold' : 'font-medium',
                  )}
                  style={{
                    minWidth: '4.5rem',
                    color: slow
                      ? 'var(--probex-negative)'
                      : sluggish
                        ? 'var(--probex-warning)'
                        : 'var(--probex-text-disabled)',
                  }}
                  title={slow ? 'Responding slowly' : undefined}
                >
                  {Math.round(latency).toLocaleString()}ms
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Last warning / error, when the monitor has them */}
      {(health.stats.lastError || health.stats.lastWarning) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1.5">
          {health.stats.lastError && (
            <span className="t-metadata">
              Last error <span className="font-semibold" style={{ color: 'var(--probex-negative)' }}>{health.stats.lastError}</span>
            </span>
          )}
          {health.stats.lastWarning && (
            <span className="t-metadata">
              Last warning <span className="font-semibold" style={{ color: 'var(--probex-warning)' }}>{health.stats.lastWarning}</span>
            </span>
          )}
        </div>
      )}
    </Card>
  )
}

/** Header counter: value dominant, label recessive beneath it. Reads as a
 *  monitoring readout rather than as a run-on sentence of stats. */
function Counter({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <span className="flex flex-col items-end leading-tight">
      <span
        className="text-xs font-semibold tabular-nums"
        style={{ color: tone ?? 'var(--probex-text-secondary)' }}
      >
        {value}
      </span>
      <span className="t-metadata uppercase" style={{ letterSpacing: '0.06em' }}>{label}</span>
    </span>
  )
}
