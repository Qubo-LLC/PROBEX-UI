'use client'

// Binds the pure system-state derivation (lib/display/systemStatus) to the
// runtime config and the application store.
//
// Reads store slices directly rather than going through useCommandCenter: the
// status indicator lives in the persistent top nav on every route, and it must
// not drag the Overview's whole view-model mapper into every page's render
// path. Zero extra HTTP — everything here is already polled once by
// ApplicationStateLoader.

import { useMemo } from 'react'
import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider'
import { useApplicationStore } from '@/store/applicationStore'
import { circuitSnapshot } from '@/lib/api/circuitBreaker'
import { deriveSystemStatus, type SystemStatus } from '@/lib/display/systemStatus'

export function useSystemStatus(): SystemStatus {
  const runtime = useRuntimeConfig()

  const health = useApplicationStore((s) => s.engine.health)
  const stats = useApplicationStore((s) => s.engine.stats)
  const identity = useApplicationStore((s) => s.engine.identity)
  const survival = useApplicationStore((s) => s.engine.survival)
  // Not a data slice — a clock. Every store write bumps it, so subscribing here
  // is what makes the circuit-breaker read below refresh on the polling cadence
  // instead of freezing at whatever it was on mount.
  const lastRefreshed = useApplicationStore((s) => s.lastRefreshed)

  const healthStatus = health.data?.status ?? null
  const engineMode = identity.data?.mode ?? null
  const unhealthyProbes = health.data?.components.filter((c) => !c.healthy).length ?? 0

  // "Unreachable" needs corroboration. A single failing endpoint is a failing
  // endpoint; the engine is only unreachable when nothing at all is answering.
  // /api/stats erroring alone used to raise the alarm, and it has a history of
  // failing while its siblings keep working.
  const isUnreachable =
    stats.status === 'error' &&
    survival.status === 'error' &&
    identity.status === 'error' &&
    health.status === 'error'

  const isLoading =
    stats.status === 'loading' &&
    identity.status === 'loading' &&
    health.status === 'loading'

  // Endpoints the client has paused because they stalled. Read here rather than
  // derived from the store slices: useServiceQuery deliberately keeps last-good
  // data when a poll fails, so a slice for a wedged endpoint still reports
  // 'success'. The breaker is the only place that knows a route stopped
  // answering. Recomputed whenever `lastRefreshed` moves; on the server and on
  // first paint the map is empty, so SSR and hydration agree.
  const stalledEndpoints = useMemo(
    () => circuitSnapshot().filter((c) => c.open).length,
    [lastRefreshed],
  )

  return useMemo(
    () =>
      deriveSystemStatus({
        runtime,
        healthStatus,
        engineMode,
        isLoading,
        isUnreachable,
        unhealthyProbes,
        stalledEndpoints,
      }),
    [runtime, healthStatus, engineMode, isLoading, isUnreachable, unhealthyProbes, stalledEndpoints],
  )
}
