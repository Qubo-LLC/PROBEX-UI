// Live backend integration: fetch JSON DTOs via the shared API client, normalize
// via the dto.ts adapters, and return the standard ApiResult. Paths come from the
// central endpoint registry — entries with status other than 'confirmed' throw
// ENDPOINT_NOT_CONFIGURED until the backend confirms them.

import { ok, type ApiResult } from './response'
import type { IEngineService } from './interfaces'
import {
  toEngineHealth, toEngineRuntime, toEngineStats, toEngineConfig, toSurvivalStatus, toPriceHistory,
  toEngineMarkets, toEnginePositions, toEngineEvents, toEngineEdges,
  toEngineIdentity, toExecutionStatus,
  toExecutionPolicy, toExecutionTrades, toPaperStats,
  toPositionsHistory, toSurvivalPatterns,
  toConsensus, toConsensusBias, toConsensusHistory,
  toResearchReports, toPortfolio, toBalance, toPortfolioHistory, toPortfolioSummary, toPortfolioPerformance,
  toAnalyticsSegments, toAnalyticsSignals, toAnalyticsSummary, toAnalyticsTopSegments, toAnalyticsHourly,
  toPaperStatus, toSystemMetrics, toTradesLedger, toExecutionOrders,
} from './dto'
import { apiGet, apiGetHost } from '@/lib/api/client'
import { ENDPOINTS, endpointPath } from '@/lib/api/endpoints'
import type {
  EngineHealthDTO, EngineRuntimeDTO, EngineStatsDTO, EngineConfigDTO, SurvivalDTO, PriceHistoryDTO,
  EngineMarketsDTO, EnginePositionsDTO, EngineEventsDTO, EngineEdgesDTO,
  EngineIdentityDTO, ExecutionStatusDTO,
  ExecutionPolicyDTO, ExecutionTradesDTO, PaperStatsDTO,
  EngineHealth, EngineRuntime, EngineStats, EngineConfig, SurvivalStatus, PriceHistory,
  EngineMarkets, EnginePositions, EngineEvents, EngineEdges,
  EngineIdentity, ExecutionStatus,
  ExecutionPolicy, ExecutionTrades, PaperStats,
  PositionsHistoryDTO, PositionsHistory, SurvivalPatternsDTO, SurvivalPatterns,
  ConsensusDTO, Consensus, ConsensusBiasDTO, ConsensusBias, ConsensusHistoryDTO, ConsensusHistory,
  ResearchReportsDTO, ResearchReports,
  PortfolioDTO, Portfolio, BalanceDTO, Balance,
  PortfolioHistoryDTO, PortfolioHistory, PortfolioSummaryDTO, PortfolioSummary,
  PortfolioPerformanceDTO, PortfolioPerformance,
  AnalyticsSegmentsDTO, AnalyticsSegments, AnalyticsSignalsDTO, AnalyticsSignals,
  AnalyticsSummaryDTO, AnalyticsSummary, AnalyticsTopSegmentsDTO, AnalyticsTopSegments,
  AnalyticsHourlyDTO, AnalyticsHourly,
  PaperStatusDTO, PaperStatus, SystemMetricsDTO, SystemMetrics,
  TradesLedgerDTO, TradesLedger, ExecutionOrdersDTO, ExecutionOrders,
} from '@/types/engine'

export class LiveEngineService implements IEngineService {
  async getHealth(): Promise<ApiResult<EngineHealth>> {
    // /health lives at the host root, NOT under the /api prefix — must use apiGetHost.
    const dto = await apiGetHost<EngineHealthDTO>(endpointPath(ENDPOINTS.engine.health))
    return ok(toEngineHealth(dto))
  }

  async getRuntime(): Promise<ApiResult<EngineRuntime>> {
    const dto = await apiGet<EngineRuntimeDTO>(endpointPath(ENDPOINTS.engine.runtime))
    return ok(toEngineRuntime(dto))
  }

  async getStats(): Promise<ApiResult<EngineStats>> {
    const dto = await apiGet<EngineStatsDTO>(endpointPath(ENDPOINTS.engine.stats))
    return ok(toEngineStats(dto))
  }

  async getConfig(): Promise<ApiResult<EngineConfig>> {
    const dto = await apiGet<EngineConfigDTO>(endpointPath(ENDPOINTS.engine.variableConfig))
    return ok(toEngineConfig(dto))
  }

  async getSurvival(): Promise<ApiResult<SurvivalStatus>> {
    const dto = await apiGet<SurvivalDTO>(endpointPath(ENDPOINTS.engine.survivalStrategy))
    return ok(toSurvivalStatus(dto))
  }

  async getPriceHistory(): Promise<ApiResult<PriceHistory>> {
    const dto = await apiGet<PriceHistoryDTO>(endpointPath(ENDPOINTS.markets.history))
    return ok(toPriceHistory(dto))
  }

  async getMarkets(): Promise<ApiResult<EngineMarkets>> {
    const dto = await apiGet<EngineMarketsDTO>(endpointPath(ENDPOINTS.markets.list))
    return ok(toEngineMarkets(dto))
  }

  async getPositions(): Promise<ApiResult<EnginePositions>> {
    const dto = await apiGet<EnginePositionsDTO>(endpointPath(ENDPOINTS.positions.list))
    return ok(toEnginePositions(dto))
  }

  async getEvents(): Promise<ApiResult<EngineEvents>> {
    const dto = await apiGet<EngineEventsDTO>(endpointPath(ENDPOINTS.engine.events))
    return ok(toEngineEvents(dto))
  }

  async getEdges(): Promise<ApiResult<EngineEdges>> {
    const dto = await apiGet<EngineEdgesDTO>(endpointPath(ENDPOINTS.markets.edges))
    return ok(toEngineEdges(dto))
  }

  async getIdentity(): Promise<ApiResult<EngineIdentity>> {
    // API root lives at the bare host (like /health) — outside the /api prefix.
    const dto = await apiGetHost<EngineIdentityDTO>(endpointPath(ENDPOINTS.engine.apiRoot))
    return ok(toEngineIdentity(dto))
  }

  async getExecutionStatus(): Promise<ApiResult<ExecutionStatus>> {
    const dto = await apiGet<ExecutionStatusDTO>(endpointPath(ENDPOINTS.engine.executionStatus))
    return ok(toExecutionStatus(dto))
  }

  async getExecutionPolicy(): Promise<ApiResult<ExecutionPolicy>> {
    const dto = await apiGet<ExecutionPolicyDTO>(endpointPath(ENDPOINTS.engine.executionPolicy))
    return ok(toExecutionPolicy(dto))
  }

  async getExecutionTrades(): Promise<ApiResult<ExecutionTrades>> {
    const dto = await apiGet<ExecutionTradesDTO>(endpointPath(ENDPOINTS.engine.executionTrades))
    return ok(toExecutionTrades(dto))
  }

  async getPaperStats(): Promise<ApiResult<PaperStats>> {
    const dto = await apiGet<PaperStatsDTO>(endpointPath(ENDPOINTS.engine.paperStats))
    return ok(toPaperStats(dto))
  }

  // ── Phase 3 (2026-07-22 redeploy) — 20 newly-live endpoints ────────────────

  async getPositionsHistory(): Promise<ApiResult<PositionsHistory>> {
    const dto = await apiGet<PositionsHistoryDTO>(endpointPath(ENDPOINTS.positions.history))
    return ok(toPositionsHistory(dto))
  }

  async getSurvivalPatterns(): Promise<ApiResult<SurvivalPatterns>> {
    const dto = await apiGet<SurvivalPatternsDTO>(endpointPath(ENDPOINTS.survival.patterns))
    return ok(toSurvivalPatterns(dto))
  }

  async getConsensus(): Promise<ApiResult<Consensus>> {
    const dto = await apiGet<ConsensusDTO>(endpointPath(ENDPOINTS.consensus.global))
    return ok(toConsensus(dto))
  }

  async getConsensusBias(): Promise<ApiResult<ConsensusBias>> {
    const dto = await apiGet<ConsensusBiasDTO>(endpointPath(ENDPOINTS.consensus.bias))
    return ok(toConsensusBias(dto))
  }

  async getConsensusHistory(): Promise<ApiResult<ConsensusHistory>> {
    const dto = await apiGet<ConsensusHistoryDTO>(endpointPath(ENDPOINTS.consensus.history))
    return ok(toConsensusHistory(dto))
  }

  async getResearchReports(): Promise<ApiResult<ResearchReports>> {
    const dto = await apiGet<ResearchReportsDTO>(endpointPath(ENDPOINTS.research.reports))
    return ok(toResearchReports(dto))
  }

  async getPortfolio(): Promise<ApiResult<Portfolio>> {
    const dto = await apiGet<PortfolioDTO>(endpointPath(ENDPOINTS.portfolio.live))
    return ok(toPortfolio(dto))
  }

  async getBalance(): Promise<ApiResult<Balance>> {
    const dto = await apiGet<BalanceDTO>(endpointPath(ENDPOINTS.wallet.balance))
    return ok(toBalance(dto))
  }

  async getPortfolioHistory(): Promise<ApiResult<PortfolioHistory>> {
    const dto = await apiGet<PortfolioHistoryDTO>(endpointPath(ENDPOINTS.portfolio.history))
    return ok(toPortfolioHistory(dto))
  }

  async getPortfolioSummary(): Promise<ApiResult<PortfolioSummary>> {
    const dto = await apiGet<PortfolioSummaryDTO>(endpointPath(ENDPOINTS.portfolio.summary))
    return ok(toPortfolioSummary(dto))
  }

  async getPortfolioPerformance(): Promise<ApiResult<PortfolioPerformance>> {
    const dto = await apiGet<PortfolioPerformanceDTO>(endpointPath(ENDPOINTS.portfolio.performance), { lookback_hours: 24 })
    return ok(toPortfolioPerformance(dto))
  }

  async getAnalyticsSegments(): Promise<ApiResult<AnalyticsSegments>> {
    const dto = await apiGet<AnalyticsSegmentsDTO>(endpointPath(ENDPOINTS.analytics.segments))
    return ok(toAnalyticsSegments(dto))
  }

  async getAnalyticsSignals(): Promise<ApiResult<AnalyticsSignals>> {
    const dto = await apiGet<AnalyticsSignalsDTO>(endpointPath(ENDPOINTS.analytics.signals))
    return ok(toAnalyticsSignals(dto))
  }

  async getAnalyticsSummary(): Promise<ApiResult<AnalyticsSummary>> {
    const dto = await apiGet<AnalyticsSummaryDTO>(endpointPath(ENDPOINTS.analytics.summary))
    return ok(toAnalyticsSummary(dto))
  }

  async getAnalyticsTopSegments(): Promise<ApiResult<AnalyticsTopSegments>> {
    const dto = await apiGet<AnalyticsTopSegmentsDTO>(endpointPath(ENDPOINTS.analytics.topSegments), {
      segment_type: 'edge_bucket', metric: 'win_rate', limit: 5,
    })
    return ok(toAnalyticsTopSegments(dto))
  }

  async getAnalyticsHourly(): Promise<ApiResult<AnalyticsHourly>> {
    const dto = await apiGet<AnalyticsHourlyDTO>(endpointPath(ENDPOINTS.analytics.hourly))
    return ok(toAnalyticsHourly(dto))
  }

  async getPaperStatus(): Promise<ApiResult<PaperStatus>> {
    const dto = await apiGet<PaperStatusDTO>(endpointPath(ENDPOINTS.paper.status))
    return ok(toPaperStatus(dto))
  }

  async getSystemMetrics(): Promise<ApiResult<SystemMetrics>> {
    const dto = await apiGet<SystemMetricsDTO>(endpointPath(ENDPOINTS.engine.systemMetrics))
    return ok(toSystemMetrics(dto))
  }

  async getTradesLedger(): Promise<ApiResult<TradesLedger>> {
    const dto = await apiGet<TradesLedgerDTO>(endpointPath(ENDPOINTS.trades.ledger))
    return ok(toTradesLedger(dto))
  }

  async getExecutionOrders(): Promise<ApiResult<ExecutionOrders>> {
    const dto = await apiGet<ExecutionOrdersDTO>(endpointPath(ENDPOINTS.executionControl.orders))
    return ok(toExecutionOrders(dto))
  }
}
