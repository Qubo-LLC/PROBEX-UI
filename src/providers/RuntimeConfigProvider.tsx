'use client'

// Makes the server-resolved runtime config available to the client tree.
//
// Why a provider instead of calling readRuntimeConfig() in the component:
// during SSR there is no `window`, so that reader falls back to an env-only
// guess. Anything rendering conditionally on the mode would then disagree
// between server and client markup and trip a hydration mismatch. Threading the
// resolved value down from the root layout means both passes read the identical
// object.

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { type RuntimeConfig, readRuntimeConfig } from '@/config/runtime'

const RuntimeConfigContext = createContext<RuntimeConfig | null>(null)

interface RuntimeConfigProviderProps {
  value:    RuntimeConfig
  children: ReactNode
}

export function RuntimeConfigProvider({ value, children }: RuntimeConfigProviderProps) {
  return (
    <RuntimeConfigContext.Provider value={value}>
      {children}
    </RuntimeConfigContext.Provider>
  )
}

/**
 * The active runtime config. Falls back to the reader only when used outside
 * the provider, so isolated/tested components still get a sane value.
 */
export function useRuntimeConfig(): RuntimeConfig {
  return useContext(RuntimeConfigContext) ?? readRuntimeConfig()
}
