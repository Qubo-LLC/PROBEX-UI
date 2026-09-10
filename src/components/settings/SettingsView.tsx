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

interface Group { label: string; items: Array<{ id: SectionId; label: string; pending?: boolean }> }

// `pending` marks a section with nothing actionable in it yet.
//
// Security and Sessions & Devices contain no working control at all — every row
// in them reads "Available in a future release", because they need the
// authentication service. The panels themselves are honest; the NAV was not:
// three of the first four entries led somewhere with nothing to do, and they sat
// in the group a configuration centre puts its most important items. Marking
// them means a reader can see that before spending a click, without the product
// pretending the sections do not exist.
//
// Profile is NOT marked: display name and headline really do persist.
const GROUPS: Group[] = [
  {
    label: 'Preferences',
    items: [
      { id: 'appearance',    label: 'Appearance' },
      { id: 'trading',       label: 'Trading & Workspace' },
      { id: 'accessibility', label: 'Accessibility' },
      { id: 'notifications', label: 'Notifications' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'profile',  label: 'Profile' },
      { id: 'security', label: 'Security',           pending: true },
      { id: 'sessions', label: 'Sessions & Devices', pending: true },
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

/** Accessible name for the active panel, so the region is labelled rather than
 *  live. Derived from the same source as the nav, so the two cannot drift. */
const ALL_LABELS: Record<SectionId, string> = Object.fromEntries(
  GROUPS.flatMap((g) => g.items.map((i) => [i.id, i.label])),
) as Record<SectionId, string>

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
        subtitle="Appearance, workspace preferences, accessibility, and platform information"
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
                    className="relative flex-shrink-0 text-xs font-medium text-left px-3 py-2 rounded-md cursor-pointer transition-colors duration-100 whitespace-nowrap focus-ring flex items-center gap-2"
                    style={{
                      background: isActive ? 'var(--probex-primary-dim)' : 'transparent',
                      color:      isActive ? 'var(--probex-primary)' : 'var(--probex-text-secondary)',
                      fontWeight: isActive ? 600 : 500,
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--probex-surface-2)' }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    {item.label}
                    {/* A word, not only a dot — the state has to survive
                        greyscale and a colour deficiency. */}
                    {item.pending && (
                      <span
                        className="text-2xs font-semibold uppercase tracking-wider px-1.5 rounded"
                        style={{ background: 'var(--probex-surface-2)', color: 'var(--probex-text-disabled)' }}
                      >
                        Soon
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Active section.
            This carried aria-live="polite" — measured at 233 characters, so
            every nav click read the entire panel aloud. Switching sections is a
            deliberate navigation, not an event that arrives unbidden, so the
            announcement belongs on the heading the user has moved to. `key`
            remounts the panel so focus management and state start clean. */}
        <section className="flex-1 min-w-0 w-full" aria-labelledby="settings-section-heading">
          <h2 id="settings-section-heading" className="sr-only">
            {ALL_LABELS[active]}
          </h2>
          <div key={active}>{renderSection(active)}</div>
        </section>
      </div>
    </div>
  )
}
