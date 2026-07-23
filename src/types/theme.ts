/**
 * Theme type system
 * All theme-related types. Components import from here — never hardcode theme names.
 */

// ─── Theme names ───────────────────────────────────────────────────────────

export const THEME_NAMES = [
  'aurora',
  'midnight',
  'quantum',
  'emerald',
  'institutional',
  'ember',
] as const satisfies readonly string[]

export type ThemeName = (typeof THEME_NAMES)[number]

export const DEFAULT_THEME: ThemeName = 'midnight'

/**
 * Themes surfaced in the settings switcher (Phase 1 · T10). The full THEME_NAMES
 * set stays valid in the engine — demoted themes (aurora / quantum / emerald)
 * still resolve if already persisted, just aren't offered here. 2026-07-24:
 * the beta slot is 'ember' — burnt orange on warm black (replaced the earlier
 * 'nova', whose pink lacked impact), offered alongside the two canonical
 * options for the team to react to.
 */
export const SURFACED_THEMES = ['midnight', 'institutional', 'ember'] as const satisfies readonly ThemeName[]

// ─── Theme metadata (for switcher UI) ────────────────────────────────────

export interface ThemeMeta {
  readonly name: ThemeName
  readonly label: string
  readonly description: string
  readonly primaryColor: string   // hex — for preview swatch
  readonly secondaryColor: string // hex — for preview swatch
  readonly isDark: boolean
}

export const THEME_META = {
  aurora: {
    name: 'aurora' as const,
    label: 'Probex Aurora',
    description: 'Signature dark — cyan & purple on deep space',
    primaryColor: '#00D4FF',
    secondaryColor: '#6D5EF7',
    isDark: true,
  },
  midnight: {
    name: 'midnight' as const,
    label: 'Midnight',
    description: 'Maximum dark — blue on near-black',
    primaryColor: '#3B82F6',
    secondaryColor: '#4F46E5',
    isDark: true,
  },
  quantum: {
    name: 'quantum' as const,
    label: 'Quantum',
    description: 'Neon green — quantitative intelligence',
    primaryColor: '#00FF88',
    secondaryColor: '#0D9488',
    isDark: true,
  },
  emerald: {
    name: 'emerald' as const,
    label: 'Emerald',
    description: 'Premium dark green — wealth management',
    primaryColor: '#10B981',
    secondaryColor: '#065F46',
    isDark: true,
  },
  institutional: {
    name: 'institutional' as const,
    label: 'Institutional',
    description: 'Light mode — TradFi credibility',
    primaryColor: '#2563EB',
    secondaryColor: '#4F46E5',
    isDark: false,
  },
  ember: {
    name: 'ember' as const,
    label: 'Ember (Beta)',
    description: 'Molten — burnt orange & amber on warm black',
    primaryColor: '#F26419',
    secondaryColor: '#F7A23B',
    isDark: true,
  },
} as const satisfies Record<ThemeName, ThemeMeta>

// ─── Theme store state ────────────────────────────────────────────────────

export interface ThemeState {
  /** Currently active theme */
  theme: ThemeName
  /** Whether the system prefers dark mode */
  systemPrefersDark: boolean
}

export interface ThemeActions {
  setTheme: (theme: ThemeName) => void
  resetToDefault: () => void
}

export type ThemeStore = ThemeState & ThemeActions
