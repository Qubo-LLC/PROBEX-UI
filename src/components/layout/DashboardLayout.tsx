'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { Sidebar }       from './Sidebar'
import { TopNavigation } from './TopNavigation'
import { AuthGate }               from '@/components/providers/AuthGate'
import { ApplicationStateLoader } from '@/components/providers/ApplicationStateLoader'
import { SettingsEffects }        from '@/components/providers/SettingsEffects'
import { LivenessEffect }         from '@/components/providers/LivenessEffect'
import { cn }            from '@/lib/utils'
import { useMobileOpen, useSidebarStore } from '@/store/sidebarStore'

interface DashboardLayoutProps {
  children: ReactNode
}

// Three-region dashboard shell: fixed TopNavigation, fixed-width Sidebar (an
// overlay drawer on mobile via SidebarStore.isMobileOpen), and a flex-1 main
// area — only the main content scrolls.
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobileOpen = useMobileOpen()
  const closeMobile  = useSidebarStore((s) => s.closeMobile)

  // ─── Mobile drawer focus management ─────────────────────────────────────────
  // The drawer is a SECOND <Sidebar/> instance parked off-canvas by
  // `-translate-x-full`. A transform moves pixels and nothing else: the closed
  // drawer kept `display:flex` and `visibility:visible`, so all ten navigation
  // links stayed in the tab order and the accessibility tree. Measured at 375px:
  // 21 focusable elements sitting entirely off-screen, ahead of the page content
  // a keyboard or screen-reader user was trying to reach.
  //
  // `inert` (React 19 supports it as a boolean prop) removes the subtree from
  // focus, hit-testing and the accessibility tree in one attribute, which is
  // exactly the semantic wanted here — and unlike unmounting it preserves the
  // 220ms slide transition, so the shell's motion is unchanged.
  const drawerRef  = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isMobileOpen) return undefined

    // Remember what opened the drawer so focus can return there on close —
    // typically the top bar's menu button, but this stays correct whatever
    // triggered it.
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusables = (): HTMLElement[] =>
      drawerRef.current
        ? [...drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        : []

    focusables()[0]?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeMobile(); return }
      if (e.key !== 'Tab') return

      const items = focusables()
      if (items.length === 0) return
      const first = items[0]!
      const last  = items[items.length - 1]!
      const active = document.activeElement

      // Wrap at both ends so Tab cannot escape an open modal drawer into the
      // page behind it.
      if (e.shiftKey && active === first)      { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      restoreRef.current?.focus()
    }
  }, [isMobileOpen, closeMobile])

  return (
    <AuthGate>
    <div
      className="flex flex-col h-screen overflow-hidden"
      // Environmental light field (Phase 1 · T6) composited as the shell's base
      // background layer: the fixed atmospheric glow paints behind all content,
      // the solid --probex-bg is the final layer. It's a background (not an
      // element), so it never intercepts pointer events. The content <main> is
      // transparent so the field shows through the content plane behind the glass
      // cards; the opaque sidebar/top-nav chassis cover it in their own regions.
      style={{ background: 'var(--probex-lightfield), var(--probex-bg)' }}
    >
      {/* ── Top Navigation — fixed height, spans full width ───────────── */}
      <TopNavigation />

      {/* ── Body row — sidebar + main content ────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Mobile overlay backdrop ────────────────────────────────── */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-backdrop lg:hidden"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar — desktop always visible, mobile overlay ──────── */}
        <div
          className={cn(
            // Desktop: always in flow
            'hidden lg:flex flex-shrink-0',
            'h-full z-sidebar',
          )}
        >
          <Sidebar />
        </div>

        {/* Mobile sidebar drawer */}
        <div
          ref={drawerRef}
          className={cn(
            'fixed top-0 left-0 h-full z-sidebar lg:hidden',
            'transition-transform',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          // Chassis motion, not content motion — the drawer slides the shell
          // rather than settling a value, so it keeps its own 220ms curve. It
          // now reads that duration from --motion-shell instead of an arbitrary
          // `duration-220`, so the one place shell timing is decided is the
          // token file. Same duration and same curve as before.
          style={{ transitionDuration: 'var(--motion-shell)', transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' }}
          // Closed, the drawer is off-canvas but still rendered. Without these
          // its links stay focusable and announced — see the focus-management
          // note above. `role="dialog"` is only correct while it is acting as
          // one; a permanently-present dialog role would be announced even when
          // there is nothing to interact with.
          inert={!isMobileOpen}
          aria-hidden={!isMobileOpen}
          {...(isMobileOpen ? { role: 'dialog' as const, 'aria-modal': true } : {})}
          aria-label="Navigation drawer"
        >
          {/* Mobile: always render expanded */}
          <Sidebar />
        </div>

        {/* ── Main content area ─────────────────────────────────────── */}
        <main
          id="main-content"
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden',
            'transition-all duration-220 ease-[cubic-bezier(0.4,0,0.2,1)]',
          )}
          // Transparent so the shell's light field (T6) shows through the
          // content plane behind the glass surfaces.
          style={{ background: 'transparent' }}
          // Skip-to-content target
          tabIndex={-1}
        >
          {/*
            page-container class provides consistent page padding.
            Defined in DashboardLayout styles below.
            Individual pages import PageHeader and render their content here.
          */}
          {children}
          {/* The rail is fixed, so the last ~72px of every page would sit
              under it. Reserved here rather than in each page, and only at the
              widths where the rail exists. */}
          <div
            className="md:hidden"
            style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
            aria-hidden="true"
          />
        </main>
      </div>

      {/* Mobile navigation rail. The drawer above remains the full index. */}
      <BottomNav />

      {/* ── Skip to content link — accessibility ──────────────────────── */}
      <a
        href="#main-content"
        className={cn(
          'fixed top-3 left-3 z-skiplink px-4 py-2 rounded-md text-sm font-semibold',
          'opacity-0 focus:opacity-100 pointer-events-none focus:pointer-events-auto',
          '-translate-y-16 focus:translate-y-0 transition-all duration-150',
        )}
        style={{
          background: 'var(--probex-primary)',
          color:      'var(--probex-bg)',
        }}
      >
        Skip to content
      </a>

      {/* ApplicationStateLoader fetches all engine endpoints once and writes
          to the ApplicationStore — no rendering, no HTTP duplication. */}
      <ApplicationStateLoader />

      {/* Applies persisted accessibility preferences to <html> (Settings). */}
      <SettingsEffects />

      {/* Reflects the resolved system state onto <html> so liveness animation
          is suppressed product-wide whenever the data is not actually live. */}
      <LivenessEffect />

      {/* ── Reserved overlay host (Phase 1 · T9) ─────────────────────────────
          Canonical mount point for future modal / toast / tooltip layers.
          Overlays render here (or via portal to it) and stack using the
          z-index token scale in tailwind.config.ts:
            z-backdrop (30) · z-sidebar (40) · z-topnav (50) ·
            z-modal (60) · z-toast (70) · z-tooltip (80) · z-skiplink (90)
          No overlay layer exists yet, so no element is rendered — this comment
          reserves the slot and documents the contract. */}
    </div>
    </AuthGate>
  )
}
