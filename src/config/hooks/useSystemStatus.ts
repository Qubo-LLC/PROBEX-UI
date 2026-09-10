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
  // The whole endpoint map — used both as the staleness source below and as the
  // clock that keeps the circuit-breaker read current.
  //
  // `lastRefreshed` used to serve as that clock, and cannot any more: it now
  // advances only on a SUCCESSFUL refresh (see applicationStore), so during an
  // outage it deliberately freezes — which is exactly when the breaker snapshot
  // most needs to keep updating. `engine` changes on every store write, outage
  // included, so it provides the same cadence the clock used to.
  const engine = useApplicationStore((s) => s.engine)

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
    [engine],
  )

  // Slices showing retained data because their last refresh failed.
  //
  // 2026-09-07: this is the signal the comment above says the store could not
  // provide. It can now — ServiceState carries `isStale` — and it covers a case
  // the breaker structurally cannot: the breaker only counts failures that cost
  // the backend a worker (no response at all), so an endpoint answering 500
  // promptly never trips it while its data goes just as stale.
  //
  // Counted across the whole store rather than a chosen subset: any endpoint
  // that stops refreshing is worth one line in the top-nav chip, and hand-picking
  // which ones "matter" is how a silent failure gets built in.
  const staleEndpoints = useMemo(
    () => Object.values(engine).filter((slice) => slice.isStale).length,
    [engine],
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
        staleEndpoints,
      }),
    [runtime, healthStatus, engineMode, isLoading, isUnreachable, unhealthyProbes, stalledEndpoints, staleEndpoints],
  )
}
