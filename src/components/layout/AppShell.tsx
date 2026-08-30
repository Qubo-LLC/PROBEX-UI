'use client'

import type { ReactNode } from 'react'
import { StoreProvider } from '@/providers/StoreProvider'
import { DashboardLayout } from './DashboardLayout'

interface AppShellProps {
  children: ReactNode
}

/**
 * AppShell
 * ────────
 * Top-level dashboard shell. Wraps DashboardLayout in the StoreProvider
 * hydration guard so persisted state (sidebar collapse, theme) is safely
 * available before first render.
 *
 * Separation of concerns:
 *   AppShell      — provider composition for the dashboard tree
 *   DashboardLayout — the actual 3-region visual layout (sidebar, topnav, main)
 *
 * This two-layer pattern keeps layout concerns out of provider concerns.
 *
 * ─── Provenance moved into the chrome (UI/UX pass) ───────────────────────────
 * EngineModeBanner used to mount here, above the layout, on the reasoning that
 * data provenance outranks navigation chrome. The principle was right; the
 * execution inverted it. A full-width tinted slab is the loudest element a web
 * app has, and spending it on "you are running locally without an engine" meant
 * the normal development state looked like an outage — so the signal stopped
 * being read, which is the opposite of what a provenance guarantee needs.
 *
 * Provenance now lives in two places that are impossible to miss but also
 * impossible to mistake for a crash: SystemStatusIndicator in the top nav
 * (state + synthetic flag + full diagnostics on demand), and ProvenanceBadge on
 * the values themselves, which now refuses to render "Live" while the app is
 * serving synthetic data. Every value carries its own lineage instead of one
 * banner vouching for all of them.
 *
 * Used by:
 *   src/app/(dashboard)/layout.tsx
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <StoreProvider>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </StoreProvider>
  )
}
