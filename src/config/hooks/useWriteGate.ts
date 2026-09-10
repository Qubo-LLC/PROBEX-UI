'use client'

// Binds the pure write-gate derivation (lib/display/writeGate) to the runtime
// config and the application store.
//
// Zero extra HTTP: identity and execution policy are already polled once by
// ApplicationStateLoader, so this reads the same slices the rest of the cockpit
// reads. Kept beside useSystemStatus, which follows the identical shape.

import { useMemo } from 'react'
import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider'
import { useApplicationStore } from '@/store/applicationStore'
import { deriveWriteGate, type WriteGate } from '@/lib/display/writeGate'

export function useWriteGate(): WriteGate {
  const runtime = useRuntimeConfig()

  const identity = useApplicationStore((s) => s.engine.identity)
  const policy = useApplicationStore((s) => s.engine.executionPolicy)

  const engineMode = identity.data?.mode ?? null
  // Read only from a slice that actually SUCCEEDED. `policy.data` can hold
  // last-good data while the slice is in an error state (useServiceQuery keeps
  // it on purpose to avoid flicker), and a stale "live trading is off" is
  // exactly the reading that must not unlock an order button.
  const liveTradingEnabled =
    policy.status === 'success' ? policy.data?.liveTradingEnabled ?? null : null

  return useMemo(
    () => deriveWriteGate({ runtimeMode: runtime.mode, engineMode, liveTradingEnabled }),
    [runtime.mode, engineMode, liveTradingEnabled],
  )
}
