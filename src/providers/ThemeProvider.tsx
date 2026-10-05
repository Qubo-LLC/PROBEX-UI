'use client'

import { useEffect, type ReactNode } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { DEFAULT_THEME } from '@/types/theme'

interface ThemeProviderProps {
  children:     ReactNode
  /** Server-resolved theme (from cookie) — prevents first-paint flash. */
  initialTheme?: string | undefined
}

// Applies the active theme as `data-theme` on <html>; synatra-tokens.css scopes all
// CSS-variable overrides to that attribute. Not using next-themes: Synatra themes are
// full token-set swaps (not just dark/light) and need data-theme, not a class.
export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const { theme, setTheme } = useThemeStore()

  // Apply persisted theme on mount — covers synchronous rehydration that the
  // store's onRehydrateStorage callback may miss.
  useEffect(() => {
    const resolvedTheme = theme ?? initialTheme ?? DEFAULT_THEME
    document.documentElement.setAttribute('data-theme', resolvedTheme)
  }, [theme, initialTheme])

  // Detect system dark/light preference (informational only — does not override theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    useThemeStore.setState({ systemPrefersDark: mq.matches })

    const handler = (e: MediaQueryListEvent) => {
      useThemeStore.setState({ systemPrefersDark: e.matches })
    }

    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Sync theme on every change (belt-and-suspenders alongside store middleware)
  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  // If theme store hasn't hydrated yet, apply the initial theme from server
  useEffect(() => {
    if (!theme && initialTheme) {
      setTheme(initialTheme as Parameters<typeof setTheme>[0])
    }
  }, [theme, initialTheme, setTheme])

  return <>{children}</>
}
