'use client'

// Theme selection. The theme is a browser preference — themeStore persists
// the name to localStorage, the root layout's inline script applies it before
// React hydrates (no flash), and synatra-tokens.css swaps the whole token set
// on [data-theme]. Nothing here reaches the engine.
//
// SURFACED_THEMES is what is offered; the other themes in THEME_NAMES still
// resolve if a browser already persisted one, they are just not listed.

import { useThemeStore }               from '@/store/themeStore'
import { SURFACED_THEMES, THEME_META } from '@/types/theme'

export function AppearanceSettings() {
  const theme    = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {SURFACED_THEMES.map((t) => {
        const meta   = THEME_META[t]
        const active = theme === t
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(t)}
            className="focus-ring flex items-start gap-3 text-left rounded-md px-3 py-2.5 cursor-pointer transition-colors duration-100"
            style={{
              background: active ? 'var(--synatra-primary-dim)' : 'transparent',
              border:     `1px solid ${active ? 'var(--synatra-primary)' : 'var(--synatra-border-default)'}`,
            }}
          >
            {/* The theme's own primary, secondary and positive tokens — the
                palette it actually uses, not a fixed preview. */}
            <span className="flex gap-1 flex-shrink-0 mt-0.5" aria-hidden="true">
              {[meta.primaryColor, meta.secondaryColor].map((c, i) => (
                <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c, display: 'block', border: '1px solid var(--synatra-border)' }} />
              ))}
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-xs font-semibold" style={{ color: active ? 'var(--synatra-primary)' : 'var(--synatra-text-primary)' }}>
                {meta.label}
                {active && <span className="t-metadata ml-1.5">· active</span>}
                {!meta.isDark && <span className="t-metadata ml-1.5">· light</span>}
              </span>
              <span className="t-helper">{meta.description}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
