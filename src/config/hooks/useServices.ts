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
        .catch((e) => {
          if (!active) return
          // Keep last-good data on a poll-refresh failure (avoids the Markets
          // flicker); only surface an error before any data has arrived. The
          // failure still shows in the System diagnostics panel regardless.
          setState((prev) => (prev.status === 'success' || prev.status === 'empty') ? prev : errorState<T>(toServiceError(e)))
        })
        .finally(() => { inFlight = false })
    }

    const s = seed()
    setState(s !== null ? toServiceState(ok(s)) : loadingState<T>())
    // Jitter the first fetch to spread the mount-time burst across ~1.5s.
    const initialTimer = setTimeout(run, Math.random() * 1_500)

    if (refreshMs === undefined) return () => { active = false; clearTimeout(initialTimer) }

    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      run()
    }, refreshMs)
    return () => { active = false; clearTimeout(initialTimer); clearInterval(id) }
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

/** /api/execution/policy — read-only order-flow policy, risk limits, order template. */
export function useEngineExecutionPolicy(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getExecutionPolicy(), () => services.engine.peekExecutionPolicy?.() ?? null, [], refreshMs)
}

/** /api/execution/trades — active + closed trade lists (item schema TBD). */
export function useEngineExecutionTrades(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getExecutionTrades(), () => services.engine.peekExecutionTrades?.() ?? null, [], refreshMs)
}

/** /api/paper-stats — paper-trading session performance. */
export function useEnginePaperStats(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getPaperStats(), () => services.engine.peekPaperStats?.() ?? null, [], refreshMs)
}

// ─── Additional engine endpoint hooks ────────────────────────────────────────

/** /api/positions/history — historical closed positions (envelope only; items empty so far). */
export function useEnginePositionsHistory(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getPositionsHistory(), () => services.engine.peekPositionsHistory?.() ?? null, [], refreshMs)
}

/** /api/survival/patterns — detailed pattern analysis from the survival brain. */
export function useEngineSurvivalPatterns(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getSurvivalPatterns(), () => services.engine.peekSurvivalPatterns?.() ?? null, [], refreshMs)
}

/** /api/consensus — global platform-wide consensus score. */
export function useEngineConsensus(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getConsensus(), () => services.engine.peekConsensus?.() ?? null, [], refreshMs)
}

/** /api/consensus/bias — YES/NO bias split and confidence distribution. */
export function useEngineConsensusBias(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getConsensusBias(), () => services.engine.peekConsensusBias?.() ?? null, [], refreshMs)
}

/** /api/consensus/history — consensus score trajectory over the session. */
export function useEngineConsensusHistory(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getConsensusHistory(), () => services.engine.peekConsensusHistory?.() ?? null, [], refreshMs)
}

/** /api/research/reports — generated market analysis and insights. */
export function useEngineResearchReports(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getResearchReports(), () => services.engine.peekResearchReports?.() ?? null, [], refreshMs)
}

/** /api/portfolio — full live portfolio snapshot. */
export function useEnginePortfolio(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getPortfolio(), () => services.engine.peekPortfolio?.() ?? null, [], refreshMs)
}

/** /api/balance — quick capital balance check. */
export function useEngineBalance(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getBalance(), () => services.engine.peekBalance?.() ?? null, [], refreshMs)
}

/** /api/portfolio/history — portfolio value history for charting. */
export function useEnginePortfolioHistory(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getPortfolioHistory(), () => services.engine.peekPortfolioHistory?.() ?? null, [], refreshMs)
}

/** /api/portfolio/summary — portfolio summary statistics. */
export function useEnginePortfolioSummary(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getPortfolioSummary(), () => services.engine.peekPortfolioSummary?.() ?? null, [], refreshMs)
}

/** /api/portfolio/performance — performance metrics over a 24h lookback. */
export function useEnginePortfolioPerformance(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getPortfolioPerformance(), () => services.engine.peekPortfolioPerformance?.() ?? null, [], refreshMs)
}

/** /api/analytics/segments — performance metrics by segment. */
export function useEngineAnalyticsSegments(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getAnalyticsSegments(), () => services.engine.peekAnalyticsSegments?.() ?? null, [], refreshMs)
}

/** /api/analytics/signals — signal effectiveness metrics. */
export function useEngineAnalyticsSignals(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getAnalyticsSignals(), () => services.engine.peekAnalyticsSignals?.() ?? null, [], refreshMs)
}

/** /api/analytics/summary — overall analytics summary. */
export function useEngineAnalyticsSummary(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getAnalyticsSummary(), () => services.engine.peekAnalyticsSummary?.() ?? null, [], refreshMs)
}

/** /api/analytics/top-segments — top-performing segments by metric. */
export function useEngineAnalyticsTopSegments(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getAnalyticsTopSegments(), () => services.engine.peekAnalyticsTopSegments?.() ?? null, [], refreshMs)
}

/** /api/analytics/hourly — hourly performance breakdown (0–23). */
export function useEngineAnalyticsHourly(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getAnalyticsHourly(), () => services.engine.peekAnalyticsHourly?.() ?? null, [], refreshMs)
}

/** /api/paper/status — current paper trading enable/pending/completed status. */
export function useEnginePaperStatus(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getPaperStatus(), () => services.engine.peekPaperStatus?.() ?? null, [], refreshMs)
}

/** /api/system/metrics — process-level uptime/memory/CPU diagnostics. */
export function useEngineSystemMetrics(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getSystemMetrics(), () => services.engine.peekSystemMetrics?.() ?? null, [], refreshMs)
}

/** /api/trades/ledger — settled trade ledger with aggregate summary. */
export function useEngineTradesLedger(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getTradesLedger(), () => services.engine.peekTradesLedger?.() ?? null, [], refreshMs)
}

/** /api/execution/orders — all orders (active + closed) envelope. */
export function useEngineExecutionOrders(refreshMs?: number) {
  return useServiceQuery(() => services.engine.getExecutionOrders(), () => services.engine.peekExecutionOrders?.() ?? null, [], refreshMs)
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
