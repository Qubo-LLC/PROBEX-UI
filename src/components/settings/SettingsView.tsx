'use client'

// Settings — the future integration hub (PROBEX_PRODUCT_SPEC.md §4, §7).
//
// Today it holds only what works without backend persistence: Appearance
// (5-theme system), Accessibility (local prefs), and About. Backend-backed
// sections — Notifications, Alert Rules, API Keys, Trading/Strategy
// Parameters, Profile — return here as their endpoints land (spec §7).
//
// Section is deep-linkable via the URL hash.

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { AppearanceSettings }    from './AppearanceSettings'
import { AccessibilitySettings } from './AccessibilitySettings'
import { AboutSettings }         from './AboutSettings'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

type SectionId = 'appearance' | 'accessibility' | 'about'

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: 'appearance',    label: 'Appearance' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'about',         label: 'About' },
]

const ALL_IDS: SectionId[] = SECTIONS.map((s) => s.id)

function renderSection(id: SectionId) {
  switch (id) {
    case 'appearance':    return <Card><AppearanceSettings /></Card>
    case 'accessibility': return <AccessibilitySettings />
    case 'about':         return <AboutSettings />
  }
}

export function SettingsView() {
  const [active, setActive] = useState<SectionId>('appearance')

  // Deep-link: hydrate from hash on mount, keep hash in sync on change.
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
        subtitle="Appearance, accessibility, and application information"
      />

      <div className="flex flex-col md:flex-row gap-5 md:gap-8 items-start">
        {/* Nav */}
        <nav
          aria-label="Settings sections"
          className="flex md:flex-col gap-1 w-full md:w-[208px] md:flex-shrink-0 overflow-x-auto md:overflow-visible no-scrollbar md:sticky md:top-4 pb-1 md:pb-0"
        >
          {SECTIONS.map((item) => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => select(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex-shrink-0 text-xs font-medium text-left px-3 py-2 rounded-md cursor-pointer transition-colors duration-100 whitespace-nowrap',
                )}
                style={{
                  background: isActive ? 'var(--probex-primary-dim)' : 'transparent',
                  color:      isActive ? 'var(--probex-primary)' : 'var(--probex-text-secondary)',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--probex-surface-2)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Active section */}
        <section className="flex-1 min-w-0 w-full" aria-live="polite">
          {renderSection(active)}
        </section>
      </div>
    </div>
  )
}
