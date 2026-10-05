'use client'

// settingsStore — the accessibility preferences, persisted to this browser's
// localStorage and applied to the document by SettingsEffects (data attributes
// that globals.css styles) and read directly by TopNavigation (keyboard
// shortcuts) and MarketChart (reduced motion). Nothing here reaches the
// engine; nothing here needs it.
//
// Version 2 (2026-09-16) drops the notification, workspace and profile groups
// — see types/settings.ts — and the migration discards whatever an older
// browser had stored under them.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AccessibilityPrefs } from '@/types/settings'
import { DEFAULT_ACCESSIBILITY_PREFS } from '@/lib/settings/defaults'

interface SettingsStore {
  accessibility: AccessibilityPrefs
  setAccessibility: (patch: Partial<AccessibilityPrefs>) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      accessibility: DEFAULT_ACCESSIBILITY_PREFS,
      setAccessibility: (patch) => set((s) => ({ accessibility: { ...s.accessibility, ...patch } })),
    }),
    {
      name:       'synatra-settings',
      storage:    createJSONStorage(() => localStorage),
      version:    2,
      partialize: (s) => ({ accessibility: s.accessibility }),
      migrate:    (persisted) => {
        const old = persisted as { accessibility?: Partial<AccessibilityPrefs> } | undefined
        return { accessibility: { ...DEFAULT_ACCESSIBILITY_PREFS, ...(old?.accessibility ?? {}) } }
      },
    },
  ),
)
