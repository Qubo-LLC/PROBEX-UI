'use client'

// Security — every control here requires the authentication service, which is a
// future release. Shown honestly rather than faked with non-functional toggles.

import { SettingsSection, SettingRow, ReadOnlyValue } from './controls'

export function SecuritySettings() {
  return (
    <SettingsSection
      title="Security"
      description="Protect your account and trading activity. These controls require the authentication service — available in a future release."
    >
      <SettingRow label="Two-factor authentication" description="Require a second factor at sign-in.">
        <ReadOnlyValue>Available in a future release</ReadOnlyValue>
      </SettingRow>
      <SettingRow label="Login alerts" description="Email me when a new device signs in.">
        <ReadOnlyValue>Available in a future release</ReadOnlyValue>
      </SettingRow>
      <SettingRow label="Password" description="Set and rotate your account password." last>
        <ReadOnlyValue>Available in a future release</ReadOnlyValue>
      </SettingRow>
    </SettingsSection>
  )
}
