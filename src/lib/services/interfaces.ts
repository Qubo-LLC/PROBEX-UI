// Service interface + registry. After the M5 consolidation the cockpit consumes
// exactly one backend domain — the Quant Engine — so the registry holds a single
// service. Each method is async (the backend contract); each read also exposes an
// optional synchronous `peek*` that returns an immediate snapshot when one is
// available (the mock returns data; the live impl returns null → drives loading).

import type { ApiResult } from './response'

import type {
  EngineHealth, EngineRuntime, EngineStats, EngineConfig,
  SurvivalStatus, PriceHistory,
  EngineMarkets, EnginePositions, EngineEvents, EngineEdges,
  EngineIdentity, ExecutionStatus,
  ExecutionPolicy, ExecutionTrades, PaperStats,
  PositionsHistory, SurvivalPatterns,
  Consensus, ConsensusBias, ConsensusHistory,
  ResearchReports, Portfolio, Balance, PortfolioHistory, PortfolioSummary, PortfolioPerformance,
  AnalyticsSegments, AnalyticsSignals, AnalyticsSummary, AnalyticsTopSegments, AnalyticsHourly,
  PaperStatus, SystemMetrics, TradesLedger, ExecutionOrders,
} from '@/types/engine'

// ─── Engine ────────────────────────────────────────────────────────────────────
// Operational endpoints confirmed against the Postman collection.
// /health and / are served at the host root (not under /api) — their live
// implementations use apiGetHost(); all others use apiGet() against the /api base.

export interface IEngineService {
  getHealth():             Promise<ApiResult<EngineHealth>>
  getRuntime():            Promise<ApiResult<EngineRuntime>>
  getStats():              Promise<ApiResult<EngineStats>>
  getConfig():             Promise<ApiResult<EngineConfig>>
  getSurvival():           Promise<ApiResult<SurvivalStatus>>
  getPriceHistory():       Promise<ApiResult<PriceHistory>>
  getMarkets():            Promise<ApiResult<EngineMarkets>>
  getPositions():          Promise<ApiResult<EnginePositions>>
  getEvents():             Promise<ApiResult<EngineEvents>>
  getEdges():              Promise<ApiResult<EngineEdges>>
  getIdentity():           Promise<ApiResult<EngineIdentity>>
  getExecutionStatus():    Promise<ApiResult<ExecutionStatus>>
  getExecutionPolicy():    Promise<ApiResult<ExecutionPolicy>>
  getExecutionTrades():    Promise<ApiResult<ExecutionTrades>>
  getPaperStats():         Promise<ApiResult<PaperStats>>

  // ── Phase 3 (2026-07-22 redeploy) — 20 newly-live endpoints ────────────────
  getPositionsHistory():      Promise<ApiResult<PositionsHistory>>
  getSurvivalPatterns():      Promise<ApiResult<SurvivalPatterns>>
  getConsensus():             Promise<ApiResult<Consensus>>
  getConsensusBias():         Promise<ApiResult<ConsensusBias>>
  getConsensusHistory():      Promise<ApiResult<ConsensusHistory>>
  getResearchReports():       Promise<ApiResult<ResearchReports>>
  getPortfolio():             Promise<ApiResult<Portfolio>>
  getBalance():               Promise<ApiResult<Balance>>
  getPortfolioHistory():      Promise<ApiResult<PortfolioHistory>>
  getPortfolioSummary():      Promise<ApiResult<PortfolioSummary>>
  getPortfolioPerformance():  Promise<ApiResult<PortfolioPerformance>>
  getAnalyticsSegments():     Promise<ApiResult<AnalyticsSegments>>
  getAnalyticsSignals():      Promise<ApiResult<AnalyticsSignals>>
  getAnalyticsSummary():      Promise<ApiResult<AnalyticsSummary>>
  getAnalyticsTopSegments():  Promise<ApiResult<AnalyticsTopSegments>>
  getAnalyticsHourly():       Promise<ApiResult<AnalyticsHourly>>
  getPaperStatus():           Promise<ApiResult<PaperStatus>>
  getSystemMetrics():         Promise<ApiResult<SystemMetrics>>
  getTradesLedger():          Promise<ApiResult<TradesLedger>>
  getExecutionOrders():       Promise<ApiResult<ExecutionOrders>>

  peekHealth?():           EngineHealth | null
  peekRuntime?():          EngineRuntime | null
  peekStats?():            EngineStats | null
  peekConfig?():           EngineConfig | null
  peekSurvival?():         SurvivalStatus | null
  peekPriceHistory?():     PriceHistory | null
  peekMarkets?():          EngineMarkets | null
  peekPositions?():        EnginePositions | null
  peekEvents?():           EngineEvents | null
  peekEdges?():            EngineEdges | null
  peekIdentity?():         EngineIdentity | null
  peekExecutionStatus?():  ExecutionStatus | null
  peekExecutionPolicy?():  ExecutionPolicy | null
  peekExecutionTrades?():  ExecutionTrades | null
  peekPaperStats?():       PaperStats | null

  peekPositionsHistory?():     PositionsHistory | null
  peekSurvivalPatterns?():     SurvivalPatterns | null
  peekConsensus?():            Consensus | null
  peekConsensusBias?():        ConsensusBias | null
  peekConsensusHistory?():     ConsensusHistory | null
  peekResearchReports?():      ResearchReports | null
  peekPortfolio?():            Portfolio | null
  peekBalance?():              Balance | null
  peekPortfolioHistory?():     PortfolioHistory | null
  peekPortfolioSummary?():     PortfolioSummary | null
  peekPortfolioPerformance?(): PortfolioPerformance | null
  peekAnalyticsSegments?():    AnalyticsSegments | null
  peekAnalyticsSignals?():     AnalyticsSignals | null
  peekAnalyticsSummary?():     AnalyticsSummary | null
  peekAnalyticsTopSegments?(): AnalyticsTopSegments | null
  peekAnalyticsHourly?():      AnalyticsHourly | null
  peekPaperStatus?():          PaperStatus | null
  peekSystemMetrics?():        SystemMetrics | null
  peekTradesLedger?():         TradesLedger | null
  peekExecutionOrders?():      ExecutionOrders | null
}

// ─── Registry shape ────────────────────────────────────────────────────────────

export interface ServiceRegistry {
  engine: IEngineService
}
