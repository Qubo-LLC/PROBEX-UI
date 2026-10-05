// Service interface + registry. After the M5 consolidation the cockpit consumes
// exactly one backend domain — the Quant Engine — so the registry holds a single
// service. Each method is async (the backend contract); each read also exposes an
// optional synchronous `peek*` that returns an immediate snapshot when one is
// available (the mock returns data; the live impl returns null → drives loading).

import type { ApiResult } from './response'
import type { LedgerPage, LedgerPageQuery } from '@/types/ledger'

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
  MarketsSummary, MarketPriceHistory, MarketDetail, MutationResult,
} from '@/types/engine'

import type {
  MathLayersStatus, MathRecommendationsEnvelope, KalmanLayer,
  BayesianLayer, BrierLayer, ShapleyLayer, PerformanceBuckets,
} from '@/types/quant'

// ─── Query-parameter vocabularies ──────────────────────────────────────────────
// Documented by the backend collection; enumerated here so callers can't send a
// value the engine will reject.

export type AnalyticsSegmentType = 'edge_bucket' | 'hour' | 'confidence'
export type AnalyticsMetric      = 'win_rate' | 'total_pnl' | 'total_trades'

// ─── Mutation payloads ─────────────────────────────────────────────────────────

/** Body for POST /api/execution/create (shape from the Postman collection). */
export interface CreateOrderInput {
  marketId:     string
  direction:    'YES' | 'NO'
  sizeUsd:      number
  edgePct:      number
  confidence:   number
  /** When true the engine validates and reports without placing the order. */
  previewOnly?: boolean
}

// ─── Engine ────────────────────────────────────────────────────────────────────
// Operational endpoints confirmed against the Postman collection.
// /health and / are served at the host root (not under /api) — their live
// implementations use apiGetHost(); all others use apiGet() against the /api base.

export interface IEngineService {
  getHealth(signal?: AbortSignal): Promise<ApiResult<EngineHealth>>
  getRuntime(signal?: AbortSignal): Promise<ApiResult<EngineRuntime>>
  getStats(signal?: AbortSignal): Promise<ApiResult<EngineStats>>
  getConfig(signal?: AbortSignal): Promise<ApiResult<EngineConfig>>
  getSurvival(signal?: AbortSignal): Promise<ApiResult<SurvivalStatus>>
  getPriceHistory(signal?: AbortSignal): Promise<ApiResult<PriceHistory>>
  getMarkets(signal?: AbortSignal): Promise<ApiResult<EngineMarkets>>
  getPositions(signal?: AbortSignal): Promise<ApiResult<EnginePositions>>
  /** `types` maps to the server-side `type` CSV filter (edge, trade, position,
   *  health, error, resolution, survival, paper_trading). */
  getEvents(limit?: number, types?: readonly string[], signal?: AbortSignal): Promise<ApiResult<EngineEvents>>
  getEdges(limit?: number, signal?: AbortSignal): Promise<ApiResult<EngineEdges>>
  getIdentity(signal?: AbortSignal): Promise<ApiResult<EngineIdentity>>
  getExecutionStatus(signal?: AbortSignal): Promise<ApiResult<ExecutionStatus>>
  getExecutionPolicy(signal?: AbortSignal): Promise<ApiResult<ExecutionPolicy>>
  getExecutionTrades(signal?: AbortSignal): Promise<ApiResult<ExecutionTrades>>
  getPaperStats(signal?: AbortSignal): Promise<ApiResult<PaperStats>>

  // ── Phase 3 (2026-07-22 redeploy) — 20 newly-live endpoints ────────────────
  getPositionsHistory(limit?: number, direction?: 'YES' | 'NO', signal?: AbortSignal): Promise<ApiResult<PositionsHistory>>
  getSurvivalPatterns(signal?: AbortSignal): Promise<ApiResult<SurvivalPatterns>>
  getConsensus(signal?: AbortSignal): Promise<ApiResult<Consensus>>
  getConsensusBias(signal?: AbortSignal): Promise<ApiResult<ConsensusBias>>
  getConsensusHistory(limit?: number, signal?: AbortSignal): Promise<ApiResult<ConsensusHistory>>
  getResearchReports(signal?: AbortSignal): Promise<ApiResult<ResearchReports>>
  getPortfolio(signal?: AbortSignal): Promise<ApiResult<Portfolio>>
  getBalance(signal?: AbortSignal): Promise<ApiResult<Balance>>
  getPortfolioHistory(limit?: number, signal?: AbortSignal): Promise<ApiResult<PortfolioHistory>>
  getPortfolioSummary(signal?: AbortSignal): Promise<ApiResult<PortfolioSummary>>
  getPortfolioPerformance(lookbackHours?: number, signal?: AbortSignal): Promise<ApiResult<PortfolioPerformance>>
  getAnalyticsSegments(segmentType?: AnalyticsSegmentType, signal?: AbortSignal): Promise<ApiResult<AnalyticsSegments>>
  getAnalyticsSignals(signal?: AbortSignal): Promise<ApiResult<AnalyticsSignals>>
  getAnalyticsSummary(signal?: AbortSignal): Promise<ApiResult<AnalyticsSummary>>
  /** segment_type and metric are REQUIRED by the backend — omitting them 422s. */
  getAnalyticsTopSegments(segmentType?: AnalyticsSegmentType, metric?: AnalyticsMetric, limit?: number, signal?: AbortSignal): Promise<ApiResult<AnalyticsTopSegments>>
  getAnalyticsHourly(signal?: AbortSignal): Promise<ApiResult<AnalyticsHourly>>
  getPaperStatus(signal?: AbortSignal): Promise<ApiResult<PaperStatus>>
  getSystemMetrics(signal?: AbortSignal): Promise<ApiResult<SystemMetrics>>
  getTradesLedger(limit?: number, direction?: 'YES' | 'NO', signal?: AbortSignal): Promise<ApiResult<TradesLedger>>
  /**
   * One page of trade records, for the Trade Ledger and position history
   * views (remediation phase 2). Sends `before_seq` / `status` only when the
   * caller asks; the deployed engine ignores them and returns a capped page,
   * which `LedgerPage.paging.kind === 'capped'` reports.
   */
  getLedgerPage(source: 'ledger' | 'history', query: LedgerPageQuery, signal?: AbortSignal): Promise<ApiResult<LedgerPage>>
  getExecutionOrders(status?: 'active' | 'closed', signal?: AbortSignal): Promise<ApiResult<ExecutionOrders>>
  /** Order lookup by id. `scope` picks the active/closed variant of the route. */
  getOrderById(orderId: string, scope?: 'any' | 'active' | 'closed', signal?: AbortSignal): Promise<ApiResult<unknown>>

  // ── Phase 1 (2026-07-25) — markets recovery + per-market history ───────────
  /** Primary markets source while GET /api/markets hangs. */
  getMarketsSummary(signal?: AbortSignal): Promise<ApiResult<MarketsSummary>>
  getMarketPriceHistory(marketId: string, limit?: number, signal?: AbortSignal): Promise<ApiResult<MarketPriceHistory>>

  // ── 2026-09-07 — single-market detail ──────────────────────────────────────
  /**
   * GET /api/markets/:market_id — the market plus its own price history in one
   * response. Re-confirmed live 2026-09-07 after six weeks marked broken.
   *
   * Rejects with NOT_FOUND for an expired id, which is a routine outcome for
   * 5-minute markets and not a fault — callers should present it as "no longer
   * active", not as an error.
   */
  getMarketDetail(marketId: string, signal?: AbortSignal): Promise<ApiResult<MarketDetail>>

  // ── Phase 1 (2026-07-25) — mutation layer ──────────────────────────────────
  // Every one of these changes engine state. Callers must confirm with the
  // operator first; the services themselves do no gating.
  createOrder(input: CreateOrderInput): Promise<ApiResult<MutationResult>>
  closePosition(marketId: string):      Promise<ApiResult<MutationResult>>
  cancelOrder(orderId: string):         Promise<ApiResult<MutationResult>>
  emergencyStop():                      Promise<ApiResult<MutationResult>>
  startPaperTrading():                  Promise<ApiResult<MutationResult>>
  stopPaperTrading():                   Promise<ApiResult<MutationResult>>
  /** DESTRUCTIVE — clears all paper trading history. */
  resetPaperTrading():                  Promise<ApiResult<MutationResult>>
  resolvePaperTrades():                 Promise<ApiResult<MutationResult>>

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
  peekMarketsSummary?():       MarketsSummary | null

  // ── Phase 2 (2026-08-20) — quant surface ───────────────────────────────────
  // The five mathematical layers plus the multi-asset performance endpoints,
  // discovered in the attached collection and verified live. Every one of these
  // returns numbers even when the engine has learned nothing, so the domain
  // models carry explicit `has*`/`initialised` flags — see types/quant.ts.
  getMathLayersStatus(signal?: AbortSignal): Promise<ApiResult<MathLayersStatus>>
  getMathRecommendations(signal?: AbortSignal): Promise<ApiResult<MathRecommendationsEnvelope>>
  getMathKalman(signal?: AbortSignal): Promise<ApiResult<KalmanLayer>>
  getMathBayesian(signal?: AbortSignal): Promise<ApiResult<BayesianLayer>>
  getMathBrier(signal?: AbortSignal): Promise<ApiResult<BrierLayer>>
  getMathShapley(signal?: AbortSignal): Promise<ApiResult<ShapleyLayer>>
  getPerformanceByCategory(signal?: AbortSignal): Promise<ApiResult<PerformanceBuckets>>
  getPerformanceByAsset(signal?: AbortSignal): Promise<ApiResult<PerformanceBuckets>>
  getKalmanMultiAsset(signal?: AbortSignal): Promise<ApiResult<KalmanLayer>>

  peekMathLayersStatus?():        MathLayersStatus | null
  peekMathRecommendations?():     MathRecommendationsEnvelope | null
  peekMathKalman?():              KalmanLayer | null
  peekMathBayesian?():            BayesianLayer | null
  peekMathBrier?():               BrierLayer | null
  peekMathShapley?():             ShapleyLayer | null
  peekPerformanceByCategory?():   PerformanceBuckets | null
  peekPerformanceByAsset?():      PerformanceBuckets | null
  peekKalmanMultiAsset?():        KalmanLayer | null
}

// ─── Registry shape ────────────────────────────────────────────────────────────

export interface ServiceRegistry {
  engine: IEngineService
}
