'use client'

import Link                   from 'next/link'
import { cn }                 from '@/lib/utils'
import { ProbexMark }         from '@/components/ui/ProbexMark'
import { EngineStatusStrip }  from './EngineStatusStrip'
import { useSidebarStore, useSidebarCollapsed } from '@/store/sidebarStore'
import { ROUTES, TOPNAV_HEIGHT } from '@/config/constants'

/**
 * TopNavigation
 * ─────────────
 * Fixed-height top bar. Communicates ENGINE STATUS, not application chrome
 * (PROBEX_PRODUCT_SPEC.md §3): brand + rail control on the left, live engine
 * vitals (BTC price · survival chip · feed status · mode badge) on the right.
 *
 * Consumer-dashboard conventions (search, notifications, profile menus)
 * were removed — none had a backend counterpart. Notifications return with
 * the P1 alerts API; profile returns with P3 auth.
 */
export function TopNavigation() {
  const toggleMobile = useSidebarStore((s) => s.toggleMobile)
  const toggleRail   = useSidebarStore((s) => s.toggle)
  const isCollapsed  = useSidebarCollapsed()

  return (
    <header
      className={cn(
        'flex items-center gap-3 px-4 flex-shrink-0',
        'border-b z-topnav',
      )}
      style={{
        height:          `${TOPNAV_HEIGHT}px`,
        background:      'var(--probex-surface)',
        borderColor:     'var(--probex-border)',
      }}
      role="banner"
    >
      {/* ── Left region: collapse/menu + brand ──────────────────────── */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Mobile: open the navigation drawer */}
        <button
          onClick={toggleMobile}
          aria-label="Open navigation menu"
          className={cn(
            'focus-ring lg:hidden flex items-center justify-center w-8 h-8 rounded-md',
            'transition-colors duration-200 cursor-pointer active:scale-95',
          )}
          style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border-default)', color: 'var(--probex-text-secondary)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>

        {/* Desktop: collapse / expand the navigation rail */}
        <button
          onClick={toggleRail}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          className={cn(
            'focus-ring hidden lg:flex items-center justify-center w-8 h-8 rounded-md',
            'transition-colors duration-200 cursor-pointer active:scale-95',
          )}
          style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border-default)', color: 'var(--probex-text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--probex-primary)'; e.currentTarget.style.borderColor = 'var(--probex-border-active)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--probex-text-secondary)'; e.currentTarget.style.borderColor = 'var(--probex-border-default)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>

        {/* Brand lockup — Probex (always visible) */}
        <Link
          href={ROUTES.HOME}
          className="flex items-center gap-2 no-underline cursor-pointer pl-0.5"
          aria-label="Probex home"
        >
          <ProbexMark size={24} />
          <span className="text-base font-bold text-gradient-brand tracking-tight hidden sm:inline">Probex</span>
        </Link>
      </div>

      {/* ── Spacer ───────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Right region: engine vitals ──────────────────────────────── */}
      <EngineStatusStrip />
    </header>
  )
}
