'use client'

/**
 * AppProviders
 *
 * Provider composition root.
 *
 * RealtimeProvider (the simulated WebSocket stream) was unmounted in M4 —
 * live data flows through ApplicationStateLoader polling instead
 * (PROBEX_PRODUCT_SPEC.md §5). The mock stream files are deleted in M5;
 * a real WebSocket client returns at this mount point with P1-04.
 */

import type { ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { StoreProvider } from './StoreProvider'
import { TooltipProvider } from '@/components/ui/Tooltip'

interface AppProvidersProps {
  children:      ReactNode
  initialTheme?: string
}

export function AppProviders({ children, initialTheme }: AppProvidersProps) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <StoreProvider>
        <TooltipProvider delayDuration={250} skipDelayDuration={300}>
          {children}
        </TooltipProvider>
      </StoreProvider>
    </ThemeProvider>
  )
}

// Named exports
export { ThemeProvider }   from './ThemeProvider'
export { StoreProvider }   from './StoreProvider'
