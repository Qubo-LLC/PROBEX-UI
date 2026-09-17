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
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'

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
      {/* ── Header: the verdict, then the monitor's counters ─────────────────
          The verdict — how many probes pass — is the reason this section
          exists, and it rendered at t-value: twelve pixels, the same register
          as the five counters beside it and the probe messages beneath. Six
          classes of information at one weight is what "mumbled" looks like.
          It now sits at the md metric register under the heading, with the
          engine's own status word as its chip; everything else steps down. */}
      <div className="flex items-end justify-between flex-wrap gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2.5">
            <h2 className="t-section-title">Service health</h2>
            {/* Tone and liveness come from the canonical status; the LABEL is
                the engine's own word, so the panel still reports what it
                actually said ("healthy") rather than the app's spelling. */}
            <StatusChip tone={toneForStatus(health.status)} live={health.status === 'online'}>
              {health.statusLabel}
            </StatusChip>
          </div>
          <span className="flex items-baseline gap-1.5">
            <span
              className="t-metric-md"
              style={!allHealthy ? { color: 'var(--probex-warning)' } : undefined}
            >
              {healthyCount}/{health.components.length}
            </span>
            <span className="t-unit">probes healthy</span>
          </span>
        </div>

        {/* The monitor's own counters. `warnings` is included: it was mapped
            and never rendered, and on the Stage 1 capture it was the most
            telling figure on the page — 5,482 warnings against 5,488 checks.

            The scope statement that used to sit beneath them as a full
            sentence at the technical register — "health-monitor probe cycles,
            since this engine process started" — is now a three-word window
            qualifier plus a Level-2 disclosure. The explanation of WHY these
            counters differ from the incident list below is exactly the kind
            of text a reader needs once and should not have to read past
            every time; the fact that they are process-scoped stays visible.

            `flex-wrap` on the row and `min-w-0` on the column: measured at
            320px, five counters at gap-4 need ~340px and were clipped. */}
        <div className="flex flex-col items-end gap-1 min-w-0">
          <div className="flex items-center justify-end gap-x-4 gap-y-1.5 flex-wrap">
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
            <Counter label="restarts" value={String(health.stats.restarts)} />
          </div>
          <span className="flex items-center gap-1 t-metadata">
            since process start
            <Popover
              label="About the health monitor counters"
              align="end"
              trigger={(p) => <InfoButton what="the health monitor counters" {...p} />}
            >
              <PopoverTitle>Health monitor counters</PopoverTitle>
              <PopoverText>
                Tallies of the monitor&rsquo;s own probe cycles since this engine process
                started. They reset when the process restarts.
              </PopoverText>
              <PopoverText>
                <strong>Restarts</strong> counts component restarts the monitor performed
                inside this process — not restarts of the engine itself.
              </PopoverText>
              <PopoverText>
                A different subsystem from the event log in Recent incidents below: a busy
                monitor with an empty incident list is a normal combination, not a
                contradiction.
              </PopoverText>
            </Popover>
          </span>
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
              // ─── Containment by STATE, not uniformly ────────────────────
              // Every one of these rows used to carry a full border and fill,
              // so four identical boxes said "four things need your attention"
              // when three of them were fine. A healthy probe is something the
              // eye should slide past; a failing one should stop it.
              //
              // Healthy rows now have no container at all — just a rule between
              // them. Failing rows keep the tinted fill, the border and the 3px
              // left rule, and against quiet neighbours that treatment is far
              // louder than it was when everything shared it.
              // `flex-wrap`: at 320px the fixed-width name, age and latency
              // columns need more than the row has, and the latency was
              // clipped off the right edge while the message truncated to
              // "Market ..." — a failing probe whose reason could not be read
              // on a phone. Below `sm` the message now takes its own full line
              // beneath the name/age/latency row, so it wraps and reads in
              // full; from `sm` up the single-line layout is unchanged.
              className="row-hover flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1 rounded-md pl-3 pr-3.5 py-2.5 text-xs"
              style={{
                background: c.healthy
                  ? 'transparent'
                  : 'color-mix(in srgb, var(--probex-negative) 9%, var(--probex-surface-2))',
                border: `1px solid ${c.healthy ? 'transparent' : 'color-mix(in srgb, var(--probex-negative) 38%, transparent)'}`,
                borderLeftWidth: c.healthy ? '1px' : '3px',
                borderLeftColor: c.healthy ? 'transparent' : 'var(--probex-negative)',
                borderBottom: c.healthy ? '1px solid var(--probex-border)' : undefined,
                borderRadius: c.healthy ? 0 : undefined,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: c.healthy ? 'var(--probex-positive)' : 'var(--probex-negative)' }}
                aria-hidden="true"
              />
              <span
                className="font-semibold w-28 sm:w-32 flex-shrink-0 truncate"
                style={{ color: c.healthy ? 'var(--probex-text-secondary)' : 'var(--probex-text-primary)' }}
              >
                {c.name}
              </span>
              <span
                className="basis-full order-last sm:basis-auto sm:order-none sm:flex-1 sm:truncate pl-[18px] sm:pl-0 leading-snug"
                style={{ color: 'var(--probex-text-muted)' }}
                title={c.message}
              >
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
                // Slow is a warning about a probe that PASSED, so it takes the
                // warning colour, never the failure colour: rendered in the
                // negative tone at bold, a 1,425ms healthy probe was the
                // loudest element in a section whose verdict said all clear.
                // Failure is carried by the row treatment; latency only
                // qualifies it.
                <span
                  className={cn(
                    'tabular-nums flex-shrink-0 text-right',
                    slow ? 'font-semibold' : 'font-medium',
                  )}
                  style={{
                    minWidth: '4.5rem',
                    color: slow
                      ? 'var(--probex-warning)'
                      : sluggish
                        ? 'var(--probex-text-muted)'
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
