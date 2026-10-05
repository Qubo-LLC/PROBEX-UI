'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  type ThemeStore,
  type ThemeName,
  DEFAULT_THEME,
  THEME_NAMES,
} from '@/types/theme'

const STORAGE_KEY = 'synatra-theme'

/**
 * Applies the theme by setting the data-theme attribute on <html>.
 * This drives all CSS variable overrides in synatra-tokens.css.
 */
function applyThemeToDOM(theme: ThemeName): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme:              DEFAULT_THEME,
      systemPrefersDark:  true,

      setTheme: (theme: ThemeName) => {
        if (!THEME_NAMES.includes(theme)) {
          console.warn(`[ThemeStore] Unknown theme: "${theme}". Falling back to default.`)
          theme = DEFAULT_THEME
        }
        applyThemeToDOM(theme)
        set({ theme })
      },

      resetToDefault: () => {
        applyThemeToDOM(DEFAULT_THEME)
        set({ theme: DEFAULT_THEME })
      },
    }),
    {
      name:    STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist the theme name — not the systemPrefersDark flag
      partialize: (state) => ({ theme: state.theme }),
      // Re-apply theme to DOM after hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDOM(state.theme)
        }
      },
    },
  ),
)

// ─── Selector hooks ────────────────────────────────────────────────────────

/** Returns only the current theme name — avoids re-renders on action changes */
export const useTheme = (): ThemeName =>
  useThemeStore((s) => s.theme)

/** Returns theme setter */
export const useSetTheme = (): ((theme: ThemeName) => void) =>
  useThemeStore((s) => s.setTheme)
