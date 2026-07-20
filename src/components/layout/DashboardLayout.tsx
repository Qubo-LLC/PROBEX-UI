'use client'

import type { ReactNode } from 'react'
import { Sidebar }       from './Sidebar'
import { TopNavigation } from './TopNavigation'
import { AuthGate }               from '@/components/providers/AuthGate'
import { ApplicationStateLoader } from '@/components/providers/ApplicationStateLoader'
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
          className={cn(
            'fixed top-0 left-0 h-full z-sidebar lg:hidden',
            'transition-transform duration-220 ease-[cubic-bezier(0.4,0,0.2,1)]',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          aria-modal={isMobileOpen}
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
        </main>
      </div>

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
