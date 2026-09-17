// Shared engine display helpers — used across the shell (EngineStatusStrip),
// Overview, and the Survival console. Pure functions, CSS-variable colors only.

import type { SurvivalState } from '@/types/engine'

/**
 * Severity buckets that every survival display derives from. One source of
 * truth so colour, label, tone and pulse never disagree — and so an unknown
 * future backend state resolves once, here, instead of in each widget.
 *
 * An unknown state maps to `caution`, not `ok`: on a capital-safety surface a
 * state we don't recognise must never render as "all good" (false safety) nor
 * as a hard red (false alarm) — amber says "unrecognised, look closer".
 */
export type SurvivalSeverity = 'ok' | 'caution' | 'danger'

/** Known states in severity order — also drives the state-machine strip.
 *
 *  THRIVING sits above HEALTHY: observed live with capital at 149.9% of the
 *  starting bankroll and the Kelly modifier at 1.5×, i.e. the brain betting
 *  MORE, not less. Before it was listed here it was absent from this strip and
 *  scored as 'caution' by the unknown-state fallback. */
export const SURVIVAL_STATES = ['THRIVING', 'HEALTHY', 'CAUTION', 'WOUNDED', 'DANGER', 'CRITICAL', 'DEAD'] as const

export function survivalStateSeverity(state: SurvivalState): SurvivalSeverity {
  switch (String(state).toUpperCase()) {
    case 'THRIVING':
    case 'HEALTHY':  return 'ok'
    case 'CAUTION':
    case 'WOUNDED':  return 'caution'
    case 'DANGER':
    case 'CRITICAL':
    case 'DEAD':     return 'danger'
    default:         return 'caution'   // unknown → visible, never silent
  }
}

const SEVERITY_COLOR: Record<SurvivalSeverity, string> = {
  ok:      'var(--probex-positive)',
  caution: 'var(--probex-warning)',
  danger:  'var(--probex-negative)',
}

/** Survival state → CSS variable for colour coding. Never returns undefined. */
export function survivalStateColor(state: SurvivalState): string {
  return SEVERITY_COLOR[survivalStateSeverity(state)]
}

/** True for the loudest states — drives the pulsing live indicator. */
export function survivalStateIsAlarm(state: SurvivalState): boolean {
  return survivalStateSeverity(state) === 'danger'
}

/** Survival state → human-readable label. Falls back to a prettified version
 *  of any unrecognised state so a new backend value still reads cleanly. */
export function survivalStateLabel(state: SurvivalState): string {
  const s = String(state).toUpperCase()
  switch (s) {
    case 'THRIVING': return 'Thriving'
    case 'HEALTHY':  return 'Healthy'
    case 'CAUTION':  return 'Caution'
    case 'WOUNDED':  return 'Wounded'
    case 'DANGER':   return 'Danger'
    case 'CRITICAL': return 'Critical'
    case 'DEAD':     return 'Dead'
    default:
      // "SOME_NEW_STATE" → "Some New State"
      return s
        .toLowerCase()
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ') || 'Unknown'
  }
}

/**
 * Edge percentages, formatted.
 *
 * ⚠️ Unit trap. `/api/survival.min_edge_threshold` and `EdgeRow.edgePct` are
 * ALREADY percentages — 1.6 means 1.6%, not 160%. They are the exception in a
 * codebase where most ratios are 0–1 and go through formatPercent(), which
 * multiplies by 100. Passing one of these to formatPercent() renders "160.0%"
 * and, worse, silently breaks any comparison written against the scaled value.
 *
 * That mistake has already been made twice — once in this pass, and once in
 * the former AutoExecutionPanel, where `minEdgeThreshold * 100` made the threshold 100×
 * too large so "would this edge trigger a trade?" answered no for every edge
 * the engine could ever produce. Naming the unit in one function is cheaper
 * than remembering the convention at each call site.
 */
export function formatEdgePct(pct: number, decimals = 1): string {
  return `${pct.toFixed(decimals)}%`
}

/** "3d 4h" / "2h 18m" / "45m" / "<1m" — compact uptime display. */
export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400)
  const h = Math.floor((seconds % 86_400) / 3_600)
  const m = Math.floor((seconds % 3_600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return '<1m'
}
