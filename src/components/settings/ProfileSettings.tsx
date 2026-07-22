'use client'

// Profile — display name and headline persist locally (real). Email and avatar
// are managed by authentication, which is a future release (stated honestly).

import { useSettingsStore } from '@/store/settingsStore'
import { SettingsSection, SettingRow, TextField, ReadOnlyValue } from './controls'

export function ProfileSettings() {
  const p   = useSettingsStore((s) => s.profile)
  const set = useSettingsStore((s) => s.setProfile)

  return (
    <SettingsSection
      title="Profile"
      description="How you appear across Probex. Name and headline are saved on this device."
    >
      <SettingRow label="Display name" htmlFor="displayName" description="Shown in the shell and menus.">
        <TextField id="displayName" value={p.displayName} onChange={(v) => set({ displayName: v })} placeholder="Your name" />
      </SettingRow>
      <SettingRow label="Headline" htmlFor="headline" description="A short tagline for your profile.">
        <TextField id="headline" value={p.headline} onChange={(v) => set({ headline: v })} placeholder="e.g. Autonomous-first trader" />
      </SettingRow>
      <SettingRow label="Email address" description="Managed via authentication.">
        <ReadOnlyValue>Available in a future release</ReadOnlyValue>
      </SettingRow>
      <SettingRow label="Profile photo" description="Avatar upload." last>
        <ReadOnlyValue>Available in a future release</ReadOnlyValue>
      </SettingRow>
    </SettingsSection>
  )
}
