'use client'

// Notification preferences — persisted locally. The user's choices are real and
// saved; delivery (push / email) is a future service, stated honestly.

import { useSettingsStore } from '@/store/settingsStore'
import type { NotificationPrefs } from '@/types/settings'
import { SettingsSection, SettingRow, Toggle } from './controls'

export function NotificationsSettings() {
  const p   = useSettingsStore((s) => s.notifications)
  const set = useSettingsStore((s) => s.setNotifications)
  const update = <K extends keyof NotificationPrefs>(k: K, v: NotificationPrefs[K]) => set({ [k]: v })

  return (
    <SettingsSection
      title="Notifications"
      description="Choose what the engine alerts you about. Your choices are saved on this device; delivery (push / email) activates when the notifications service ships."
    >
      <SettingRow label="Enable notifications" description="Master switch for all alerts.">
        <Toggle checked={p.master} onChange={(v) => update('master', v)} label="Enable notifications" />
      </SettingRow>
      <SettingRow label="Price alerts" description="Significant BTC price moves.">
        <Toggle checked={p.priceAlerts} onChange={(v) => update('priceAlerts', v)} label="Price alerts" />
      </SettingRow>
      <SettingRow label="Edge alerts" description="When the engine detects a new tradeable edge.">
        <Toggle checked={p.edgeAlerts} onChange={(v) => update('edgeAlerts', v)} label="Edge alerts" />
      </SettingRow>
      <SettingRow label="Survival alerts" description="Capital-protection state changes (Caution / Danger / Critical).">
        <Toggle checked={p.survivalAlerts} onChange={(v) => update('survivalAlerts', v)} label="Survival alerts" />
      </SettingRow>
      <SettingRow label="Execution alerts" description="Trade fills, retries, and rate-limit backoff." last>
        <Toggle checked={p.executionAlerts} onChange={(v) => update('executionAlerts', v)} label="Execution alerts" />
      </SettingRow>
    </SettingsSection>
  )
}
