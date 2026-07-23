'use client'

// Theme selection panel within /settings.
// Surfaces SURFACED_THEMES generically, with live preview swatches — Midnight
// (dark), Institutional (light), and Nova (beta, added 2026-07-23 frontend
// revamp initiative). Demoted themes (aurora/quantum/emerald) remain in the
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
                outline:      'none',
              }}
            >
              {/* Swatch row */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                {[meta.primaryColor, meta.secondaryColor, meta.isDark ? '#10B981' : '#059669'].map((c, i) => (
                  <span
                    key={i}
                    style={{ width: 16, height: 16, borderRadius: 3, background: c, display: 'block', border: '1px solid rgba(128,128,128,0.15)' }}
                  />
                ))}
                {!meta.isDark && (
                  <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--probex-text-muted)', alignSelf: 'center', marginLeft: 2 }}>
                    LIGHT
                  </span>
                )}
              </div>

              {/* Label */}
              <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--probex-text-primary)' }}>
                {meta.label}
              </div>
              <div style={{ fontSize: 10, color: 'var(--probex-text-muted)', lineHeight: 1.45 }}>
                {meta.description}
              </div>

              {/* Active indicator */}
              {isActive && (
                <span
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'var(--probex-primary)',
                    color: meta.isDark ? '#000' : '#fff',
                    fontSize: 9, fontWeight: 700,
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
