'use client'

// Settings — the categorized preferences home (Settings Restoration). Three
// groups matching the product's mental model:
//   ACCOUNT      — Profile, Security, Sessions & Devices
//   PREFERENCES  — Appearance, Notifications, Trading & Workspace, Accessibility
//   SYSTEM       — About
//
// Preference panels persist locally (settingsStore); auth-dependent panels are
// shown honestly as "Available in a future release". Section is deep-linkable
// via the URL hash.

import { useEffect, useState } from 'react'
import { AppearanceSettings }    from './AppearanceSettings'
import { AccessibilitySettings } from './AccessibilitySettings'
import { NotificationsSettings } from './NotificationsSettings'
import { TradingSettings }       from './TradingSettings'
import { ProfileSettings }       from './ProfileSettings'
import { SecuritySettings }      from './SecuritySettings'
import { SessionsSettings }      from './SessionsSettings'
import { AboutSettings }         from './AboutSettings'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

type SectionId =
  | 'profile' | 'security' | 'sessions'
  | 'appearance' | 'notifications' | 'trading' | 'accessibility'
  | 'about'

interface Group { label: string; items: Array<{ id: SectionId; label: string }> }

const GROUPS: Group[] = [
  {
    label: 'Account',
    items: [
      { id: 'profile',  label: 'Profile' },
      { id: 'security', label: 'Security' },
      { id: 'sessions', label: 'Sessions & Devices' },
    ],
  },
  {
    label: 'Preferences',
    items: [
      { id: 'appearance',    label: 'Appearance' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'trading',       label: 'Trading & Workspace' },
      { id: 'accessibility', label: 'Accessibility' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'about', label: 'About' },
    ],
  },
]

const ALL_IDS: SectionId[] = GROUPS.flatMap((g) => g.items.map((i) => i.id))

function renderSection(id: SectionId) {
  switch (id) {
    case 'profile':       return <ProfileSettings />
    case 'security':      return <SecuritySettings />
    case 'sessions':      return <SessionsSettings />
    case 'appearance':    return <Card><AppearanceSettings /></Card>
    case 'notifications': return <NotificationsSettings />
    case 'trading':       return <TradingSettings />
    case 'accessibility': return <AccessibilitySettings />
    case 'about':         return <AboutSettings />
  }
}

export function SettingsView() {
  const [active, setActive] = useState<SectionId>('appearance')

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as SectionId
    if (ALL_IDS.includes(hash)) setActive(hash)
  }, [])

  const select = (id: SectionId) => {
    setActive(id)
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <div className="page-container animate-fade-in-up">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, preferences, and platform configuration"
      />

      <div className="flex flex-col md:flex-row gap-5 md:gap-8 items-start">
        {/* Categorized nav */}
        <nav
          aria-label="Settings sections"
          className="flex md:flex-col gap-4 md:gap-5 w-full md:w-[220px] md:flex-shrink-0 overflow-x-auto md:overflow-visible no-scrollbar md:sticky md:top-4 pb-1 md:pb-0"
        >
          {GROUPS.map((group) => (
            <div key={group.label} className="flex md:flex-col gap-1 flex-shrink-0">
              <p
                className="hidden md:block text-2xs font-bold uppercase tracking-wider px-2 pb-1 select-none"
                style={{ color: 'var(--probex-text-disabled)' }}
              >
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = active === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => select(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className="relative flex-shrink-0 text-xs font-medium text-left px-3 py-2 rounded-md cursor-pointer transition-colors duration-100 whitespace-nowrap"
                    style={{
                      background: isActive ? 'var(--probex-primary-dim)' : 'transparent',
                      color:      isActive ? 'var(--probex-primary)' : 'var(--probex-text-secondary)',
                      fontWeight: isActive ? 600 : 500,
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--probex-surface-2)' }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Active section */}
        <section className="flex-1 min-w-0 w-full" aria-live="polite">
          {renderSection(active)}
        </section>
      </div>
    </div>
  )
}
