// Live backend integration: fetch JSON DTOs via the shared API client, normalize
// via the dto.ts adapters, and return the standard ApiResult. Paths come from the
// central endpoint registry — entries with status other than 'confirmed' throw
// ENDPOINT_NOT_CONFIGURED until the backend confirms them.

import { ok, type ApiResult } from './response'
import type { IEngineService, CreateOrderInput, AnalyticsSegmentType, AnalyticsMetric } from './interfaces'
import {
  toEngineHealth, toEngineRuntime, toEngineStats, toEngineConfig, toSurvivalStatus, toPriceHistory,
  toEngineMarkets, toEnginePositions, toEngineEvents, toEngineEdges,
  toEngineIdentity, runtimeToIdentity, toExecutionStatus,
  toExecutionPolicy, toExecutionTrades, toPaperStats,
  toPositionsHistory, toSurvivalPatterns,
  toConsensus, toConsensusBias, toConsensusHistory,
  toResearchReports, toPortfolio, toBalance, toPortfolioHistory, toPortfolioSummary, toPortfolioPerformance,
  toAnalyticsSegments, toAnalyticsSignals, toAnalyticsSummary, toAnalyticsTopSegments, toAnalyticsHourly,
  toPaperStatus, toSystemMetrics, toTradesLedger, toExecutionOrders,
  toMarketsSummary, toMarketPriceHistory, toMutationResult,
} from './dto'
import { apiGet, apiGetHost, apiPost } from '@/lib/api/client'
import { ENDPOINTS, endpointPath, endpointPathWith } from '@/lib/api/endpoints'
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
  MarketsSummaryDTO, MarketsSummary, MarketPriceHistoryDTO, MarketPriceHistory,
  MutationResultDTO, MutationResult,
} from '@/types/engine'

export class LiveEngineService implements IEngineService {
  async getHealth(): Promise<ApiResult<EngineHealth>> {
    // The health probe path depends on the topology:
    //   • Behind the nginx bridge (prod): the engine's host root is NOT the
    //     engine — `/` and `/health` route to the marketing site. The bridge maps
    //     `/api/health` → engine `/health`, so /api/health is the live path.
    //   • Base pointing straight at the engine (dev: http://IP:8000): the engine
    //     serves /health at its host root and has no /api/health.
    // Try /api/health first (works in prod, and is the correct proxied path),
    // then fall back to host-root /health (dev). Ordering it this way means prod
    // never bounces a request off the marketing site. `endpointPath` returns
    // `/health`, so apiGet → /api/health and apiGetHost → host-root /health.
    try {
      const dto = await apiGet<EngineHealthDTO>(endpointPath(ENDPOINTS.engine.health))
      return ok(toEngineHealth(dto))
    } catch {
      const dto = await apiGetHost<EngineHealthDTO>(endpointPath(ENDPOINTS.engine.health))
      return ok(toEngineHealth(dto))
    }
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

  /**
   * Markets currently being scanned by the engine (typically 1–3 live 5m
   * markets). NOT the historical archive — that is getMarketsSummary().
   *
   * This endpoint intermittently stalls (see the registry note); the 15s client
   * timeout converts a stall into a retryable TIMEOUT, which the service state
   * machine already surfaces as a transient error rather than a hang.
   */
  async getMarkets(): Promise<ApiResult<EngineMarkets>> {
    const dto = await apiGet<EngineMarketsDTO>(endpointPath(ENDPOINTS.markets.list))
    return ok(toEngineMarkets(dto))
  }

  async getPositions(): Promise<ApiResult<EnginePositions>> {
    const dto = await apiGet<EnginePositionsDTO>(endpointPath(ENDPOINTS.positions.list))
    return ok(toEnginePositions(dto))
  }

  async getEvents(limit?: number, types?: readonly string[]): Promise<ApiResult<EngineEvents>> {
    const dto = await apiGet<EngineEventsDTO>(endpointPath(ENDPOINTS.engine.events), {
      ...(limit !== undefined ? { limit } : {}),
      // Server-side filtering — verified working 2026-07-25. Previously the app
      // fetched everything and filtered client-side.
      ...(types !== undefined && types.length > 0 ? { type: types.join(',') } : {}),
    })
    return ok(toEngineEvents(dto))
  }

  async getEdges(limit?: number): Promise<ApiResult<EngineEdges>> {
    const dto = await apiGet<EngineEdgesDTO>(
      endpointPath(ENDPOINTS.markets.edges),
      limit !== undefined ? { limit } : undefined,
    )
    return ok(toEngineEdges(dto))
  }

  async getIdentity(): Promise<ApiResult<EngineIdentity>> {
    // /api/runtime is proxied everywhere (dev: engine; prod: nginx → engine) and
    // carries mode + components + initialized_at; bot/version come from app
    // constants. The engine also exposes a richer identity at its bare host root
    // `/`, but behind the nginx bridge `/` is the MARKETING site (200 HTML, not
    // JSON). So derive identity from runtime as the primary source — it works in
    // both topologies and never touches the marketing site — and only fall back
    // to host-root `/` when runtime itself is unavailable (a dev-only rescue).
    try {
      const rt = await apiGet<EngineRuntimeDTO>(endpointPath(ENDPOINTS.engine.runtime))
      return ok(runtimeToIdentity(rt))
    } catch (runtimeErr) {
      try {
        const dto = await apiGetHost<EngineIdentityDTO>(endpointPath(ENDPOINTS.engine.apiRoot))
        if (dto && typeof dto === 'object' && 'runtime' in dto) {
          return ok(toEngineIdentity(dto))
        }
        // 200 but not identity (e.g. proxy served HTML) — no usable fallback.
      } catch {
        // host-root unreachable too — surface the runtime failure below.
      }
      throw runtimeErr
    }
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

  async getPositionsHistory(limit?: number, direction?: 'YES' | 'NO'): Promise<ApiResult<PositionsHistory>> {
    const dto = await apiGet<PositionsHistoryDTO>(endpointPath(ENDPOINTS.positions.history), {
      ...(limit !== undefined ? { limit } : {}),
      ...(direction !== undefined ? { direction } : {}),
    })
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

  async getConsensusHistory(limit?: number): Promise<ApiResult<ConsensusHistory>> {
    const dto = await apiGet<ConsensusHistoryDTO>(
      endpointPath(ENDPOINTS.consensus.history),
      limit !== undefined ? { limit } : undefined,
    )
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

  async getPortfolioHistory(limit?: number): Promise<ApiResult<PortfolioHistory>> {
    const dto = await apiGet<PortfolioHistoryDTO>(
      endpointPath(ENDPOINTS.portfolio.history),
      limit !== undefined ? { limit } : undefined,
    )
    return ok(toPortfolioHistory(dto))
  }

  async getPortfolioSummary(): Promise<ApiResult<PortfolioSummary>> {
    const dto = await apiGet<PortfolioSummaryDTO>(endpointPath(ENDPOINTS.portfolio.summary))
    return ok(toPortfolioSummary(dto))
  }

  async getPortfolioPerformance(lookbackHours = 24): Promise<ApiResult<PortfolioPerformance>> {
    const dto = await apiGet<PortfolioPerformanceDTO>(endpointPath(ENDPOINTS.portfolio.performance), { lookback_hours: lookbackHours })
    return ok(toPortfolioPerformance(dto))
  }

  async getAnalyticsSegments(segmentType?: AnalyticsSegmentType): Promise<ApiResult<AnalyticsSegments>> {
    const dto = await apiGet<AnalyticsSegmentsDTO>(
      endpointPath(ENDPOINTS.analytics.segments),
      segmentType !== undefined ? { segment_type: segmentType } : undefined,
    )
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

  /** segment_type and metric are REQUIRED — the backend 422s without them
   *  (verified 2026-07-25), so these defaults are load-bearing, not cosmetic. */
  async getAnalyticsTopSegments(
    segmentType: AnalyticsSegmentType = 'edge_bucket',
    metric:      AnalyticsMetric      = 'win_rate',
    limit                             = 5,
  ): Promise<ApiResult<AnalyticsTopSegments>> {
    const dto = await apiGet<AnalyticsTopSegmentsDTO>(endpointPath(ENDPOINTS.analytics.topSegments), {
      segment_type: segmentType, metric, limit,
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

  async getTradesLedger(limit?: number, direction?: 'YES' | 'NO'): Promise<ApiResult<TradesLedger>> {
    const dto = await apiGet<TradesLedgerDTO>(endpointPath(ENDPOINTS.trades.ledger), {
      ...(limit !== undefined ? { limit } : {}),
      ...(direction !== undefined ? { direction } : {}),
    })
    return ok(toTradesLedger(dto))
  }

  async getExecutionOrders(status?: 'active' | 'closed'): Promise<ApiResult<ExecutionOrders>> {
    const dto = await apiGet<ExecutionOrdersDTO>(
      endpointPath(ENDPOINTS.executionControl.orders),
      status !== undefined ? { status } : undefined,
    )
    return ok(toExecutionOrders(dto))
  }

  /** Order lookup by id. Returns the raw body — the item schema is still
   *  unconfirmed (no orders have existed yet; the routes 404 cleanly). */
  async getOrderById(orderId: string, scope: 'any' | 'active' | 'closed' = 'any'): Promise<ApiResult<unknown>> {
    const endpoint =
      scope === 'active' ? ENDPOINTS.executionControl.activeOrderById :
      scope === 'closed' ? ENDPOINTS.executionControl.closedOrderById :
                           ENDPOINTS.executionControl.orderById
    const dto = await apiGet<unknown>(endpointPathWith(endpoint, { order_id: orderId }))
    return ok(dto)
  }

  // ── Phase 1 (2026-07-25) — markets recovery ────────────────────────────────
  // GET /api/markets hangs, so the markets surface reads from the history
  // summary instead. Same per-market coverage, plus min/max/avg pricing.

  async getMarketsSummary(): Promise<ApiResult<MarketsSummary>> {
    const dto = await apiGet<MarketsSummaryDTO>(endpointPath(ENDPOINTS.markets.historySummary))
    return ok(toMarketsSummary(dto))
  }

  async getMarketPriceHistory(marketId: string, limit = 100): Promise<ApiResult<MarketPriceHistory>> {
    const dto = await apiGet<MarketPriceHistoryDTO>(
      endpointPathWith(ENDPOINTS.markets.volume, { market_id: marketId }),
      { limit },
    )
    return ok(toMarketPriceHistory(dto))
  }

  // ── Phase 1 (2026-07-25) — mutation layer ──────────────────────────────────
  // These change engine state. The UI is responsible for confirming with the
  // operator before calling; no gating happens here.

  async createOrder(input: CreateOrderInput): Promise<ApiResult<MutationResult>> {
    const dto = await apiPost<MutationResultDTO>(endpointPath(ENDPOINTS.executionControl.create), {
      market_id:    input.marketId,
      direction:    input.direction,
      size_usd:     input.sizeUsd,
      edge_pct:     input.edgePct,
      confidence:   input.confidence,
      preview_only: input.previewOnly ?? false,
    })
    return ok(toMutationResult(dto))
  }

  async closePosition(marketId: string): Promise<ApiResult<MutationResult>> {
    const dto = await apiPost<MutationResultDTO>(
      endpointPathWith(ENDPOINTS.executionControl.close, { market_id: marketId }),
    )
    return ok(toMutationResult(dto))
  }

  async cancelOrder(orderId: string): Promise<ApiResult<MutationResult>> {
    const dto = await apiPost<MutationResultDTO>(
      endpointPathWith(ENDPOINTS.executionControl.cancel, { order_id: orderId }),
    )
    return ok(toMutationResult(dto))
  }

  async emergencyStop(): Promise<ApiResult<MutationResult>> {
    const dto = await apiPost<MutationResultDTO>(endpointPath(ENDPOINTS.executionControl.emergencyStop))
    return ok(toMutationResult(dto))
  }

  async startPaperTrading(): Promise<ApiResult<MutationResult>> {
    const dto = await apiPost<MutationResultDTO>(endpointPath(ENDPOINTS.paper.start))
    return ok(toMutationResult(dto))
  }

  async stopPaperTrading(): Promise<ApiResult<MutationResult>> {
    const dto = await apiPost<MutationResultDTO>(endpointPath(ENDPOINTS.paper.stop))
    return ok(toMutationResult(dto))
  }

  async resetPaperTrading(): Promise<ApiResult<MutationResult>> {
    const dto = await apiPost<MutationResultDTO>(endpointPath(ENDPOINTS.paper.reset))
    return ok(toMutationResult(dto))
  }

  async resolvePaperTrades(): Promise<ApiResult<MutationResult>> {
    const dto = await apiPost<MutationResultDTO>(endpointPath(ENDPOINTS.paper.resolve))
    return ok(toMutationResult(dto))
  }
}
