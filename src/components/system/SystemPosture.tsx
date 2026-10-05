'use client'

// SystemPosture — the reading, before any of the evidence.
//
// ─── Why this keeps a container when almost nothing else on the page does ────
// A verdict and its evidence must be visibly separable. Everything below this
// on the System page reports what the engine SAID; this reports what that adds
// up to, and whether anything actually answered. Read in the other order, a
// generated "4/4 probes healthy" is indistinguishable from a real one.
//
// So the bounded surface here is doing real work — it is the boundary between
// conclusion and evidence, which is exactly the kind of semantic boundary a
// container is for. The four layer rows beneath it lost theirs: they are the
// components of one reading, not four subjects, and boxing each of them said
// otherwise.
//
// ─── The four layers ─────────────────────────────────────────────────────────
// "Healthy" is four claims stacked, and only the top one used to be shown:
//
//   1. Is the frontend running?     always yes, or you would see nothing
//   2. Is the engine reachable?     runtime probe
//   3. Is the engine operating?     /health status
//   4. Is it risking real capital?  engine identity mode
//
// Under synthetic data layers 2–4 are not answered at all — they are simulated.
// Collapsing them into one green word turns a four-part question into one
// reassuring answer. This is carried over from SystemStatePanel with its logic
// intact, because that logic is correct; only the framing changed.

import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider'
import { useSystemStatus } from '@/config/hooks/useSystemStatus'
import { useApplicationStore } from '@/store/applicationStore'
import { statusColor } from '@/lib/display/systemStatus'
import { formatUptime } from '@/lib/display/engine'

type LayerState = 'ok' | 'warn' | 'bad' | 'unknown' | 'simulated'

const LAYER_COLOR: Record<LayerState, string> = {
  ok:        'var(--synatra-positive)',
  warn:      'var(--synatra-warning)',
  bad:       'var(--synatra-negative)',
  unknown:   'var(--synatra-text-muted)',
  simulated: 'var(--synatra-warning)',
}

export function SystemPosture() {
  const status   = useSystemStatus()
  const runtime  = useRuntimeConfig()
  const health   = useApplicationStore((s) => s.engine.health)
  const identity = useApplicationStore((s) => s.engine.identity)

  const synthetic = status.dataIsSynthetic
  const color = statusColor(status.tone)

  const h = health.data
  const probesTotal   = h?.components.length ?? null
  const probesHealthy = h?.components.filter((c) => c.healthy).length ?? null

  const layers: Array<{ label: string; state: LayerState; value: string; note: string }> = [
    {
      label: 'Frontend',
      state: 'ok',
      value: 'Running',
      note: `${runtime.environment} build · ${runtime.deployment} policy`,
    },
    {
      label: 'Engine reachable',
      state: synthetic ? 'simulated' : runtime.mode === 'offline' ? 'bad' : status.state === 'unreachable' ? 'bad' : status.state === 'slow' ? 'warn' : 'ok',
      value: synthetic ? 'Not contacted' : runtime.mode === 'offline' || status.state === 'unreachable' ? 'No' : status.state === 'slow' ? 'Not yet' : 'Yes',
      // The engine's address is a development diagnostic, not something to
      // print on a production console that may be screen-shared.
      note: synthetic
        ? 'No request is being made to any engine'
        : runtime.deployment === 'development'
          ? runtime.baseUrl
          : status.state === 'unreachable' ? 'the configured engine did not respond'
            : status.state === 'slow' ? 'no answer to the startup check in time; waiting for a first response'
              : runtime.startupProbe === 'timeout' ? 'no answer to the startup check in time; answering requests since'
                : 'engine responded to the startup probe',
    },
    {
      label: 'Engine operating',
      state: synthetic ? 'simulated'
        : h === null ? 'unknown'
        // An unrecognised wire value normalizes to null (lib/services/health).
        // That is "we cannot say", not "bad" — a `bad` fallthrough is what once
        // printed the word "Healthy" in the danger colour on a fine engine.
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
      // Gated on `synthetic` too, not just the mode: in synthetic mode the
      // generated identity reports 'paper', whose note reads "market data is
      // real" — which would sit beside the word Simulated and contradict it.
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
    <section aria-labelledby="sys-posture" className="flex flex-col gap-3">
      {/* A real heading. This is the most important section on the page and it
          was reachable only as a landmark — heading navigation jumped from the
          page title straight to "Engine runtime", skipping the verdict.
          It sits above the verdict as a quiet label rather than competing with
          it: the status line IS the headline, and two headlines would flatten
          the one thing this section exists to say. */}
      <h2 id="sys-posture" className="t-label">System posture</h2>

      {/* ── One anchor, not a verdict plus four loose rows ──────────────────
          The layer rows used to sit OUTSIDE this container, which made the
          page open with two weak elements instead of one strong one. They are
          the components of this verdict, so they now live inside it, separated
          from the headline by a rule. The result is the page's single highest-
          signal group — which is what the top of an instrument should be. */}
      <div
        className="flex flex-col rounded-lg overflow-hidden"
        style={{
          background: `color-mix(in srgb, ${color} 7%, var(--synatra-surface))`,
          border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
        }}
      >
      <div
        className="flex items-start gap-3 px-4 py-3.5"
      >
        <span
          className="w-2 h-2 rounded-full inline-block mt-1.5 flex-shrink-0"
          style={{ background: color }}
          aria-hidden="true"
        />
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-base font-semibold leading-tight" style={{ color }}>{status.label}</span>
          <span className="text-xs leading-relaxed" style={{ color: 'var(--synatra-text-secondary)' }}>
            {status.detail}
          </span>
        </div>
        {h && (
          <span className="t-metadata whitespace-nowrap mt-1">
            up {formatUptime(h.uptimeSeconds)}
          </span>
        )}
      </div>

      {/* The layers, as ruled rows rather than four bordered tiles. Each is a
          component of the verdict above, so they share its surface and are
          separated by rhythm. */}
      <div
        className="flex flex-col px-4 pb-1"
        style={{ borderTop: `1px solid color-mix(in srgb, ${color} 18%, transparent)` }}
      >
        {layers.map((l, i) => (
          <div
            key={l.label}
            className="flex items-baseline gap-3 py-2"
            style={i > 0 ? { borderTop: '1px solid var(--synatra-border)' } : undefined}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 self-center"
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
            <span className="text-2xs truncate ml-auto text-right" style={{ color: 'var(--synatra-text-muted)' }} title={l.note}>
              {l.note}
            </span>
          </div>
        ))}
      </div>
      </div>

      {synthetic && (
        <p
          className="text-xs leading-relaxed rounded-md px-3 py-2.5"
          style={{
            color: 'var(--synatra-warning)',
            background: 'var(--synatra-warning-dim)',
            border: '1px solid color-mix(in srgb, var(--synatra-warning) 24%, transparent)',
          }}
        >
          Every section below is rendering generated responses. They show what this
          console looks like against a running engine — not the state of any real one.
        </p>
      )}
    </section>
  )
}
