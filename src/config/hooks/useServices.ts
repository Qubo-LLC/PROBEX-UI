'use client'

// Engine data hooks. Each returns a ServiceState<T> ({ status, data, error })
// covering all four UI states. In mock mode the synchronous peek* snapshot seeds
// the first render (no loading flash); in live mode the same hook surfaces
// 'loading' → 'success' | 'empty' | 'error'.
//
// The raw useEngine* hooks accept an optional refreshMs for polling — only
// ApplicationStateLoader passes it, which owns the polling tiers (spec §5).
// Every other consumer reads the resulting slices from the ApplicationStore, so
// there is exactly one fetch per endpoint regardless of how many components mount.

import { useEffect, useMemo, useState, type DependencyList } from 'react'
import { services } from '@/lib/services'
import {
  ok, toServiceState, loadingState, errorState, toServiceError,
  type ServiceState, type ApiResult,
} from '@/lib/services/response'
import { toBtcPriceChart, type BtcPriceChartViewModel } from '@/lib/mappers/priceHistory'
import { toCommandCenter, type CommandCenterVM }        from '@/lib/mappers/overview'
import { useApplicationStore } from '@/store/applicationStore'

function useServiceQuery<T>(
  fetcher: () => Promise<ApiResult<T>>,
  seed:    () => T | null,
  deps:    DependencyList,
  /** When set, refetches every N ms. Poll refreshes update in place (no loading
   *  flash) and pause while the tab is hidden. Overlapping requests are skipped. */
  refreshMs?: number,
): ServiceState<T> {
  const [state, setState] = useState<ServiceState<T>>(() => {
    const s = seed()
    return s !== null ? toServiceState(ok(s)) : loadingState<T>()
  })

  useEffect(() => {
    let active   = true
    let inFlight = false

    const run = () => {
      if (inFlight) return
      inFlight = true
      fetcher()
        .then((r) => { if (active) setState(toServiceState(r)) })
        .catch((e) => { if (active) setState(errorState<T>(toServiceError(e))) })
        .finally(() => { inFlight = false })
    }

    const s = seed()
    setState(s !== null ? toServiceState(ok(s)) : loadingState<T>())
    run()

    if (refreshMs === undefined) return () => { active = false }

    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      run()
    }, refreshMs)
    return () => { active = false; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshMs])

  return state
}

// ─── Engine endpoint hooks ──────────────────────────────────────────────────────
// LiveEngineService has no peek* methods — live mode starts 'loading' then
// resolves. MockEngineService returns peek* data synchronously so mock mode
// renders without a loading flash.

export function useEngineHealth(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getHealth(), () => services.engine.peekHealth?.() ?? null, [], refreshMs)
}

export function useEngineStats(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getStats(), () => services.engine.peekStats?.() ?? null, [], refreshMs)
}

export function useEngineRuntime(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getRuntime(), () => services.engine.peekRuntime?.() ?? null, [], refreshMs)
}

export function useEngineConfig(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getConfig(), () => services.engine.peekConfig?.() ?? null, [], refreshMs)
}

export function useEngineSurvival(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getSurvival(), () => services.engine.peekSurvival?.() ?? null, [], refreshMs)
}

export function useEnginePriceHistory(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getPriceHistory(), () => services.engine.peekPriceHistory?.() ?? null, [], refreshMs)
}

export function useEngineMarkets(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getMarkets(), () => services.engine.peekMarkets?.() ?? null, [], refreshMs)
}

export function useEnginePositions(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getPositions(), () => services.engine.peekPositions?.() ?? null, [], refreshMs)
}

export function useEngineEvents(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getEvents(), () => services.engine.peekEvents?.() ?? null, [], refreshMs)
}

export function useEngineEdges(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getEdges(), () => services.engine.peekEdges?.() ?? null, [], refreshMs)
}

/** Engine identity from the API root (`/`) — bot name, version, mode. Static per process. */
export function useEngineIdentity(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getIdentity(), () => services.engine.peekIdentity?.() ?? null, [], refreshMs)
}

/** /api/execution/status — the SOURCE OF TRADING TRUTH (spec §6.2). */
export function useEngineExecutionStatus(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getExecutionStatus(), () => services.engine.peekExecutionStatus?.() ?? null, [], refreshMs)
}

// ─── Composite view-model hooks (read from ApplicationStore, zero extra HTTP) ───

/**
 * Command Center view model for the Overview page — composes stats, identity,
 * survival, execution status, edges, and health from ApplicationStore. Sections
 * are null until their endpoint resolves; the page hides them (truthful empty
 * states, never fake zeros).
 */
export function useCommandCenter(): CommandCenterVM {
  const stats     = useApplicationStore((s) => s.engine.stats)
  const identity  = useApplicationStore((s) => s.engine.identity)
  const survival  = useApplicationStore((s) => s.engine.survival)
  const execution = useApplicationStore((s) => s.engine.executionStatus)
  const edges     = useApplicationStore((s) => s.engine.edges)
  const health    = useApplicationStore((s) => s.engine.health)
  return useMemo(
    () => toCommandCenter({ stats, identity, survival, execution, edges, health }),
    [stats, identity, survival, execution, edges, health],
  )
}

/**
 * Maps /api/price-history from ApplicationStore into a chart-ready ViewModel:
 * current price, OHLC-style range, change delta, and typed point array.
 */
export function useEnginePriceChart(): ServiceState<BtcPriceChartViewModel> {
  const priceSlice = useApplicationStore((s) => s.engine.priceHistory)
  return useMemo<ServiceState<BtcPriceChartViewModel>>(() => {
    if (priceSlice.status !== 'success') return { status: priceSlice.status, data: null, error: priceSlice.error }
    if (!priceSlice.data)               return { status: 'empty', data: null, error: null }
    return { status: 'success', data: toBtcPriceChart(priceSlice.data), error: null }
  }, [priceSlice])
}
