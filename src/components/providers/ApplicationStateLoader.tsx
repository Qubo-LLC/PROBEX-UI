'use client'

// ApplicationStateLoader — renders null, mounts once in DashboardLayout. The
// ONLY place that calls raw useEngine* hooks with polling; it syncs each
// ServiceState<T> into ApplicationStore so components read data without their
// own fetches. Three tiers (FAST/MEDIUM/SLOW) by each endpoint's change
// cadence; polling pauses while the tab is hidden (useServiceQuery).

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
  useEngineExecutionTrades,
  useEnginePaperStats,
  useEnginePositionsHistory,
  useEngineSurvivalPatterns,
  useEngineConsensus,
  useEngineConsensusBias,
  useEngineConsensusHistory,
  useEngineResearchReports,
  useEnginePortfolio,
  useEngineBalance,
  useEnginePortfolioHistory,
  useEnginePortfolioSummary,
  useEnginePortfolioPerformance,
  useEngineAnalyticsSegments,
  useEngineAnalyticsSignals,
  useEngineAnalyticsSummary,
  useEngineAnalyticsTopSegments,
  useEngineAnalyticsHourly,
  useEnginePaperStatus,
  useEngineSystemMetrics,
  useEngineTradesLedger,
  useEngineExecutionOrders,
} from '@/config/hooks/useServices'

const FAST_MS   =  2_000  // live price + cockpit vitals
const MEDIUM_MS =  5_000  // operational state; matches 5-min market cadence
const SLOW_MS   = 30_000  // /health takes ~5s server-side; config rarely changes
// markets + edges read through the backend's saturated `market_fetch` limiter
// (~96% wait); polling slower than MEDIUM avoids catching it mid-throttle
// (the Markets "tap out, tap in" flicker).
const MARKET_POLL_MS = 8_000

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
  const executionTrades = useEngineExecutionTrades(MEDIUM_MS)
  const paperStats      = useEnginePaperStats(MEDIUM_MS)
  const runtime         = useEngineRuntime(SLOW_MS)
  const health          = useEngineHealth(SLOW_MS)
  const config          = useEngineConfig(SLOW_MS)
  const executionPolicy = useEngineExecutionPolicy(SLOW_MS)  // read-only, rarely changes
  const identity        = useEngineIdentity()   // static per process — fetch once

  // MEDIUM tier: live/cycle-driven
  const consensus            = useEngineConsensus(MEDIUM_MS)
  const consensusBias        = useEngineConsensusBias(MEDIUM_MS)
  const portfolio            = useEnginePortfolio(MEDIUM_MS)
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
  const portfolioPerformance = useEnginePortfolioPerformance(SLOW_MS)
  const analyticsSegments    = useEngineAnalyticsSegments(SLOW_MS)
  const analyticsSignals     = useEngineAnalyticsSignals(SLOW_MS)
  const analyticsSummary     = useEngineAnalyticsSummary(SLOW_MS)
  const analyticsTopSegments = useEngineAnalyticsTopSegments(SLOW_MS)
  const analyticsHourly      = useEngineAnalyticsHourly(SLOW_MS)
  const systemMetrics        = useEngineSystemMetrics(SLOW_MS)

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
  useEffect(() => { updateEngine({ executionTrades }) }, [executionTrades, updateEngine])
  useEffect(() => { updateEngine({ paperStats }) },      [paperStats,      updateEngine])

  useEffect(() => { updateEngine({ consensus }) },            [consensus,            updateEngine])
  useEffect(() => { updateEngine({ consensusBias }) },        [consensusBias,        updateEngine])
  useEffect(() => { updateEngine({ portfolio }) },            [portfolio,            updateEngine])
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
  useEffect(() => { updateEngine({ portfolioPerformance }) }, [portfolioPerformance, updateEngine])
  useEffect(() => { updateEngine({ analyticsSegments }) },    [analyticsSegments,    updateEngine])
  useEffect(() => { updateEngine({ analyticsSignals }) },     [analyticsSignals,     updateEngine])
  useEffect(() => { updateEngine({ analyticsSummary }) },     [analyticsSummary,     updateEngine])
  useEffect(() => { updateEngine({ analyticsTopSegments }) }, [analyticsTopSegments, updateEngine])
  useEffect(() => { updateEngine({ analyticsHourly }) },      [analyticsHourly,      updateEngine])
  useEffect(() => { updateEngine({ systemMetrics }) },        [systemMetrics,        updateEngine])

  return null
}
