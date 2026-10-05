'use client'

// Engine data hooks returning ServiceState<T> for all four UI states. In mock
// mode the peek* snapshot seeds the first render; in live mode the hook goes
// loading → success | empty | error. Only ApplicationStateLoader passes
// refreshMs (owns polling); every other consumer reads store slices, so there's
// one fetch per endpoint. The initial fetch is jittered to spread the ~35-hook
// mount burst.

import { useEffect, useMemo, useState, type DependencyList } from 'react'
import { services } from '@/lib/services'
import {
  ok, toServiceState, loadingState, errorState, staleState, toServiceError, isCanceledError,
  type ServiceState, type ServiceError, type ApiResult,
} from '@/lib/services/response'
import { toBtcPriceChart, type BtcPriceChartViewModel } from '@/lib/mappers/priceHistory'
import { toCommandCenter, type CommandCenterVM }        from '@/lib/mappers/overview'
import { useApplicationStore } from '@/store/applicationStore'

/**
 * Page sizes for the polled list endpoints.
 *
 * These previously sent no `limit` at all, so every poll pulled the server's
 * default page — unbounded as the engine accumulates history. Each value is
 * sized to what the corresponding UI actually renders (tables cap their rows,
 * charts plot a window), not to the backend maximum. Raising one here is safe;
 * these are all well inside the documented ranges.
 */
const POLL_LIMITS = {
  events:           200,  // max the endpoint allows; the log is the one view that wants depth
  edges:            50,   // edge lists are consumed as "current opportunities", not history
  positionsHistory: 100,  // Settled Positions renders 30, Portfolio reads aggregates
  consensusHistory: 200,  // drives the consensus trend chart
  portfolioHistory: 500,  // three charts plot this; ~500 snapshots ≈ a full session
  // Capital Ledger renders 25. NOTE: the engine computes the ledger `summary`
  // over THIS page (the first `limit` records), not the session — no limit
  // makes it whole. Session totals come from /api/paper-stats. (Remediation
  // spec §9; fixed engine-side on the local remediation branch, not deployed.)
  tradesLedger:     200,
} as const

function useServiceQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<ApiResult<T>>,
  seed:    () => T | null,
  deps:    DependencyList,
  /** When set, refetches every N ms. Poll refreshes update in place (no loading
   *  flash) and pause while the tab is hidden. Overlapping requests are skipped. */
  refreshMs?: number,
  /** Stops the poll for good when a failure matches — for a resource the
   *  engine has said does not exist (a rotated-out market answering 404),
   *  where asking again every few seconds can only produce the same answer
   *  and costs a backend worker each time. The state keeps the error. */
  stopPollingOn?: (error: ServiceError) => boolean,
): ServiceState<T> {
  const [state, setState] = useState<ServiceState<T>>(() => {
    const s = seed()
    return s !== null ? toServiceState(ok(s)) : loadingState<T>()
  })

  useEffect(() => {
    let active   = true
    let inFlight = false
    // One AbortController per in-flight read.
    //
    // The `active` flag alone only stopped a stale RESULT from being applied —
    // the request itself ran to completion, holding a browser connection and a
    // backend worker for up to the full 15s timeout after the component had
    // stopped caring. That is not a cosmetic difference here: the engine has
    // demonstrably wedged when its worker pool fills (see lib/api/circuitBreaker),
    // so a cockpit that walks away from requests without cancelling them is
    // contributing to the failure it is trying to report. Aborting releases both.
    let controller: AbortController | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null

    const run = () => {
      if (inFlight) return
      inFlight = true
      controller = new AbortController()
      fetcher(controller.signal)
        .then((r) => { if (active) setState(toServiceState(r)) })
        .catch((e) => {
          // A read WE aborted is not a failure to report. Without this guard the
          // teardown below would flash an error state on every unmount, route
          // change and dependency change.
          if (!active || isCanceledError(e)) return
          // Keep last-good data on a poll-refresh failure (avoids the Markets
          // flicker) — but MARK it, which the previous `return prev` did not.
          // Returning the state unchanged meant a cockpit whose backend had
          // stopped answering looked exactly like one whose backend was
          // healthy: same numbers, no indication they had stopped moving.
          // staleState() keeps the reading and its timestamp and records the
          // fault beside it; errorState() still applies before any data has
          // arrived, where there is nothing to preserve.
          const err = toServiceError(e)
          if (intervalId !== null && stopPollingOn?.(err)) { clearInterval(intervalId); intervalId = null }
          setState((prev) => (prev.status === 'success' || prev.status === 'empty')
            ? staleState(prev, err)
            : errorState<T>(err))
        })
        .finally(() => { inFlight = false })
    }

    const s = seed()
    setState(s !== null ? toServiceState(ok(s)) : loadingState<T>())
    // Jitter the first fetch to spread the mount-time burst across ~1.5s.
    const initialTimer = setTimeout(run, Math.random() * 1_500)

    if (refreshMs === undefined) {
      return () => { active = false; controller?.abort(); clearTimeout(initialTimer) }
    }

    intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      run()
    }, refreshMs)
    return () => { active = false; controller?.abort(); clearTimeout(initialTimer); if (intervalId !== null) clearInterval(intervalId) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshMs])

  return state
}

// ─── Engine endpoint hooks ──────────────────────────────────────────────────────
// LiveEngineService has no peek* methods — live mode starts 'loading' then
// resolves. MockEngineService returns peek* data synchronously so mock mode
// renders without a loading flash.

export function useEngineHealth(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getHealth(signal), () => services.engine.peekHealth?.() ?? null, [], refreshMs)
}

export function useEngineStats(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getStats(signal), () => services.engine.peekStats?.() ?? null, [], refreshMs)
}

export function useEngineRuntime(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getRuntime(signal), () => services.engine.peekRuntime?.() ?? null, [], refreshMs)
}

export function useEngineConfig(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getConfig(signal), () => services.engine.peekConfig?.() ?? null, [], refreshMs)
}

export function useEngineSurvival(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getSurvival(signal), () => services.engine.peekSurvival?.() ?? null, [], refreshMs)
}

export function useEnginePriceHistory(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getPriceHistory(signal), () => services.engine.peekPriceHistory?.() ?? null, [], refreshMs)
}

export function useEngineMarkets(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getMarkets(signal), () => services.engine.peekMarkets?.() ?? null, [], refreshMs)
}

export function useEnginePositions(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getPositions(signal), () => services.engine.peekPositions?.() ?? null, [], refreshMs)
}

export function useEngineEvents(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getEvents(POLL_LIMITS.events, undefined, signal), () => services.engine.peekEvents?.() ?? null, [], refreshMs)
}

export function useEngineEdges(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getEdges(POLL_LIMITS.edges, signal), () => services.engine.peekEdges?.() ?? null, [], refreshMs)
}

/** Engine identity from the API root (`/`) — bot name, version, mode. Static per process. */
export function useEngineIdentity(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getIdentity(signal), () => services.engine.peekIdentity?.() ?? null, [], refreshMs)
}

/** /api/execution/status — the SOURCE OF TRADING TRUTH (spec §6.2). */
export function useEngineExecutionStatus(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getExecutionStatus(signal), () => services.engine.peekExecutionStatus?.() ?? null, [], refreshMs)
}

/** /api/execution/policy — read-only order-flow policy, risk limits, order template. */
export function useEngineExecutionPolicy(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getExecutionPolicy(signal), () => services.engine.peekExecutionPolicy?.() ?? null, [], refreshMs)
}

/** /api/paper-stats — paper-trading session performance. */
export function useEnginePaperStats(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getPaperStats(signal), () => services.engine.peekPaperStats?.() ?? null, [], refreshMs)
}

// ─── Additional engine endpoint hooks ────────────────────────────────────────

/** /api/positions/history — historical closed positions (envelope only; items empty so far). */
export function useEnginePositionsHistory(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getPositionsHistory(POLL_LIMITS.positionsHistory, undefined, signal), () => services.engine.peekPositionsHistory?.() ?? null, [], refreshMs)
}

/** /api/survival/patterns — detailed pattern analysis from the survival brain. */
export function useEngineSurvivalPatterns(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getSurvivalPatterns(signal), () => services.engine.peekSurvivalPatterns?.() ?? null, [], refreshMs)
}

/** /api/consensus — global platform-wide consensus score. */
export function useEngineConsensus(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getConsensus(signal), () => services.engine.peekConsensus?.() ?? null, [], refreshMs)
}

/** /api/consensus/bias — YES/NO bias split and confidence distribution. */
export function useEngineConsensusBias(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getConsensusBias(signal), () => services.engine.peekConsensusBias?.() ?? null, [], refreshMs)
}

/** /api/consensus/history — consensus score trajectory over the session. */
export function useEngineConsensusHistory(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getConsensusHistory(POLL_LIMITS.consensusHistory, signal), () => services.engine.peekConsensusHistory?.() ?? null, [], refreshMs)
}

/** /api/research/reports — generated market analysis and insights. */
export function useEngineResearchReports(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getResearchReports(signal), () => services.engine.peekResearchReports?.() ?? null, [], refreshMs)
}

/** /api/balance — quick capital balance check. */
export function useEngineBalance(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getBalance(signal), () => services.engine.peekBalance?.() ?? null, [], refreshMs)
}

/**
 * /api/portfolio — the persisted capital snapshot: balance, realized and
 * unrealized P&L, the cumulative trade record, and survival state.
 *
 * This is the truthful accounting source. /api/execution/status reports the
 * same concepts but scoped to the current engine PROCESS, so it reads zero
 * after a restart while real money has moved. Surfaces that answer "what is
 * this account worth" must read this one.
 */
export function useEnginePortfolio(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getPortfolio(signal), () => services.engine.peekPortfolio?.() ?? null, [], refreshMs)
}

/** /api/portfolio/history — portfolio value history for charting. */
export function useEnginePortfolioHistory(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getPortfolioHistory(POLL_LIMITS.portfolioHistory, signal), () => services.engine.peekPortfolioHistory?.() ?? null, [], refreshMs)
}

/** /api/portfolio/summary — portfolio summary statistics. */
export function useEnginePortfolioSummary(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getPortfolioSummary(signal), () => services.engine.peekPortfolioSummary?.() ?? null, [], refreshMs)
}

/** /api/analytics/signals — signal effectiveness metrics. */
export function useEngineAnalyticsSignals(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getAnalyticsSignals(signal), () => services.engine.peekAnalyticsSignals?.() ?? null, [], refreshMs)
}

/** /api/analytics/summary — overall analytics summary. */
export function useEngineAnalyticsSummary(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getAnalyticsSummary(signal), () => services.engine.peekAnalyticsSummary?.() ?? null, [], refreshMs)
}

/** /api/analytics/top-segments — top-performing segments by metric. */
export function useEngineAnalyticsTopSegments(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getAnalyticsTopSegments(undefined, undefined, undefined, signal), () => services.engine.peekAnalyticsTopSegments?.() ?? null, [], refreshMs)
}

/** /api/analytics/hourly — hourly performance breakdown (0–23). */
export function useEngineAnalyticsHourly(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getAnalyticsHourly(signal), () => services.engine.peekAnalyticsHourly?.() ?? null, [], refreshMs)
}

/** /api/paper/status — current paper trading enable/pending/completed status. */
export function useEnginePaperStatus(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getPaperStatus(signal), () => services.engine.peekPaperStatus?.() ?? null, [], refreshMs)
}

/** /api/system/metrics — process-level uptime/memory/CPU diagnostics. */
export function useEngineSystemMetrics(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getSystemMetrics(signal), () => services.engine.peekSystemMetrics?.() ?? null, [], refreshMs)
}

/** /api/trades/ledger — settled trade ledger with aggregate summary. */
export function useEngineTradesLedger(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getTradesLedger(POLL_LIMITS.tradesLedger, undefined, signal), () => services.engine.peekTradesLedger?.() ?? null, [], refreshMs)
}

/** /api/execution/orders — all orders (active + closed) envelope. */
export function useEngineExecutionOrders(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getExecutionOrders(undefined, signal), () => services.engine.peekExecutionOrders?.() ?? null, [], refreshMs)
}

// ─── Quant surface (2026-08-20) ───────────────────────────────────────────────
// The five mathematical layers and the multi-asset performance endpoints.
//
// Only four of the nine routes are polled (see ApplicationStateLoader):
// `/math-layers/status` is a composite that already contains kalman, kelly,
// bayesian, brier and shapley, so polling the five per-layer routes as well
// would be five redundant requests for data the store already holds. The
// per-layer hooks below exist for a page that wants exactly one layer and
// should not pay for the ~3.9KB composite — they are opt-in, not polled.

/** /api/math-layers/status — all five layers in one composite payload. */
export function useMathLayersStatus(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getMathLayersStatus(signal), () => services.engine.peekMathLayersStatus?.() ?? null, [], refreshMs)
}

/** /api/math-layers/recommendations — the five-layer verdict (e.g. "SKIP"). */
export function useMathRecommendations(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getMathRecommendations(signal), () => services.engine.peekMathRecommendations?.() ?? null, [], refreshMs)
}

/** /api/performance/by-category — six market categories. */
export function usePerformanceByCategory(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getPerformanceByCategory(signal), () => services.engine.peekPerformanceByCategory?.() ?? null, [], refreshMs)
}

/** /api/performance/by-asset — per-symbol buckets; empty until an asset trades. */
export function usePerformanceByAsset(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getPerformanceByAsset(signal), () => services.engine.peekPerformanceByAsset?.() ?? null, [], refreshMs)
}

// ── Opt-in, non-polled per-layer hooks ───────────────────────────────────────

/** /api/math-layers/kalman — the filter bank on its own. */
export function useMathKalman(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getMathKalman(signal), () => services.engine.peekMathKalman?.() ?? null, [], refreshMs)
}

/** /api/performance/kalman-multi-asset — same states plus `activeFilters`. */
export function useKalmanMultiAsset(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getKalmanMultiAsset(signal), () => services.engine.peekKalmanMultiAsset?.() ?? null, [], refreshMs)
}

/** /api/math-layers/bayesian — regime posteriors on their own. */
export function useMathBayesian(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getMathBayesian(signal), () => services.engine.peekMathBayesian?.() ?? null, [], refreshMs)
}

/** /api/math-layers/brier — calibration scoring on its own. */
export function useMathBrier(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getMathBrier(signal), () => services.engine.peekMathBrier?.() ?? null, [], refreshMs)
}

/** /api/math-layers/shapley — signal attribution on its own. */
export function useMathShapley(refreshMs?: number) {
  return useServiceQuery((signal) => services.engine.getMathShapley(signal), () => services.engine.peekMathShapley?.() ?? null, [], refreshMs)
}

// ─── Per-route hooks (parameterised — NOT in the global polling loader) ───────

/**
 * GET /api/markets/:market_id — the market plus its own history, in one call.
 *
 * Not in ApplicationStateLoader on purpose: it is keyed by a route parameter,
 * so there is no single value for the loader to poll. It refetches when
 * `marketId` changes and aborts the previous read, which useServiceQuery
 * already does via the dependency array.
 *
 * Default cadence matches MARKET_POLL_MS in the loader (8s) — the same market
 * cadence the rest of the markets surface uses, so a detail page open beside
 * the markets list does not poll faster than the list feeding it.
 */
export function useMarketDetail(marketId: string, refreshMs = 8_000) {
  return useServiceQuery(
    (signal) => services.engine.getMarketDetail(marketId, signal),
    () => null,
    [marketId],
    refreshMs,
    // A 404 here is the engine saying the window has rotated out. It will not
    // rotate back in; polling it every 8s produced a steady stream of 404s on
    // every expired market page (measured 2026-09-16).
    (err) => err.code === 'NOT_FOUND',
  )
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
  // Added for mode-aware performance provenance: in paper mode the execution
  // surface is not the performance surface. See lib/display/performanceSource.
  const paperStats = useApplicationStore((s) => s.engine.paperStats)
  // Position ledger — authoritative for open positions (see exposureSource).
  const positions  = useApplicationStore((s) => s.engine.positions)
  return useMemo(
    () => toCommandCenter({ stats, identity, survival, execution, edges, health, paperStats, positions }),
    [stats, identity, survival, execution, edges, health, paperStats, positions],
  )
}

/**
 * Maps /api/price-history from ApplicationStore into a chart-ready ViewModel:
 * current price, OHLC-style range, change delta, and typed point array.
 */
export function useEnginePriceChart(): ServiceState<BtcPriceChartViewModel> {
  const priceSlice = useApplicationStore((s) => s.engine.priceHistory)
  return useMemo<ServiceState<BtcPriceChartViewModel>>(() => {
    // Freshness belongs to the READING, not to the shape it is projected into,
    // so every branch carries the source slice's freshness through unchanged. A
    // derived view model that dropped it would silently launder stale data back
    // into looking current — the exact failure this model removes.
    const freshness = {
      lastUpdatedAt: priceSlice.lastUpdatedAt,
      isStale:       priceSlice.isStale,
      lastError:     priceSlice.lastError,
    }
    if (priceSlice.status !== 'success') return { status: priceSlice.status, data: null, error: priceSlice.error, ...freshness }
    if (!priceSlice.data)               return { status: 'empty', data: null, error: null, ...freshness }
    return { status: 'success', data: toBtcPriceChart(priceSlice.data), error: null, ...freshness }
  }, [priceSlice])
}
