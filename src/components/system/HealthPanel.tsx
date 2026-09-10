'use client'

// HealthPanel — /health rendered natively (replaces the legacy admin
// SystemHealth mapping). Per-component truth: one failing probe colours its
// own row, never the whole panel.
//
// ─── Counter scope (Stage 8) ─────────────────────────────────────────────────
// checks / warnings / errors / restarts are PROCESS-scoped. Verified: the engine
// restarted mid-stage and 61 seconds later reported health_checks 8, warnings 0,
// errors 0, restarts 0, where the Stage 1 capture had 5,488 / 5,482 / 0 / 0 over
// ~11h. `restarts` is therefore NOT a count of engine restarts — it was 0
// immediately after one — it counts restarts the monitor performed in-process.
// The group is labelled with the window it actually describes.

import { useApplicationStore } from '@/store/applicationStore'
import { formatUptime } from '@/lib/display/engine'
import { cn } from '@/lib/utils'
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
      <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
        Running health check… the engine’s probe cycle takes ~5 seconds.
      </p>
    )
  }

  const healthyCount = health.components.filter((c) => c.healthy).length
  const allHealthy   = healthyCount === health.components.length

  return (
    // No Card. This is one of five ruled sections on an instrument page, and a
    // bordered surface around it would say it is a separate subject from the
    // runtime and market-data readings beside it. It is not — they are three
    // readings of one machine, and what separates them is a rule and a heading.
    <section aria-label="Service health" className="flex flex-col gap-5">
      {/* Header row: overall status + uptime + monitor counters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="t-section-title">Service health</h2>
          {/* Tone and liveness come from the canonical status; the LABEL is the
              engine's own word, so the panel still reports what it actually
              said ("healthy") rather than the app's internal spelling. */}
          <StatusChip tone={toneForStatus(health.status)} live={health.status === 'online'}>
            {health.statusLabel}
          </StatusChip>
          <span
            className="t-value"
            style={!allHealthy ? { color: 'var(--probex-warning)' } : undefined}
          >
            {healthyCount}/{health.components.length} probes healthy
          </span>
        </div>
        {/* The monitor's own counters, with the window they describe stated
            once for the group rather than implied per number. `warnings` is
            included: it was mapped and never rendered, and on the Stage 1
            capture it was the most telling figure on the page — 5,482 warnings
            against 5,488 checks. */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-4">
            <Counter label="uptime" value={formatUptime(health.uptimeSeconds)} />
            <Counter label="checks" value={health.stats.healthChecks.toLocaleString()} />
            <Counter
              label="warnings"
              value={health.stats.warnings.toLocaleString()}
              {...(health.stats.warnings > 0 ? { tone: 'var(--probex-warning)' } : {})}
            />
            <Counter
              label="errors"
              value={health.stats.errors.toLocaleString()}
              {...(health.stats.errors > 0 ? { tone: 'var(--probex-negative)' } : {})}
            />
            <Counter
              label="restarts"
              value={String(health.stats.restarts)}
              title="Component restarts performed by the health monitor inside this process — not a count of engine restarts"
            />
          </div>
          {/* Scope named explicitly. These are the health MONITOR's own probe
              counters — not engine event records, which the Recent incidents
              section below reports from a different subsystem. Without the
              distinction stated, "3,263 warnings" here and "no warnings" there
              read as a contradiction. */}
          <span className="t-metadata">health-monitor probe cycles, since this engine process started</span>
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
              {/* Last signal — `checked_at` has always been on the wire and in
                  the DTO, and was never displayed. On a diagnostic surface the
                  age of a probe reading is part of the reading: a "healthy"
                  answer from four minutes ago is not the same claim as one from
                  two seconds ago. */}
              <span
                className="tabular-nums flex-shrink-0 text-right"
                style={{ minWidth: '5rem', color: 'var(--probex-text-disabled)' }}
                title={`Checked ${new Date(c.checkedAt).toLocaleString()}`}
              >
                {formatSignalAge(c.checkedAt)}
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

      {/* When nearly every check warns, the ratio is the finding. Stated only
          when it is actually high, so a healthy engine carries no extra noise. */}
      {health.stats.healthChecks > 0 && health.stats.warnings / health.stats.healthChecks >= 0.5 && (
        <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
          {health.stats.warnings.toLocaleString()} of {health.stats.healthChecks.toLocaleString()} checks
          raised a warning this process — {Math.round((health.stats.warnings / health.stats.healthChecks) * 100)}% of them.
        </p>
      )}

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
    </section>
  )
}

/** How long ago a probe last answered. Seconds matter here — this is the one
 *  surface where a stale reading is itself the diagnosis. */
function formatSignalAge(checkedAt: number, now: number = Date.now()): string {
  const secs = Math.max(0, Math.round((now - checkedAt) / 1000))
  if (!Number.isFinite(secs)) return '—'
  if (secs < 2) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

/** Header counter: value dominant, label recessive beneath it. Reads as a
 *  monitoring readout rather than as a run-on sentence of stats. */
function Counter({ label, value, tone, title }: { label: string; value: string; tone?: string; title?: string }) {
  return (
    <span className="flex flex-col items-end leading-tight" {...(title !== undefined ? { title } : {})}>
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
