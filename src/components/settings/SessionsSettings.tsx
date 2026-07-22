'use client'

// Sessions & Devices — device/session management needs the authentication
// service. Presented honestly as a future release rather than a fake table.

import { SettingsSection } from './controls'

export function SessionsSettings() {
  return (
    <SettingsSection
      title="Sessions & Devices"
      description="Review and revoke the devices signed in to your account."
    >
      <div className="px-[18px] py-10 flex flex-col items-center text-center gap-1.5">
        <p className="text-sm font-semibold" style={{ color: 'var(--probex-text-secondary)' }}>
          Available in a future release
        </p>
        <p className="text-xs max-w-xs" style={{ color: 'var(--probex-text-muted)' }}>
          Device and session management activates with the authentication service.
        </p>
      </div>
    </SettingsSection>
  )
}
