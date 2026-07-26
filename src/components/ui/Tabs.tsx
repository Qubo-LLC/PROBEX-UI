'use client'

// Tabs — the primitive the IA consolidation is built on.
//
// Collapsing 16 sidebar destinations into 9 domain pages only works if the
// absorbed views remain directly reachable. So tab state lives in the URL as a
// query param, not in component state: /markets?view=watchlist is bookmarkable,
// linkable, survives a refresh, and keeps browser back/forward meaningful.
// That is what makes a tab a real replacement for a route rather than a
// downgrade.
//
// Navigation uses replace() rather than push() so switching tabs does not
// stack history entries — Back should leave the page, not step through every
// tab visited on the way.

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface TabDef {
  /** URL value, e.g. 'watchlist'. The first tab's id is the implicit default. */
  id:     string
  label:  string
  /** Optional count shown as a trailing chip. */
  count?: number | undefined
}

interface TabsProps {
  tabs:  readonly TabDef[]
  /** Query-param name. Distinct per page when two tab sets could coexist. */
  param?: string | undefined
  /** Accessible name for the tablist. */
  label:  string
}

/** Reads the active tab from the URL, falling back to the first tab. */
export function useActiveTab(tabs: readonly TabDef[], param = 'view'): string {
  const searchParams = useSearchParams()
  const requested = searchParams.get(param)
  // An unknown value in the URL (stale bookmark, typo) resolves to the default
  // rather than rendering nothing.
  return tabs.some((t) => t.id === requested) && requested !== null ? requested : (tabs[0]?.id ?? '')
}

export function Tabs({ tabs, param = 'view', label }: TabsProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const active       = useActiveTab(tabs, param)

  const select = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams.toString())
      // The default tab is represented by the absence of the param, so the
      // canonical URL for a page stays clean.
      if (id === tabs[0]?.id) next.delete(param)
      else next.set(param, id)
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams, param, tabs],
  )

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex items-center gap-0.5 overflow-x-auto"
      style={{ borderBottom: '1px solid var(--probex-border)' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => select(tab.id)}
            className={cn(
              'relative px-3 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer',
              'transition-colors duration-150 focus-ring flex items-center gap-1.5',
            )}
            style={{ color: isActive ? 'var(--probex-text-primary)' : 'var(--probex-text-muted)' }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className="text-2xs tabular-nums px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--probex-surface-2)',
                  color: isActive ? 'var(--probex-text-secondary)' : 'var(--probex-text-disabled)',
                }}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span
                className="absolute left-0 right-0 -bottom-px h-0.5"
                style={{ background: 'var(--probex-accent)' }}
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Renders `children` only when `id` is the active tab. */
export function TabPanel({
  id, active, children,
}: { id: string; active: string; children: React.ReactNode }) {
  if (id !== active) return null
  return (
    <div role="tabpanel" className="flex flex-col gap-4 animate-fade-in-up">
      {children}
    </div>
  )
}
