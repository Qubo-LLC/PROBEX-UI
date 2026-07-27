'use client'

import type { ReactNode } from 'react'
import { StoreProvider } from '@/providers/StoreProvider'
import { DashboardLayout } from './DashboardLayout'
import { EngineModeBanner } from '@/components/system/EngineModeBanner'

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
 * Used by:
 *   src/app/(dashboard)/layout.tsx
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <StoreProvider>
      {/* Above the layout, not inside it: data provenance outranks navigation
          chrome, and it must be visible on every route without exception. */}
      <EngineModeBanner />
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </StoreProvider>
  )
}
