'use client'

// Theme selection panel within /settings.
// Surfaces SURFACED_THEMES generically, with live preview swatches — Midnight
// (dark), Institutional (light), and Ember (beta — burnt orange on warm
// black, 2026-07-24). Demoted themes (aurora/quantum/emerald) remain in the
// engine and still render if already persisted — they are just not offered.

import { useThemeStore }               from '@/store/themeStore'
import { SURFACED_THEMES, THEME_META } from '@/types/theme'

export function AppearanceSettings() {
  const { theme, setTheme } = useThemeStore()

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--probex-text-primary)' }}>
          Appearance
        </h2>
        <p className="text-xs" style={{ color: 'var(--probex-text-muted)' }}>
          Choose your Probex theme. Selection persists across sessions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
        {SURFACED_THEMES.map((t) => {
          const meta    = THEME_META[t]
          const isActive = theme === t

          return (
            <button
              key={t}
              onClick={() => setTheme(t)}
              // focus-ring is the product's shared keyboard treatment. The
              // inline `outline: 'none'` that used to sit in this style object
              // silently defeated it — see the note above the component.
              className="focus-ring"
              aria-pressed={isActive}
              style={{
                background:   'var(--probex-surface)',
                border:       `1.5px solid ${isActive ? 'var(--probex-primary)' : 'var(--probex-border-default)'}`,
                borderRadius: 10,
                padding:      '14px 16px',
                cursor:       'pointer',
                textAlign:    'left',
                transition:   'border-color 0.15s, transform 0.12s',
                transform:    isActive ? 'scale(1.02)' : 'scale(1)',
                position:     'relative',
              }}
            >
              {/* Swatch row */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                {/* Third swatch was a hardcoded emerald literal; it now draws the
                    theme's own positive token, so the preview shows the palette
                    the theme actually uses rather than one fixed green. */}
                {[meta.primaryColor, meta.secondaryColor, 'var(--probex-positive)'].map((c, i) => (
                  <span
                    key={i}
                    style={{ width: 16, height: 16, borderRadius: 3, background: c, display: 'block', border: '1px solid var(--probex-border)' }}
                  />
                ))}
                {!meta.isDark && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--probex-text-muted)', alignSelf: 'center', marginLeft: 2 }}>
                    LIGHT
                  </span>
                )}
              </div>

              {/* Label */}
              <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--probex-text-primary)' }}>
                {meta.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--probex-text-muted)', lineHeight: 1.45 }}>
                {meta.description}
              </div>

              {/* Active indicator */}
              {isActive && (
                <span
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'var(--probex-primary)',
                    color: 'var(--probex-on-accent)',
                    fontSize: 11, fontWeight: 700,
                    padding: '2px 6px', borderRadius: 99,
                    letterSpacing: '0.06em',
                  }}
                >
                  ACTIVE
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
