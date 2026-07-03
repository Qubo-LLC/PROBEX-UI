'use client'

// ApplicationStateLoader — renders null, mounts once in DashboardLayout.
// Calls every engine service hook and syncs each resolved ServiceState<T>
// into the global ApplicationStore so that ALL other hooks and components
// can read engine data without issuing their own HTTP requests.
//
// This is the ONLY place in the application that calls raw useEngine* hooks
// with polling enabled. EngineChainProbe (diagnostics) is intentionally
// excluded — it issues independent one-shot requests to verify the chain.
//
// Polling tiers (PROBEX_PRODUCT_SPEC.md §5). The backend advertises a 500 ms
// dashboard interval; we poll conservatively to respect the engine's own
// rate limiters. Polling pauses while the tab is hidden (see useServiceQuery).

import { useEffect }           from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import {
  useEngineHealth,
  useEngineRuntime,
  useEngineStats,
  useEngineConfig,
  useEngineSurvival,
  useEnginePriceHistory,
  useEngineMarkets,
  useEnginePositions,
  useEngineEvents,
  useEngineEdges,
  useEngineIdentity,
  useEngineExecutionStatus,
} from '@/config/hooks/useServices'

const FAST_MS   =  2_000  // live price + cockpit vitals
const MEDIUM_MS =  5_000  // operational state; matches 5-min market cadence
const SLOW_MS   = 30_000  // /health takes ~5s server-side; config rarely changes

export function ApplicationStateLoader() {
  const updateEngine = useApplicationStore((s) => s.updateEngine)

  // All hooks must be called unconditionally (React rules of hooks).
  const stats           = useEngineStats(FAST_MS)
  const priceHistory    = useEnginePriceHistory(FAST_MS)
  const survival        = useEngineSurvival(MEDIUM_MS)
  const markets         = useEngineMarkets(MEDIUM_MS)
  const positions       = useEnginePositions(MEDIUM_MS)
  const events          = useEngineEvents(MEDIUM_MS)
  const edges           = useEngineEdges(MEDIUM_MS)
  const executionStatus = useEngineExecutionStatus(MEDIUM_MS)
  const runtime         = useEngineRuntime(SLOW_MS)
  const health          = useEngineHealth(SLOW_MS)
  const config          = useEngineConfig(SLOW_MS)
  const identity        = useEngineIdentity()   // static per process — fetch once

  // Each effect syncs one endpoint state into the store whenever it settles.
  useEffect(() => { updateEngine({ health }) },          [health,          updateEngine])
  useEffect(() => { updateEngine({ runtime }) },         [runtime,         updateEngine])
  useEffect(() => { updateEngine({ stats }) },           [stats,           updateEngine])
  useEffect(() => { updateEngine({ config }) },          [config,          updateEngine])
  useEffect(() => { updateEngine({ survival }) },        [survival,        updateEngine])
  useEffect(() => { updateEngine({ priceHistory }) },    [priceHistory,    updateEngine])
  useEffect(() => { updateEngine({ markets }) },         [markets,         updateEngine])
  useEffect(() => { updateEngine({ positions }) },       [positions,       updateEngine])
  useEffect(() => { updateEngine({ events }) },          [events,          updateEngine])
  useEffect(() => { updateEngine({ edges }) },           [edges,           updateEngine])
  useEffect(() => { updateEngine({ identity }) },        [identity,        updateEngine])
  useEffect(() => { updateEngine({ executionStatus }) }, [executionStatus, updateEngine])

  return null
}
