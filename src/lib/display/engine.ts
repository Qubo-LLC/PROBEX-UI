// Shared engine display helpers — used across the shell (EngineStatusStrip),
// Overview, and the Survival console. Pure functions, CSS-variable colors only.

import type { SurvivalState } from '@/types/engine'

/** Survival state → CSS variable for colour coding. */
export function survivalStateColor(state: SurvivalState): string {
  switch (state) {
    case 'HEALTHY':  return 'var(--probex-positive)'
    case 'CAUTION':  return 'var(--probex-warning)'
    case 'DANGER':   return 'var(--probex-negative)'
    case 'CRITICAL': return 'var(--probex-negative)'
  }
}

/** Survival state → human-readable label. */
export function survivalStateLabel(state: SurvivalState): string {
  switch (state) {
    case 'HEALTHY':  return 'Healthy'
    case 'CAUTION':  return 'Caution'
    case 'DANGER':   return 'Danger'
    case 'CRITICAL': return 'Critical'
  }
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
