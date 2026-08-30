// System status — the single derivation of "what state is this cockpit in".
//
// ─── Why this exists ─────────────────────────────────────────────────────────
// Before this module, three places each answered the question their own way and
// none of them agreed:
//
//   • EngineModeBanner   — two branches (offline / mock), a full-width slab
//   • EngineStatusStrip  — `engineDown` when three endpoints happened to error
//   • ProvenanceBadge    — hardcoded 'live' at 17 call sites, which meant mock
//                          mode rendered a green pulsing LIVE badge on top of
//                          synthetic numbers while the banner above it said the
//                          data was fake
//
// Those are genuinely different situations, not one "error". Collapsing
// them loses the distinction an operator most needs: *is the thing I am looking
// at real, and if not, why not*. This module names them all and derives them
// once, so the chip, the popover, the provenance badges and the page copy can
// never contradict each other again.
//
// Pure. No hooks, no JSX — see config/hooks/useSystemStatus.ts for the binding.

import type { RuntimeConfig } from '@/config/runtime'
import type { EngineHealthStatus, EngineMode } from '@/types/engine'

// ─── The nine states ──────────────────────────────────────────────────────────

export type SystemState =
  /** Engine reachable, executing against real capital. The loud one. */
  | 'live'
  /** Engine reachable and healthy, but executing on paper. The normal case. */
  | 'paper'
  /** Engine reachable but reporting degraded health (a probe is failing). */
  | 'degraded'
  /** Frontend is fine; the engine process answers but reports itself offline. */
  | 'engine-offline'
  /**
   * The engine answers and calls itself healthy, but one or more endpoints have
   * stopped responding and the client has paused requesting them.
   *
   * This exists because "reachable" and "usable" came apart on 2026-08-20:
   * /api/markets and /api/research/reports accepted connections and never
   * replied, while /health kept returning 200. Without this state the healthy
   * branch below would render a positive chip over a cockpit whose market data
   * is dead — the engine's own self-report is not evidence that its routes work.
   */
  | 'endpoints-stalled'
  /** Configured for a real engine, cannot reach it, policy forbids substitution. */
  | 'unreachable'
  /** Explicitly synthetic. Legitimate locally, catastrophic if mistaken for real. */
  | 'synthetic'
  /** Nothing has resolved yet. */
  | 'loading'
  /** Not enough information to claim any of the above. Never guessed as healthy. */
  | 'unknown'

export type StatusTone = 'positive' | 'warning' | 'danger' | 'info' | 'neutral'

export interface SystemStatus {
  state: SystemState
  /** Chip label. Short enough for the top nav at 1280px. */
  label: string
  /** Secondary line — the "why", one clause. */
  detail: string
  tone: StatusTone
  /** True only when every figure on screen came from a real engine response. */
  dataIsLive: boolean
  /** True when the figures are fabricated. Drives every synthetic disclosure. */
  dataIsSynthetic: boolean
  /** Whether the indicator should pulse. Reserved for genuinely ongoing states. */
  pulse: boolean
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface SystemStatusInput {
  /** Server-resolved runtime config — the authority on mock/offline/live. */
  runtime: RuntimeConfig
  /** /health overall status; null until it resolves. */
  healthStatus: EngineHealthStatus | null
  /** Engine identity mode (paper/live); null until the API root resolves. */
  engineMode: EngineMode | null
  /** True while no engine endpoint has resolved either way. */
  isLoading: boolean
  /** True when the engine API itself did not answer. */
  isUnreachable: boolean
  /** Failing health probes, when known. */
  unhealthyProbes: number
  /**
   * Endpoints the client has stopped requesting because they stalled
   * (lib/api/circuitBreaker). Distinct from a failing health probe: the engine
   * may not know, or may not care, that one of its routes has wedged.
   */
  stalledEndpoints: number
}

// ─── Derivation ───────────────────────────────────────────────────────────────

/**
 * Order matters, and it is deliberately provenance-first: whether the numbers
 * are real outranks how the engine feels about itself. A synthetic cockpit
 * reporting "healthy" is still synthetic, and saying "healthy" first would be
 * the exact failure this module exists to prevent.
 */
export function deriveSystemStatus(input: SystemStatusInput): SystemStatus {
  const { runtime, healthStatus, engineMode, isLoading, isUnreachable, unhealthyProbes, stalledEndpoints } = input

  // 1 · Synthetic outranks everything. Mock mode is only ever reachable when the
  //     deployment policy permits it (runtime.server.ts enforces that), so this
  //     branch cannot fire in staging or production.
  if (runtime.mode === 'mock') {
    return {
      state: 'synthetic',
      label: 'Synthetic data',
      detail:
        runtime.requestedMode === 'mock'
          ? 'Mock mode requested — no engine is being contacted.'
          : 'Engine unreachable — showing generated data so the interface stays usable.',
      tone: 'warning',
      dataIsLive: false,
      dataIsSynthetic: true,
      pulse: false,
    }
  }

  // 2 · Configured for a real engine and could not reach it, in a deployment
  //     that refuses to substitute. Nothing on screen is trading data.
  if (runtime.mode === 'offline') {
    return {
      state: 'unreachable',
      label: 'Engine unreachable',
      detail: `No response from the engine — ${runtime.deployment} never substitutes generated data.`,
      tone: 'danger',
      dataIsLive: false,
      dataIsSynthetic: false,
      pulse: true,
    }
  }

  // 3 · Live mode, but the client's own polling is failing. Distinct from (2):
  //     the server reached the engine when it resolved config, and the browser
  //     cannot now — a proxy, CORS or mid-session outage, not a misconfiguration.
  if (isUnreachable) {
    return {
      state: 'unreachable',
      label: 'Engine unreachable',
      detail: 'The engine answered at startup but is not responding to polling.',
      tone: 'danger',
      dataIsLive: false,
      dataIsSynthetic: false,
      pulse: true,
    }
  }

  // 4 · Still establishing. Explicitly not "healthy" — an unresolved cockpit
  //     must never render as a good one, even for a few hundred milliseconds.
  if (isLoading) {
    return {
      state: 'loading',
      label: 'Connecting',
      detail: 'Establishing engine state.',
      tone: 'neutral',
      dataIsLive: false,
      dataIsSynthetic: false,
      pulse: true,
    }
  }

  // 5 · The engine answered and told us it is not operating.
  if (healthStatus === 'offline') {
    return {
      state: 'engine-offline',
      label: 'Engine offline',
      detail: 'The API is reachable, but the engine reports itself as not running.',
      tone: 'danger',
      dataIsLive: true,
      dataIsSynthetic: false,
      pulse: true,
    }
  }

  // 6 · Reachable and running, with something wrong inside.
  if (healthStatus === 'degraded') {
    return {
      state: 'degraded',
      label: 'Degraded',
      detail:
        unhealthyProbes > 0
          ? `${unhealthyProbes} health ${unhealthyProbes === 1 ? 'probe is' : 'probes are'} failing.`
          : 'The engine reports degraded health.',
      tone: 'warning',
      dataIsLive: true,
      dataIsSynthetic: false,
      pulse: true,
    }
  }

  // 7 · Reachable, and the engine says it is fine — but routes we depend on have
  //     stopped answering. Deliberately placed BEFORE the healthy split rather
  //     than folded into `degraded`: degraded means the engine's own probes are
  //     failing, which is the engine reporting on itself. This is the client
  //     reporting something the engine has not noticed, and the two have
  //     different remedies. It ranks below `degraded` (which already warns) and
  //     above healthy, so a green chip can never sit over stalled endpoints.
  if (stalledEndpoints > 0) {
    return {
      state: 'endpoints-stalled',
      label: 'Endpoints stalled',
      detail: `${stalledEndpoints} endpoint${stalledEndpoints === 1 ? '' : 's'} stopped responding — requests paused, retrying periodically.`,
      tone: 'warning',
      // What HAS arrived is genuine engine data; this is not synthetic. The
      // affected slices show their own errors rather than being faked.
      dataIsLive: true,
      dataIsSynthetic: false,
      pulse: true,
    }
  }

  // 8 · Healthy and reachable — split by what the engine is risking.
  if (healthStatus === 'online' && engineMode !== null) {
    return engineMode === 'live'
      ? {
          state: 'live',
          label: 'Live trading',
          detail: 'Connected to the engine — real capital is at risk.',
          tone: 'danger',
          dataIsLive: true,
          dataIsSynthetic: false,
          pulse: true,
        }
      : {
          state: 'paper',
          label: 'Paper trading',
          detail: 'Connected to the engine — execution is simulated, data is real.',
          tone: 'positive',
          dataIsLive: true,
          dataIsSynthetic: false,
          pulse: true,
        }
  }

  // 9 · Reachable, but we cannot confidently say which of the above applies.
  //     Deliberately its own state rather than being folded into "healthy":
  //     partial knowledge is not good news, and it is not an error either.
  return {
    state: 'unknown',
    label: 'State unknown',
    detail:
      healthStatus === null
        ? 'The engine is responding, but has not reported its health yet.'
        : 'The engine is responding, but has not identified its execution mode.',
    tone: 'neutral',
    dataIsLive: true,
    dataIsSynthetic: false,
    pulse: false,
  }
}

// ─── Presentation helpers ─────────────────────────────────────────────────────

const TONE_VAR: Record<StatusTone, string> = {
  positive: 'var(--probex-positive)',
  warning: 'var(--probex-warning)',
  danger: 'var(--probex-negative)',
  info: 'var(--probex-primary)',
  neutral: 'var(--probex-text-muted)',
}

export function statusColor(tone: StatusTone): string {
  return TONE_VAR[tone]
}

/**
 * Whether a state warrants any visual weight beyond the resting chip.
 *
 * Paper is the normal operating mode of this product and must not be dressed
 * as an exception — the whole point of the redesign is that a working cockpit
 * looks calm.
 */
export function statusNeedsAttention(state: SystemState): boolean {
  return state !== 'paper' && state !== 'live' && state !== 'loading'
}
