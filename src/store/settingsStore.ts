'use client'

// settingsStore — real, locally-persisted user preferences (Settings
// Restoration). Everything here is saved to localStorage; nothing needs a
// backend. This makes the Settings "Saved locally" promise true (the previous
// implementation used ephemeral useState and lost changes on reload).
//
// Accessibility prefs are additionally APPLIED to the document by
// SettingsEffects, so no toggle is a no-op. Notification prefs persist the
// user's choices; actual delivery is a future service (shown honestly in the
// UI). Profile/Security/Sessions that need auth are surfaced as future work.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AccessibilityPrefs, NotificationPrefs, ProfilePrefs, WorkspacePrefs,
} from '@/types/settings'
import { DEFAULT_ACCESSIBILITY_PREFS } from '@/lib/settings/defaults'

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  master:          true,
  priceAlerts:     true,
  edgeAlerts:      true,
  survivalAlerts:  true,
  executionAlerts: false,
}

const DEFAULT_WORKSPACE_PREFS: WorkspacePrefs = {
  tradingMode:        'hybrid',
  defaultMarketView:  'grid',
  confirmManualTrade: true,
  compactNumbers:     false,
}

const DEFAULT_PROFILE_PREFS: ProfilePrefs = {
  displayName: '',
  headline:    '',
}

interface SettingsStore {
  accessibility: AccessibilityPrefs
  notifications: NotificationPrefs
  workspace:     WorkspacePrefs
  profile:       ProfilePrefs
  setAccessibility: (patch: Partial<AccessibilityPrefs>) => void
  setNotifications: (patch: Partial<NotificationPrefs>) => void
  setWorkspace:     (patch: Partial<WorkspacePrefs>) => void
  setProfile:       (patch: Partial<ProfilePrefs>) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      accessibility: DEFAULT_ACCESSIBILITY_PREFS,
      notifications: DEFAULT_NOTIFICATION_PREFS,
      workspace:     DEFAULT_WORKSPACE_PREFS,
      profile:       DEFAULT_PROFILE_PREFS,
      setAccessibility: (patch) => set((s) => ({ accessibility: { ...s.accessibility, ...patch } })),
      setNotifications: (patch) => set((s) => ({ notifications: { ...s.notifications, ...patch } })),
      setWorkspace:     (patch) => set((s) => ({ workspace:     { ...s.workspace,     ...patch } })),
      setProfile:       (patch) => set((s) => ({ profile:       { ...s.profile,       ...patch } })),
    }),
    {
      name:    'probex-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
