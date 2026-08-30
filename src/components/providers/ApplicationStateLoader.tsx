'use client'

// ApplicationStateLoader — renders null, mounts once in DashboardLayout. The
// ONLY place that calls raw useEngine* hooks with polling; it syncs each
// ServiceState<T> into ApplicationStore so components read data without their
// own fetches. Three tiers (FAST/MEDIUM/SLOW) by each endpoint's change
// cadence; polling pauses while the tab is hidden (useServiceQuery).
//
// NOT polled here, deliberately (2026-07-26 hardening) — do not re-add:
//   • portfolio            — backend 500s; the poll only ever errored. The four
//                            sub-routes (balance/summary/history/performance)
//                            cover the same data.
//   • portfolioPerformance — PerformanceWindow fetches it directly with a
//                            user-selectable lookback; a fixed 24h poll here was
//                            a duplicate request no component read.
//   • executionTrades      — Settled Positions was repointed to positions/history;
//                            no consumer remained.
//   • analyticsSegments    — superseded by survival/patterns; no consumer.
// The service methods for these still exist (API surface preserved).

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
  useEngineExecutionPolicy,
  useEnginePaperStats,
  useEnginePositionsHistory,
  useEngineSurvivalPatterns,
  useEngineConsensus,
  useEngineConsensusBias,
  useEngineConsensusHistory,
  useEngineResearchReports,
  useEngineBalance,
  useEnginePortfolioHistory,
  useEnginePortfolioSummary,
  useEngineAnalyticsSignals,
  useEngineAnalyticsSummary,
  useEngineAnalyticsTopSegments,
  useEngineAnalyticsHourly,
  useEnginePaperStatus,
  useEngineSystemMetrics,
  useEngineTradesLedger,
  useEngineExecutionOrders,
  useMathLayersStatus,
  useMathRecommendations,
  usePerformanceByCategory,
  usePerformanceByAsset,
} from '@/config/hooks/useServices'

const FAST_MS   =  2_000  // live price + cockpit vitals
const MEDIUM_MS =  5_000  // operational state; matches 5-min market cadence
const SLOW_MS   = 30_000  // /health takes ~5s server-side; config rarely changes
// markets + edges read through the backend's saturated `market_fetch` limiter
// (~96% wait); polling slower than MEDIUM avoids catching it mid-throttle
// (the Markets "tap out, tap in" flicker).
const MARKET_POLL_MS = 8_000
// Quant surface: heaviest reads in the product, slowest-changing data. Kept
// well clear of the other tiers so the mathematical layers never compete with
// the price feed for the backend's very limited concurrency (2026-08-20: the
// engine wedged entirely under ~50 sequential reads — see the circuit breaker
// in lib/api/client.ts).
const QUANT_MS = 60_000

export function ApplicationStateLoader() {
  const updateEngine = useApplicationStore((s) => s.updateEngine)

  // All hooks must be called unconditionally (React rules of hooks).
  const stats           = useEngineStats(FAST_MS)
  const priceHistory    = useEnginePriceHistory(FAST_MS)
  const survival        = useEngineSurvival(MEDIUM_MS)
  const markets         = useEngineMarkets(MARKET_POLL_MS)
  const positions       = useEnginePositions(MEDIUM_MS)
  const events          = useEngineEvents(MEDIUM_MS)
  const edges           = useEngineEdges(MARKET_POLL_MS)
  const executionStatus = useEngineExecutionStatus(MEDIUM_MS)
  const paperStats      = useEnginePaperStats(MEDIUM_MS)
  const runtime         = useEngineRuntime(SLOW_MS)
  const health          = useEngineHealth(SLOW_MS)
  const config          = useEngineConfig(SLOW_MS)
  const executionPolicy = useEngineExecutionPolicy(SLOW_MS)  // read-only, rarely changes
  const identity        = useEngineIdentity()   // static per process — fetch once

  // MEDIUM tier: live/cycle-driven
  const consensus            = useEngineConsensus(MEDIUM_MS)
  const consensusBias        = useEngineConsensusBias(MEDIUM_MS)
  const balance              = useEngineBalance(MEDIUM_MS)
  const executionOrders      = useEngineExecutionOrders(MEDIUM_MS)
  const paperStatus          = useEnginePaperStatus(MEDIUM_MS)
  const tradesLedger         = useEngineTradesLedger(MEDIUM_MS)

  // SLOW tier: historical / aggregate
  const positionsHistory     = useEnginePositionsHistory(SLOW_MS)
  const survivalPatterns     = useEngineSurvivalPatterns(SLOW_MS)
  const consensusHistory     = useEngineConsensusHistory(SLOW_MS)
  const researchReports      = useEngineResearchReports(SLOW_MS)
  const portfolioHistory     = useEnginePortfolioHistory(SLOW_MS)
  const portfolioSummary     = useEnginePortfolioSummary(SLOW_MS)
  const analyticsSignals     = useEngineAnalyticsSignals(SLOW_MS)
  const analyticsSummary     = useEngineAnalyticsSummary(SLOW_MS)
  const analyticsTopSegments = useEngineAnalyticsTopSegments(SLOW_MS)
  const analyticsHourly      = useEngineAnalyticsHourly(SLOW_MS)
  const systemMetrics        = useEngineSystemMetrics(SLOW_MS)

  // QUANT tier: the five mathematical layers and multi-asset performance.
  // Polled slower than everything else on purpose — /math-layers/status is the
  // heaviest read in the product (~3.9KB, ~2.5s server-side) and all four of
  // these only change when the engine trades, which is a cadence measured in
  // minutes at best. Four polls, not nine: `status` already carries every
  // layer, so the per-layer routes stay opt-in and unpolled.
  const mathLayersStatus      = useMathLayersStatus(QUANT_MS)
  const mathRecommendations   = useMathRecommendations(QUANT_MS)
  const performanceByCategory = usePerformanceByCategory(QUANT_MS)
  const performanceByAsset    = usePerformanceByAsset(QUANT_MS)

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
  useEffect(() => { updateEngine({ executionPolicy }) }, [executionPolicy, updateEngine])
  useEffect(() => { updateEngine({ paperStats }) },      [paperStats,      updateEngine])

  useEffect(() => { updateEngine({ consensus }) },            [consensus,            updateEngine])
  useEffect(() => { updateEngine({ consensusBias }) },        [consensusBias,        updateEngine])
  useEffect(() => { updateEngine({ balance }) },              [balance,              updateEngine])
  useEffect(() => { updateEngine({ executionOrders }) },      [executionOrders,      updateEngine])
  useEffect(() => { updateEngine({ paperStatus }) },          [paperStatus,          updateEngine])
  useEffect(() => { updateEngine({ tradesLedger }) },         [tradesLedger,         updateEngine])
  useEffect(() => { updateEngine({ positionsHistory }) },     [positionsHistory,     updateEngine])
  useEffect(() => { updateEngine({ survivalPatterns }) },     [survivalPatterns,     updateEngine])
  useEffect(() => { updateEngine({ consensusHistory }) },     [consensusHistory,     updateEngine])
  useEffect(() => { updateEngine({ researchReports }) },      [researchReports,      updateEngine])
  useEffect(() => { updateEngine({ portfolioHistory }) },     [portfolioHistory,     updateEngine])
  useEffect(() => { updateEngine({ portfolioSummary }) },     [portfolioSummary,     updateEngine])
  useEffect(() => { updateEngine({ analyticsSignals }) },     [analyticsSignals,     updateEngine])
  useEffect(() => { updateEngine({ analyticsSummary }) },     [analyticsSummary,     updateEngine])
  useEffect(() => { updateEngine({ analyticsTopSegments }) }, [analyticsTopSegments, updateEngine])
  useEffect(() => { updateEngine({ analyticsHourly }) },      [analyticsHourly,      updateEngine])
  useEffect(() => { updateEngine({ systemMetrics }) },        [systemMetrics,        updateEngine])
  useEffect(() => { updateEngine({ mathLayersStatus }) },     [mathLayersStatus,     updateEngine])
  useEffect(() => { updateEngine({ mathRecommendations }) },  [mathRecommendations,  updateEngine])
  useEffect(() => { updateEngine({ performanceByCategory }) },[performanceByCategory, updateEngine])
  useEffect(() => { updateEngine({ performanceByAsset }) },   [performanceByAsset,   updateEngine])

  return null
}
