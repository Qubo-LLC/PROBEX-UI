'use client'

// SystemStatePanel — the layered truth about what is actually running.
//
// ─── Why System needed this ──────────────────────────────────────────────────
// System is the most operationally explicit route in the product, and it was
// the one most able to mislead. It opened with a green ONLINE chip, a pulsing
// dot, "4/4 probes healthy", and rows reading "Connected and receiving data" —
// all of it generated, none of it labelled, because HealthPanel renders
// whatever /health returns without asking where that response came from.
//
// The problem is that "healthy" is four separate claims stacked on top of each
// other, and only the top one was being shown:
//
//   1. Is the frontend running?           always yes, or you'd see nothing
//   2. Is the engine reachable?           runtime probe
//   3. Is the engine operating?           /health status
//   4. Is it risking real capital?        engine identity mode
//
// When the data is synthetic, layers 2–4 are not answered at all — they are
// simulated. Showing them as a single green word collapses a four-part
// question into one reassuring answer.
//
// This panel separates the layers and marks which are real, using the same
// deriveSystemStatus model the top-nav chip and every provenance badge use, so
// System can never disagree with the rest of the product about the state of
// the world.

import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider'
import { useSystemStatus } from '@/config/hooks/useSystemStatus'
import { useApplicationStore } from '@/store/applicationStore'
import { statusColor } from '@/lib/display/systemStatus'
import { formatUptime } from '@/lib/display/engine'
import { Panel, Row, RowGroup } from '@/components/ui/Panel'

type LayerState = 'ok' | 'warn' | 'bad' | 'unknown' | 'simulated'

const LAYER_COLOR: Record<LayerState, string> = {
  ok:        'var(--probex-positive)',
  warn:      'var(--probex-warning)',
  bad:       'var(--probex-negative)',
  unknown:   'var(--probex-text-muted)',
  simulated: 'var(--probex-warning)',
}

export function SystemStatePanel() {
  const status = useSystemStatus()
  const runtime = useRuntimeConfig()
  const health = useApplicationStore((s) => s.engine.health)
  const identity = useApplicationStore((s) => s.engine.identity)
  const stats = useApplicationStore((s) => s.engine.stats)

  const synthetic = status.dataIsSynthetic
  const color = statusColor(status.tone)

  const h = health.data
  const probesTotal = h?.components.length ?? null
  const probesHealthy = h?.components.filter((c) => c.healthy).length ?? null

  // Each layer resolves independently. In synthetic mode the engine-side layers
  // are explicitly 'simulated' rather than borrowing the generated response's
  // own optimistic verdict.
  const layers: Array<{ label: string; state: LayerState; value: string; note: string }> = [
    {
      label: 'Frontend',
      state: 'ok',
      value: 'Running',
      note: `${runtime.environment} build · ${runtime.deployment} policy`,
    },
    {
      label: 'Engine reachable',
      state: synthetic ? 'simulated' : runtime.mode === 'offline' ? 'bad' : status.state === 'unreachable' ? 'bad' : 'ok',
      value: synthetic ? 'Not contacted' : runtime.mode === 'offline' || status.state === 'unreachable' ? 'No' : 'Yes',
      // The engine's address is a development diagnostic, not something to
      // print on a production console where it may be screen-shared. Same rule
      // as the top-nav popover: shown only under the development policy.
      note: synthetic
        ? 'No request is being made to any engine'
        : runtime.deployment === 'development'
          ? runtime.baseUrl
          : status.state === 'unreachable' ? 'the configured engine did not respond' : 'engine responded to the startup probe',
    },
    {
      label: 'Engine operating',
      state: synthetic ? 'simulated'
        : h === null ? 'unknown'
        // An unrecognised wire value normalizes to null (see
        // lib/services/health.ts). That is "we cannot say", not "bad" — the
        // previous `: 'bad'` fallthrough is what printed the word "Healthy" in
        // the danger colour while the engine was fine.
        : h.status === null ? 'unknown'
        : h.status === 'online' ? 'ok'
        : h.status === 'degraded' ? 'warn'
        : 'bad',
      value: synthetic ? 'Simulated' : h === null ? 'Unknown' : h.statusLabel,
      note: probesHealthy !== null && probesTotal !== null
        ? `${probesHealthy}/${probesTotal} probes reporting healthy`
        : 'no probe result yet',
    },
    {
      label: 'Execution mode',
      state: synthetic ? 'simulated'
        : identity.data?.mode === 'live' ? 'warn'
        : identity.data?.mode === 'paper' ? 'ok'
        : 'unknown',
      value: synthetic ? 'Simulated' : identity.data?.mode ?? 'Unknown',
      // The note has to be gated on `synthetic` too, not just the mode: in
      // synthetic mode the generated identity reports 'paper', whose note reads
      // "market data is real" — which would sit directly beside the word
      // Simulated and contradict it.
      note: synthetic
        ? 'No engine is running; this mode is part of the generated response'
        : identity.data?.mode === 'live'
          ? 'Real capital is at risk'
          : identity.data?.mode === 'paper'
            ? 'Orders are simulated; market data is real'
            : 'the engine has not identified its mode',
    },
  ]

  return (
    <Panel
      title="System State"
      provenance="live"
      source="runtime · /health · /"
    >
      {/* Headline: the one sentence, from the shared model. */}
      <div
        className="flex items-start gap-2.5 rounded-md px-3 py-2.5"
        style={{
          background: `color-mix(in srgb, ${color} 8%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full inline-block mt-1.5 flex-shrink-0"
          style={{ background: color }}
          aria-hidden="true"
        />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold leading-tight" style={{ color }}>{status.label}</span>
          <span className="text-xs leading-relaxed" style={{ color: 'var(--probex-text-secondary)' }}>
            {status.detail}
          </span>
        </div>
      </div>

      {/* The layers, separated. */}
      <div className="flex flex-col gap-1.5">
        {layers.map((l) => (
          <div
            key={l.label}
            className="flex items-baseline gap-3 rounded-md px-3 py-2"
            style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: LAYER_COLOR[l.state] }}
              aria-hidden="true"
            />
            <span className="t-label w-36 flex-shrink-0">{l.label}</span>
            <span
              className="text-xs font-semibold capitalize flex-shrink-0"
              style={{ color: LAYER_COLOR[l.state] }}
            >
              {l.value}
            </span>
            <span className="text-2xs truncate ml-auto text-right" style={{ color: 'var(--probex-text-muted)' }} title={l.note}>
              {l.note}
            </span>
          </div>
        ))}
      </div>

      <RowGroup>
        <Row label="Uptime" value={h ? formatUptime(h.uptimeSeconds) : '—'} />
        <Row
          label="Price feed"
          value={
            stats.data === null ? '—'
            : stats.data.feedConnected ? `${Math.round(stats.data.feedLatencyMs)}ms`
            : 'Disconnected'
          }
          color={stats.data && !stats.data.feedConnected ? 'var(--probex-negative)' : undefined}
        />
        <Row
          label="Engine build"
          value={identity.data ? `${identity.data.bot} ${identity.data.version}` : '—'}
        />
      </RowGroup>

      {synthetic && (
        <p
          className="text-xs leading-relaxed rounded-md px-2.5 py-2"
          style={{
            color: 'var(--probex-warning)',
            background: 'var(--probex-warning-dim)',
            border: '1px solid color-mix(in srgb, var(--probex-warning) 24%, transparent)',
          }}
        >
          The health, runtime and configuration panels below are rendering generated
          responses. They show what this console looks like against a running engine —
          not the state of any real one.
        </p>
      )}
    </Panel>
  )
}
