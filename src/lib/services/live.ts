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
  toMarketsSummary, toMarketPriceHistory, toMarketDetail, toMutationResult,
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
  MarketDetailDTO, MarketDetail,
  MutationResultDTO, MutationResult,
} from '@/types/engine'
import {
  toMathLayersStatus, toMathRecommendations, toKalmanLayer, toKalmanMultiAsset,
  toBayesianLayer, toBrierLayer, toShapleyLayer,
  toPerformanceByCategory, toPerformanceByAsset,
} from './quantDto'
import type {
  MathLayersStatusDTO, MathLayersStatus,
  MathRecommendationsDTO, MathRecommendationsEnvelope,
  KalmanLayerDTO, KalmanMultiAssetDTO, KalmanLayer,
  BayesianLayerDTO, BayesianLayer,
  BrierLayerDTO, BrierLayer,
  ShapleyLayerDTO, ShapleyLayer,
  PerformanceByCategoryDTO, PerformanceByAssetDTO, PerformanceBuckets,
} from '@/types/quant'

export class LiveEngineService implements IEngineService {
  async getHealth(signal?: AbortSignal): Promise<ApiResult<EngineHealth>> {
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
      const dto = await apiGet<EngineHealthDTO>(endpointPath(ENDPOINTS.engine.health), undefined, signal)
      return ok(toEngineHealth(dto))
    } catch {
      const dto = await apiGetHost<EngineHealthDTO>(endpointPath(ENDPOINTS.engine.health), undefined, signal)
      return ok(toEngineHealth(dto))
    }
  }

  async getRuntime(signal?: AbortSignal): Promise<ApiResult<EngineRuntime>> {
    const dto = await apiGet<EngineRuntimeDTO>(endpointPath(ENDPOINTS.engine.runtime), undefined, signal)
    return ok(toEngineRuntime(dto))
  }

  async getStats(signal?: AbortSignal): Promise<ApiResult<EngineStats>> {
    const dto = await apiGet<EngineStatsDTO>(endpointPath(ENDPOINTS.engine.stats), undefined, signal)
    return ok(toEngineStats(dto))
  }

  async getConfig(signal?: AbortSignal): Promise<ApiResult<EngineConfig>> {
    const dto = await apiGet<EngineConfigDTO>(endpointPath(ENDPOINTS.engine.variableConfig), undefined, signal)
    return ok(toEngineConfig(dto))
  }

  async getSurvival(signal?: AbortSignal): Promise<ApiResult<SurvivalStatus>> {
    const dto = await apiGet<SurvivalDTO>(endpointPath(ENDPOINTS.engine.survivalStrategy), undefined, signal)
    return ok(toSurvivalStatus(dto))
  }

  async getPriceHistory(signal?: AbortSignal): Promise<ApiResult<PriceHistory>> {
    const dto = await apiGet<PriceHistoryDTO>(endpointPath(ENDPOINTS.markets.history), undefined, signal)
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
  async getMarkets(signal?: AbortSignal): Promise<ApiResult<EngineMarkets>> {
    const dto = await apiGet<EngineMarketsDTO>(endpointPath(ENDPOINTS.markets.list), undefined, signal)
    return ok(toEngineMarkets(dto))
  }

  async getPositions(signal?: AbortSignal): Promise<ApiResult<EnginePositions>> {
    const dto = await apiGet<EnginePositionsDTO>(endpointPath(ENDPOINTS.positions.list), undefined, signal)
    return ok(toEnginePositions(dto))
  }

  async getEvents(limit?: number, types?: readonly string[], signal?: AbortSignal): Promise<ApiResult<EngineEvents>> {
    const dto = await apiGet<EngineEventsDTO>(endpointPath(ENDPOINTS.engine.events), {
      ...(limit !== undefined ? { limit } : {}),
      // Server-side filtering — verified working 2026-07-25. Previously the app
      // fetched everything and filtered client-side.
      ...(types !== undefined && types.length > 0 ? { type: types.join(',') } : {}),
    }, signal)
    return ok(toEngineEvents(dto))
  }

  async getEdges(limit?: number, signal?: AbortSignal): Promise<ApiResult<EngineEdges>> {
    const dto = await apiGet<EngineEdgesDTO>(
      endpointPath(ENDPOINTS.markets.edges),
      limit !== undefined ? { limit } : undefined,
      signal,
    )
    return ok(toEngineEdges(dto))
  }

  async getIdentity(signal?: AbortSignal): Promise<ApiResult<EngineIdentity>> {
    // /api/runtime is proxied everywhere (dev: engine; prod: nginx → engine) and
    // carries mode + components + initialized_at; bot/version come from app
    // constants. The engine also exposes a richer identity at its bare host root
    // `/`, but behind the nginx bridge `/` is the MARKETING site (200 HTML, not
    // JSON). So derive identity from runtime as the primary source — it works in
    // both topologies and never touches the marketing site — and only fall back
    // to host-root `/` when runtime itself is unavailable (a dev-only rescue).
    try {
      const rt = await apiGet<EngineRuntimeDTO>(endpointPath(ENDPOINTS.engine.runtime), undefined, signal)
      return ok(runtimeToIdentity(rt))
    } catch (runtimeErr) {
      try {
        const dto = await apiGetHost<EngineIdentityDTO>(endpointPath(ENDPOINTS.engine.apiRoot), undefined, signal)
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

  async getExecutionStatus(signal?: AbortSignal): Promise<ApiResult<ExecutionStatus>> {
    const dto = await apiGet<ExecutionStatusDTO>(endpointPath(ENDPOINTS.engine.executionStatus), undefined, signal)
    return ok(toExecutionStatus(dto))
  }

  async getExecutionPolicy(signal?: AbortSignal): Promise<ApiResult<ExecutionPolicy>> {
    const dto = await apiGet<ExecutionPolicyDTO>(endpointPath(ENDPOINTS.engine.executionPolicy), undefined, signal)
    return ok(toExecutionPolicy(dto))
  }

  async getExecutionTrades(signal?: AbortSignal): Promise<ApiResult<ExecutionTrades>> {
    const dto = await apiGet<ExecutionTradesDTO>(endpointPath(ENDPOINTS.engine.executionTrades), undefined, signal)
    return ok(toExecutionTrades(dto))
  }

  async getPaperStats(signal?: AbortSignal): Promise<ApiResult<PaperStats>> {
    const dto = await apiGet<PaperStatsDTO>(endpointPath(ENDPOINTS.engine.paperStats), undefined, signal)
    return ok(toPaperStats(dto))
  }

  // ── Phase 3 (2026-07-22 redeploy) — 20 newly-live endpoints ────────────────

  async getPositionsHistory(limit?: number, direction?: 'YES' | 'NO', signal?: AbortSignal): Promise<ApiResult<PositionsHistory>> {
    const dto = await apiGet<PositionsHistoryDTO>(endpointPath(ENDPOINTS.positions.history), {
      ...(limit !== undefined ? { limit } : {}),
      ...(direction !== undefined ? { direction } : {}),
    }, signal)
    return ok(toPositionsHistory(dto))
  }

  async getSurvivalPatterns(signal?: AbortSignal): Promise<ApiResult<SurvivalPatterns>> {
    const dto = await apiGet<SurvivalPatternsDTO>(endpointPath(ENDPOINTS.survival.patterns), undefined, signal)
    return ok(toSurvivalPatterns(dto))
  }

  async getConsensus(signal?: AbortSignal): Promise<ApiResult<Consensus>> {
    const dto = await apiGet<ConsensusDTO>(endpointPath(ENDPOINTS.consensus.global), undefined, signal)
    return ok(toConsensus(dto))
  }

  async getConsensusBias(signal?: AbortSignal): Promise<ApiResult<ConsensusBias>> {
    const dto = await apiGet<ConsensusBiasDTO>(endpointPath(ENDPOINTS.consensus.bias), undefined, signal)
    return ok(toConsensusBias(dto))
  }

  async getConsensusHistory(limit?: number, signal?: AbortSignal): Promise<ApiResult<ConsensusHistory>> {
    const dto = await apiGet<ConsensusHistoryDTO>(
      endpointPath(ENDPOINTS.consensus.history),
      limit !== undefined ? { limit } : undefined,
      signal,
    )
    return ok(toConsensusHistory(dto))
  }

  async getResearchReports(signal?: AbortSignal): Promise<ApiResult<ResearchReports>> {
    const dto = await apiGet<ResearchReportsDTO>(endpointPath(ENDPOINTS.research.reports), undefined, signal)
    return ok(toResearchReports(dto))
  }

  async getPortfolio(signal?: AbortSignal): Promise<ApiResult<Portfolio>> {
    const dto = await apiGet<PortfolioDTO>(endpointPath(ENDPOINTS.portfolio.live), undefined, signal)
    return ok(toPortfolio(dto))
  }

  async getBalance(signal?: AbortSignal): Promise<ApiResult<Balance>> {
    const dto = await apiGet<BalanceDTO>(endpointPath(ENDPOINTS.wallet.balance), undefined, signal)
    return ok(toBalance(dto))
  }

  async getPortfolioHistory(limit?: number, signal?: AbortSignal): Promise<ApiResult<PortfolioHistory>> {
    const dto = await apiGet<PortfolioHistoryDTO>(
      endpointPath(ENDPOINTS.portfolio.history),
      limit !== undefined ? { limit } : undefined,
      signal,
    )
    return ok(toPortfolioHistory(dto))
  }

  async getPortfolioSummary(signal?: AbortSignal): Promise<ApiResult<PortfolioSummary>> {
    const dto = await apiGet<PortfolioSummaryDTO>(endpointPath(ENDPOINTS.portfolio.summary), undefined, signal)
    return ok(toPortfolioSummary(dto))
  }

  async getPortfolioPerformance(lookbackHours = 24, signal?: AbortSignal): Promise<ApiResult<PortfolioPerformance>> {
    const dto = await apiGet<PortfolioPerformanceDTO>(endpointPath(ENDPOINTS.portfolio.performance), { lookback_hours: lookbackHours }, signal)
    return ok(toPortfolioPerformance(dto))
  }

  async getAnalyticsSegments(segmentType?: AnalyticsSegmentType, signal?: AbortSignal): Promise<ApiResult<AnalyticsSegments>> {
    const dto = await apiGet<AnalyticsSegmentsDTO>(
      endpointPath(ENDPOINTS.analytics.segments),
      segmentType !== undefined ? { segment_type: segmentType } : undefined,
      signal,
    )
    return ok(toAnalyticsSegments(dto))
  }

  async getAnalyticsSignals(signal?: AbortSignal): Promise<ApiResult<AnalyticsSignals>> {
    const dto = await apiGet<AnalyticsSignalsDTO>(endpointPath(ENDPOINTS.analytics.signals), undefined, signal)
    return ok(toAnalyticsSignals(dto))
  }

  async getAnalyticsSummary(signal?: AbortSignal): Promise<ApiResult<AnalyticsSummary>> {
    const dto = await apiGet<AnalyticsSummaryDTO>(endpointPath(ENDPOINTS.analytics.summary), undefined, signal)
    return ok(toAnalyticsSummary(dto))
  }

  /** segment_type and metric are REQUIRED — the backend 422s without them
   *  (verified 2026-07-25), so these defaults are load-bearing, not cosmetic. */
  async getAnalyticsTopSegments(
    segmentType: AnalyticsSegmentType = 'edge_bucket',
    metric:      AnalyticsMetric      = 'win_rate',
    limit                             = 5,
    signal?: AbortSignal,
  ): Promise<ApiResult<AnalyticsTopSegments>> {
    const dto = await apiGet<AnalyticsTopSegmentsDTO>(endpointPath(ENDPOINTS.analytics.topSegments), {
      segment_type: segmentType, metric, limit,
    }, signal)
    return ok(toAnalyticsTopSegments(dto))
  }

  async getAnalyticsHourly(signal?: AbortSignal): Promise<ApiResult<AnalyticsHourly>> {
    const dto = await apiGet<AnalyticsHourlyDTO>(endpointPath(ENDPOINTS.analytics.hourly), undefined, signal)
    return ok(toAnalyticsHourly(dto))
  }

  async getPaperStatus(signal?: AbortSignal): Promise<ApiResult<PaperStatus>> {
    const dto = await apiGet<PaperStatusDTO>(endpointPath(ENDPOINTS.paper.status), undefined, signal)
    return ok(toPaperStatus(dto))
  }

  async getSystemMetrics(signal?: AbortSignal): Promise<ApiResult<SystemMetrics>> {
    const dto = await apiGet<SystemMetricsDTO>(endpointPath(ENDPOINTS.engine.systemMetrics), undefined, signal)
    return ok(toSystemMetrics(dto))
  }

  async getTradesLedger(limit?: number, direction?: 'YES' | 'NO', signal?: AbortSignal): Promise<ApiResult<TradesLedger>> {
    const dto = await apiGet<TradesLedgerDTO>(endpointPath(ENDPOINTS.trades.ledger), {
      ...(limit !== undefined ? { limit } : {}),
      ...(direction !== undefined ? { direction } : {}),
    }, signal)
    return ok(toTradesLedger(dto))
  }

  async getExecutionOrders(status?: 'active' | 'closed', signal?: AbortSignal): Promise<ApiResult<ExecutionOrders>> {
    const dto = await apiGet<ExecutionOrdersDTO>(
      endpointPath(ENDPOINTS.executionControl.orders),
      status !== undefined ? { status } : undefined,
      signal,
    )
    return ok(toExecutionOrders(dto))
  }

  /** Order lookup by id. Returns the raw body — the item schema is still
   *  unconfirmed (no orders have existed yet; the routes 404 cleanly). */
  async getOrderById(orderId: string, scope: 'any' | 'active' | 'closed' = 'any', signal?: AbortSignal): Promise<ApiResult<unknown>> {
    const endpoint =
      scope === 'active' ? ENDPOINTS.executionControl.activeOrderById :
      scope === 'closed' ? ENDPOINTS.executionControl.closedOrderById :
                           ENDPOINTS.executionControl.orderById
    const dto = await apiGet<unknown>(endpointPathWith(endpoint, { order_id: orderId }), undefined, signal)
    return ok(dto)
  }

  // ── Phase 1 (2026-07-25) — markets recovery ────────────────────────────────
  // GET /api/markets hangs, so the markets surface reads from the history
  // summary instead. Same per-market coverage, plus min/max/avg pricing.

  async getMarketsSummary(signal?: AbortSignal): Promise<ApiResult<MarketsSummary>> {
    const dto = await apiGet<MarketsSummaryDTO>(endpointPath(ENDPOINTS.markets.historySummary), undefined, signal)
    return ok(toMarketsSummary(dto))
  }

  async getMarketPriceHistory(marketId: string, limit = 100, signal?: AbortSignal): Promise<ApiResult<MarketPriceHistory>> {
    const dto = await apiGet<MarketPriceHistoryDTO>(
      endpointPathWith(ENDPOINTS.markets.volume, { market_id: marketId }),
      { limit },
      signal,
    )
    return ok(toMarketPriceHistory(dto))
  }

  /**
   * GET /api/markets/:market_id — market + 100 history points in one call.
   *
   * Deliberately not merged with getMarketPriceHistory: that route answers
   * "how has this market moved" and takes a limit; this one answers "what IS
   * this market", and is the only route that returns a market by id at all.
   * A 404 here means the id has expired, which for 5-minute markets is routine.
   */
  async getMarketDetail(marketId: string, signal?: AbortSignal): Promise<ApiResult<MarketDetail>> {
    const dto = await apiGet<MarketDetailDTO>(
      endpointPathWith(ENDPOINTS.markets.detail, { market_id: marketId }),
      undefined,
      signal,
    )
    return ok(toMarketDetail(dto))
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

  // ── Phase 2 (2026-08-20) — quant surface ───────────────────────────────────
  // Six math-layer routes and three performance routes, all verified live on
  // 2026-08-20. `/math-layers/status` is the composite of the other five, so
  // prefer it when a page wants the whole picture; the per-layer routes exist
  // for pages that need only one and should not pay for the full ~3.9KB.

  async getMathLayersStatus(signal?: AbortSignal): Promise<ApiResult<MathLayersStatus>> {
    const dto = await apiGet<MathLayersStatusDTO>(endpointPath(ENDPOINTS.mathLayers.status), undefined, signal)
    return ok(toMathLayersStatus(dto))
  }

  async getMathRecommendations(signal?: AbortSignal): Promise<ApiResult<MathRecommendationsEnvelope>> {
    const dto = await apiGet<MathRecommendationsDTO>(endpointPath(ENDPOINTS.mathLayers.recommendations), undefined, signal)
    return ok(toMathRecommendations(dto))
  }

  async getMathKalman(signal?: AbortSignal): Promise<ApiResult<KalmanLayer>> {
    const dto = await apiGet<KalmanLayerDTO>(endpointPath(ENDPOINTS.mathLayers.kalman), undefined, signal)
    return ok(toKalmanLayer(dto))
  }

  async getMathBayesian(signal?: AbortSignal): Promise<ApiResult<BayesianLayer>> {
    // Per-layer routes wrap their payload in `state`; the composite /status
    // route inlines the same object. One adapter serves both.
    const dto = await apiGet<{ available: boolean; state: BayesianLayerDTO }>(
      endpointPath(ENDPOINTS.mathLayers.bayesian),
      undefined,
      signal,
    )
    return ok(toBayesianLayer(dto.state))
  }

  async getMathBrier(signal?: AbortSignal): Promise<ApiResult<BrierLayer>> {
    const dto = await apiGet<{ available: boolean; state: BrierLayerDTO }>(
      endpointPath(ENDPOINTS.mathLayers.brier),
      undefined,
      signal,
    )
    return ok(toBrierLayer(dto.state))
  }

  async getMathShapley(signal?: AbortSignal): Promise<ApiResult<ShapleyLayer>> {
    const dto = await apiGet<{ available: boolean; state: ShapleyLayerDTO }>(
      endpointPath(ENDPOINTS.mathLayers.shapley),
      undefined,
      signal,
    )
    return ok(toShapleyLayer(dto.state))
  }

  async getPerformanceByCategory(signal?: AbortSignal): Promise<ApiResult<PerformanceBuckets>> {
    const dto = await apiGet<PerformanceByCategoryDTO>(endpointPath(ENDPOINTS.performance.byCategory), undefined, signal)
    return ok(toPerformanceByCategory(dto))
  }

  async getPerformanceByAsset(signal?: AbortSignal): Promise<ApiResult<PerformanceBuckets>> {
    const dto = await apiGet<PerformanceByAssetDTO>(endpointPath(ENDPOINTS.performance.byAsset), undefined, signal)
    return ok(toPerformanceByAsset(dto))
  }

  async getKalmanMultiAsset(signal?: AbortSignal): Promise<ApiResult<KalmanLayer>> {
    const dto = await apiGet<KalmanMultiAssetDTO>(endpointPath(ENDPOINTS.performance.kalmanMultiAsset), undefined, signal)
    return ok(toKalmanMultiAsset(dto))
  }
}
