'use client'

import { useState, useEffect, useCallback } from 'react'
import Link                   from 'next/link'
import { cn }                 from '@/lib/utils'
import { ProbexMark }         from '@/components/ui/ProbexMark'
import { EngineStatusStrip }  from './EngineStatusStrip'
import { ProfileMenu }        from './ProfileMenu'
import { CommandPalette }     from './CommandPalette'
import { useSidebarStore, useSidebarCollapsed } from '@/store/sidebarStore'
import { useSettingsStore }   from '@/store/settingsStore'
import { ROUTES, TOPNAV_HEIGHT } from '@/config/constants'

/**
 * TopNavigation
 * ─────────────
 * Fixed-height top bar. Communicates ENGINE STATUS, not application chrome
 * (PROBEX_PRODUCT_SPEC.md §3): brand + rail control on the left, live engine
 * vitals (BTC price · survival chip · feed status · mode badge) on the right.
 *
 * 2026-07-24: a session-identity element (ProfileMenu — gradient avatar +
 * dropdown) was added on the right, matching the mock's premium topbar. It
 * represents the ENGINE SESSION (bot/version/mode), not a signed-in user, so
 * it needs no auth backend. Notifications still await the P1 alerts API.
 */
export function TopNavigation() {
  const toggleMobile      = useSidebarStore((s) => s.toggleMobile)
  const toggleRail        = useSidebarStore((s) => s.toggle)
  const isCollapsed       = useSidebarCollapsed()
  const shortcutsEnabled  = useSettingsStore((s) => s.accessibility.keyboardShortcuts)

  const [paletteOpen, setPaletteOpen] = useState(false)
  const closePalette = useCallback(() => setPaletteOpen(false), [])

  // Global ⌘K / Ctrl+K opens the command palette — honours the accessibility
  // "keyboard shortcuts" preference, so that toggle has a real effect.
  useEffect(() => {
    if (!shortcutsEnabled) return undefined
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcutsEnabled])

  return (
    <header
      className={cn(
        // 3-column grid: the 1fr side columns absorb the brand/status width
        // difference so the centre column (search) is centred on the HEADER,
        // not on the leftover space. Brand anchors left, engine status right.
        'grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 px-4 flex-shrink-0',
        'border-b z-topnav',
      )}
      style={{
        height:          `${TOPNAV_HEIGHT}px`,
        background:      'var(--probex-surface)',
        borderColor:     'var(--probex-border)',
      }}
      role="banner"
    >
      {/* ── Left region (col 1): collapse/menu + brand ──────────────── */}
      <div className="flex items-center gap-2.5 min-w-0">
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

      {/* ── Centre region (col 2): command palette trigger (⌘K) ──────── */}
      <div className="w-9 sm:w-[340px] md:w-[460px] max-w-full justify-self-center">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Open command palette"
          className="focus-ring flex items-center gap-2 h-8 w-full rounded-md px-2.5 sm:px-3 transition-colors duration-150 cursor-pointer justify-center sm:justify-start"
          style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border-default)', color: 'var(--probex-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--probex-border-active)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--probex-border-default)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <span className="hidden sm:inline text-xs flex-1 text-left">Jump to page…</span>
          <kbd className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5" style={{ border: '1px solid var(--probex-border)' }}>⌘K</kbd>
        </button>
      </div>

      {/* ── Right region (col 3): engine vitals + session identity ───── */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 min-w-0">
        <EngineStatusStrip />
        <ProfileMenu />
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </header>
  )
}
