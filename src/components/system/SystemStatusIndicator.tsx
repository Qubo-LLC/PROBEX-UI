'use client'

// SystemStatusIndicator — the product's one statement about its own condition.
//
// ─── What this replaces, and why ─────────────────────────────────────────────
// The previous EngineModeBanner was a 57px full-bleed tinted slab pinned above
// the entire application chrome, rendering four lines of diagnostics (including
// the raw backend URL) at body-text size. It had two problems beyond looking
// unfinished:
//
//   1. It made an ordinary, expected development state — no engine running
//      locally — look like a production incident. Everything below it read as
//      broken by association.
//   2. It printed the engine's address on the page. Same-origin devtools can
//      already read the injected runtime blob, so this was not a new disclosure,
//      but putting it in 14px type meant it landed in every screenshot and demo.
//
// The replacement inverts the weight: a chip sized like the vitals beside it,
// carrying state + one word of provenance, with the full diagnostic set moved
// into a popover the operator opens deliberately.
//
// ─── What is deliberately NOT changed ────────────────────────────────────────
// The detection logic, the deployment-policy gate, the mock/offline distinction
// and the disclosure itself are untouched. Synthetic data is still declared —
// it is declared *once, in the chrome*, and repeated on every value through
// ProvenanceBadge, rather than shouted once and then contradicted by green LIVE
// badges further down the page. Quieter, and strictly more honest than before.

import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider'
import { dataModeWord } from '@/lib/display/settings'
import { useSystemStatus } from '@/config/hooks/useSystemStatus'
import { statusColor, statusNeedsAttention } from '@/lib/display/systemStatus'
import { useApplicationStore } from '@/store/applicationStore'
import { formatUptime } from '@/lib/display/engine'
import { Popover } from '@/components/ui/Popover'

export function SystemStatusIndicator() {
  const status = useSystemStatus()
  const runtime = useRuntimeConfig()
  const health = useApplicationStore((s) => s.engine.health)
  const identity = useApplicationStore((s) => s.engine.identity)

  const color = statusColor(status.tone)
  const attention = statusNeedsAttention(status.state)

  const healthyProbes = health.data?.components.filter((c) => c.healthy).length ?? null
  const totalProbes = health.data?.components.length ?? null

  // The open state, outside-click and Escape handling that used to live here
  // are now the shared Popover primitive — this was the first of three
  // hand-rolled popovers in the product, and it is the Level-2 disclosure
  // every other one should look like.
  return (
    <Popover
      label="System status detail"
      align="end"
      width={320}
      className="flex-shrink-0"
      trigger={(triggerProps, open) => (
      <button
        type="button"
        {...triggerProps}
        aria-label={`System status: ${status.label}. ${status.detail}`}
        title={status.detail}
        className="focus-ring inline-flex items-center gap-1.5 h-7 rounded-md px-2 cursor-pointer transition-colors duration-150"
        style={{
          // An attention state gets a tinted plate; the normal case gets a bare
          // chip that sits in the nav at the same weight as the figures beside
          // it. A healthy cockpit should not decorate itself.
          color: attention ? color : 'var(--probex-text-secondary)',
          background: attention ? `color-mix(in srgb, ${color} 10%, transparent)` : 'transparent',
          border: `1px solid ${attention ? `color-mix(in srgb, ${color} 28%, transparent)` : 'var(--probex-border-default)'}`,
        }}
      >
        <span
          className={status.pulse ? 'live-dot w-1.5 h-1.5' : 'w-1.5 h-1.5 rounded-full inline-block'}
          style={{ background: color }}
          aria-hidden="true"
        />
        {/* The label itself carries the provenance in the states where it
            matters ("Synthetic data", "Engine unreachable"), so no second badge
            is stacked beside it. */}
        {/* The short form below `sm`, the full one above it. Both are the
            same claim; the accessible name on the button always carries the
            full label, so nothing is lost at any width. */}
        <span className="text-2xs font-semibold uppercase tracking-wider whitespace-nowrap sm:hidden">
          {status.shortLabel}
        </span>
        <span className="text-2xs font-semibold uppercase tracking-wider whitespace-nowrap hidden sm:inline">
          {status.label}
        </span>
        <svg
          width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          className="opacity-50 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      )}
    >
          <div className="flex items-start gap-2.5">
            <span
              className="w-1.5 h-1.5 rounded-full inline-block mt-1.5 flex-shrink-0"
              style={{ background: color }}
              aria-hidden="true"
            />
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-semibold leading-tight" style={{ color }}>
                {status.label}
              </span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--probex-text-secondary)' }}>
                {status.detail}
              </p>
            </div>
          </div>

          {/* The synthetic disclosure keeps its own plate inside the popover.
              Compact, but never folded into the metadata rows below — it is a
              different class of statement from "here is the port number". */}
          {status.dataIsSynthetic && (
            <p
              className="text-xs leading-relaxed rounded-md px-2.5 py-2"
              style={{
                color: 'var(--probex-warning)',
                background: 'var(--probex-warning-dim)',
                border: '1px solid color-mix(in srgb, var(--probex-warning) 24%, transparent)',
              }}
            >
              Every figure on screen is generated locally. Nothing here reflects real
              markets, capital or trades.
            </p>
          )}

          {status.state === 'unreachable' && (
            <p
              className="text-xs leading-relaxed rounded-md px-2.5 py-2"
              style={{
                color: 'var(--probex-negative)',
                background: 'var(--probex-negative-dim)',
                border: '1px solid color-mix(in srgb, var(--probex-negative) 24%, transparent)',
              }}
            >
              No trading data is being displayed. Values are withheld rather than
              substituted.
            </p>
          )}

          <div className="h-px" style={{ background: 'var(--probex-border)' }} aria-hidden="true" />

          <dl className="flex flex-col gap-1.5 m-0">
            <DetailRow label="Deployment" value={runtime.deployment} />
            {/* runtime.mode is the dashboard's DATA-SOURCE resolution
                (live engine / mock / offline), not the engine's trading
                mode — "Engine mode: live" beside "Execution: paper" read as
                live trading. The execution mode is the row below. */}
            <DetailRow label="Data source" value={dataModeWord(runtime.mode).word.toLowerCase()} />
            {/* The engine's address is a genuinely useful diagnostic and a
                genuinely bad thing to print on a shared screen. The old banner
                showed it always, at body-text size, on every route. Here it is
                behind a deliberate click AND limited to the one deployment tier
                where the reader is the person running the engine. */}
            {runtime.deployment === 'development' && (
              <DetailRow label="API base" value={runtime.baseUrl} />
            )}
            {identity.data && (
              <DetailRow label="Engine" value={identity.data.bot !== null ? `${identity.data.bot}${identity.data.version !== null ? ` ${identity.data.version}` : ''}` : 'name and version not reported on /api/*'} />
            )}
            {identity.data && <DetailRow label="Execution" value={identity.data.mode} />}
            {healthyProbes !== null && totalProbes !== null && (
              <DetailRow label="Probes" value={`${healthyProbes}/${totalProbes} healthy`} />
            )}
            {health.data && <DetailRow label="Uptime" value={formatUptime(health.data.uptimeSeconds)} />}
          </dl>

          {/* The resolver's own words on why this mode was chosen. Kept verbatim
              — it is the one string that explains a surprising state. */}
          <p className="t-helper">
            {runtime.reason}
          </p>
    </Popover>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="t-label">{label}</dt>
      <dd
        className="text-2xs font-mono tabular-nums m-0 truncate"
        style={{ color: 'var(--probex-text-secondary)' }}
      >
        {value}
      </dd>
    </div>
  )
}
