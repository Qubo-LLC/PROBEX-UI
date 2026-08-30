'use client'

// ProvenanceBadge — the V3 data-lineage grammar (PROBEX_V3_RESTORATION_PLAN §0,
// system 1). Every value in the product can declare *how it is known*:
//
//   live      — polled directly from a confirmed engine endpoint
//   derived   — computed client-side from live values (labelled, not measured)
//   idle      — the endpoint IS live and answered, but the engine reports it has
//               not computed this value yet (`{ available: false, message }`)
//   awaiting  — the backing endpoint does not exist yet (paired with AwaitingBackend)
//   stale     — last-known value; the source has stopped updating
//   synthetic — generated locally; no engine produced this number
//
// 'idle' vs 'awaiting' is the distinction the backend forced on 2026-08-20:
// /api/consensus, /api/consensus/bias and /api/portfolio/summary are all
// deployed and return 200, but answer `available: false` until the engine has
// something to report. Calling that "awaiting backend" would misreport a
// working endpoint as a missing one; calling it "live" would claim a value that
// does not exist. It is its own state and needs its own label.
//
// This turns the truth-first constraint into a premium, institutional signal
// (Aladdin-style data lineage) rather than an apology. Colour comes entirely
// from theme tokens so all five themes are covered.
//
// ─── Why this component reads the runtime mode ───────────────────────────────
// 'live' is written as a literal at ~17 call sites, which is the right ergonomic
// choice — a card should be able to state which endpoint feeds it without also
// knowing what the app is globally doing. But it meant that in mock mode those
// call sites rendered a green pulsing LIVE badge directly on top of fabricated
// numbers, while the disclosure elsewhere on the page said the data was fake.
// Two parts of the same screen contradicting each other about provenance is the
// precise failure the lineage grammar exists to prevent.
//
// Resolving it here instead of at the call sites means the correction is
// structural: a badge cannot claim 'live' while the app is serving synthetic
// data, no matter who renders it, and no future card can reintroduce the bug by
// copying the pattern. 'awaiting', 'derived' and 'stale' pass through unchanged
// — they are claims about a specific endpoint, not about the data being real.

import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider'
import { useSystemStatus } from '@/config/hooks/useSystemStatus'

export type Provenance = 'live' | 'derived' | 'idle' | 'awaiting' | 'stale' | 'synthetic' | 'unreachable'

interface ProvenanceBadgeProps {
  provenance: Provenance
  /** Optional detail shown after the label, e.g. an endpoint id ("CE-2"). */
  detail?:    string
  className?: string
}

const CONFIG: Record<Provenance, { label: string; color: string; dot: boolean; pulse: boolean; title: string }> = {
  // ─── Why 'live' no longer pulses ───────────────────────────────────────────
  // It did, and it was the product's single largest source of undifferentiated
  // motion: this badge appears on nearly every panel, so a pulsing live dot
  // meant six to eight elements breathing at once on Overview alone. Motion
  // that appears everywhere reports nothing — "the engine is live" is a fact
  // the operator establishes once, not a claim each panel needs to re-assert.
  //
  // Liveness is now expressed in a hierarchy: the top-bar SystemStatusIndicator
  // pulses as the ONE system-level signal, and per-panel badges state their
  // lineage statically. Nothing semantic is lost — the dot, the green and the
  // word "Live" all remain; only the breath moves up a level. Motion on this
  // surface is reserved for things that actually happen: a value changing
  // (pulse-ring) or a condition needing attention.
  live:        { label: 'Live',      color: 'var(--probex-positive)',      dot: true,  pulse: false, title: 'Polled from a live engine endpoint' },
  derived:     { label: 'Derived',   color: 'var(--probex-text-muted)',    dot: false, pulse: false, title: 'Computed from live values' },
  idle:        { label: 'Not yet',   color: 'var(--probex-text-muted)',    dot: true,  pulse: false, title: 'The endpoint is live, but the engine has not computed this value yet' },
  awaiting:    { label: 'Awaiting',  color: 'var(--probex-warning)',       dot: true,  pulse: false, title: 'The backing endpoint does not exist yet' },
  stale:       { label: 'Stale',     color: 'var(--probex-text-disabled)', dot: true,  pulse: false, title: 'Last known value — the source stopped updating' },
  synthetic:   { label: 'Synthetic', color: 'var(--probex-warning)',       dot: true,  pulse: false, title: 'Generated locally — not produced by any engine' },
  unreachable: { label: 'No feed',   color: 'var(--probex-text-disabled)', dot: true,  pulse: false, title: 'The engine could not be reached — no value is being shown' },
}

export function ProvenanceBadge({ provenance, detail, className = '' }: ProvenanceBadgeProps) {
  const { mode } = useRuntimeConfig()
  const { state: systemState } = useSystemStatus()

  // A 'live' claim is only the caller's to make when the app is actually
  // talking to an engine. In the modes where it is not, the claim is rewritten
  // rather than trusted:
  //   mock        → 'synthetic'   the number exists but nothing produced it
  //   offline     → 'unreachable' there is no number, and the panel says so
  //   unreachable → 'unreachable' configured live, but nothing is answering
  //
  // ─── Why the runtime mode alone was not enough ───────────────────────────────
  // The first two are decided by the SERVER at startup, and that is the flaw
  // this third case fixes. Verified in a browser on 2026-08-21 against a wedged
  // engine: `mode` stayed 'live' (it was explicitly configured, and the startup
  // probe is not re-run), so every panel rendered a green pulsing LIVE badge
  // directly above its own copy reading "Awaiting the execution engine's
  // status." A badge asserting the feed is live, sitting on a panel saying no
  // value arrived, is the precise contradiction this module exists to prevent —
  // it was simply being caused by a stale startup fact rather than by a
  // hardcoded literal.
  //
  // `unreachable` is the only system state that downgrades. It requires ALL
  // core endpoints to be failing (useSystemStatus corroborates before claiming
  // it), so a single flaky endpoint cannot grey out the whole cockpit.
  // 'loading' deliberately does not downgrade: the badge names the SOURCE a
  // value will come from, and during the first poll there is no value yet for
  // it to misdescribe.
  //
  // Every other provenance is a statement about a specific endpoint's maturity
  // rather than about the connection, so it passes through untouched. 'idle' is
  // downgraded alongside 'live' for the same reason: it asserts that a real
  // endpoint answered, which is exactly what is not true here.
  const resolved: Provenance =
    provenance !== 'live' && provenance !== 'idle' ? provenance
    : mode === 'mock' ? 'synthetic'
    : mode === 'offline' ? 'unreachable'
    : systemState === 'unreachable' ? 'unreachable'
    : provenance

  const c = CONFIG[resolved]

  // The endpoint id is only meaningful when a request was actually made to it.
  const shownDetail = resolved === 'synthetic' || resolved === 'unreachable' ? undefined : detail

  return (
    <span
      className={`inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-wider ${className}`}
      style={{ color: c.color }}
      title={shownDetail ? `${c.label} — ${shownDetail}` : c.title}
      aria-label={`Data source: ${c.label}${shownDetail ? ` (${shownDetail})` : ''}`}
    >
      {c.dot && (
        <span
          className={c.pulse ? 'live-dot w-1.5 h-1.5' : 'w-1.5 h-1.5 rounded-full inline-block'}
          style={{ background: c.color }}
          aria-hidden="true"
        />
      )}
      <span>{c.label}</span>
      {shownDetail && (
        <span className="font-medium normal-case" style={{ color: 'var(--probex-text-disabled)' }}>
          · {shownDetail}
        </span>
      )}
    </span>
  )
}
