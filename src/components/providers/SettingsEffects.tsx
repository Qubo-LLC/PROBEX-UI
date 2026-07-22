'use client'

// SettingsEffects — applies persisted accessibility preferences to the document
// so no Settings toggle is a no-op. Renders null; mounted once in the shell.
// Reads settingsStore and reflects prefs as data-attributes on <html>, which
// globals.css styles. Everything here is local; no backend involved.

import { useEffect } from 'react'
import { useSettingsStore } from '@/store/settingsStore'

export function SettingsEffects() {
  const a11y = useSettingsStore((s) => s.accessibility)

  useEffect(() => {
    const el = document.documentElement
    el.setAttribute('data-text-size', a11y.textSize)
    el.toggleAttribute('data-reduce-motion', a11y.reduceMotion)
    el.toggleAttribute('data-high-contrast', a11y.highContrast)
    el.toggleAttribute('data-underline-links', a11y.underlineLinks)
  }, [a11y.textSize, a11y.reduceMotion, a11y.highContrast, a11y.underlineLinks])

  return null
}
