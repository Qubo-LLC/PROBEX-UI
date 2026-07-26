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
  MarketsSummary, MarketPriceHistory, MutationResult,
} from '@/types/engine'

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
  getHealth():             Promise<ApiResult<EngineHealth>>
  getRuntime():            Promise<ApiResult<EngineRuntime>>
  getStats():              Promise<ApiResult<EngineStats>>
  getConfig():             Promise<ApiResult<EngineConfig>>
  getSurvival():           Promise<ApiResult<SurvivalStatus>>
  getPriceHistory():       Promise<ApiResult<PriceHistory>>
  getMarkets():            Promise<ApiResult<EngineMarkets>>
  getPositions():          Promise<ApiResult<EnginePositions>>
  /** `types` maps to the server-side `type` CSV filter (edge, trade, position,
   *  health, error, resolution, survival, paper_trading). */
  getEvents(limit?: number, types?: readonly string[]): Promise<ApiResult<EngineEvents>>
  getEdges(limit?: number): Promise<ApiResult<EngineEdges>>
  getIdentity():           Promise<ApiResult<EngineIdentity>>
  getExecutionStatus():    Promise<ApiResult<ExecutionStatus>>
  getExecutionPolicy():    Promise<ApiResult<ExecutionPolicy>>
  getExecutionTrades():    Promise<ApiResult<ExecutionTrades>>
  getPaperStats():         Promise<ApiResult<PaperStats>>

  // ── Phase 3 (2026-07-22 redeploy) — 20 newly-live endpoints ────────────────
  getPositionsHistory(limit?: number, direction?: 'YES' | 'NO'): Promise<ApiResult<PositionsHistory>>
  getSurvivalPatterns():      Promise<ApiResult<SurvivalPatterns>>
  getConsensus():             Promise<ApiResult<Consensus>>
  getConsensusBias():         Promise<ApiResult<ConsensusBias>>
  getConsensusHistory(limit?: number): Promise<ApiResult<ConsensusHistory>>
  getResearchReports():       Promise<ApiResult<ResearchReports>>
  getPortfolio():             Promise<ApiResult<Portfolio>>
  getBalance():               Promise<ApiResult<Balance>>
  getPortfolioHistory(limit?: number): Promise<ApiResult<PortfolioHistory>>
  getPortfolioSummary():      Promise<ApiResult<PortfolioSummary>>
  getPortfolioPerformance(lookbackHours?: number): Promise<ApiResult<PortfolioPerformance>>
  getAnalyticsSegments(segmentType?: AnalyticsSegmentType): Promise<ApiResult<AnalyticsSegments>>
  getAnalyticsSignals():      Promise<ApiResult<AnalyticsSignals>>
  getAnalyticsSummary():      Promise<ApiResult<AnalyticsSummary>>
  /** segment_type and metric are REQUIRED by the backend — omitting them 422s. */
  getAnalyticsTopSegments(segmentType?: AnalyticsSegmentType, metric?: AnalyticsMetric, limit?: number): Promise<ApiResult<AnalyticsTopSegments>>
  getAnalyticsHourly():       Promise<ApiResult<AnalyticsHourly>>
  getPaperStatus():           Promise<ApiResult<PaperStatus>>
  getSystemMetrics():         Promise<ApiResult<SystemMetrics>>
  getTradesLedger(limit?: number, direction?: 'YES' | 'NO'): Promise<ApiResult<TradesLedger>>
  getExecutionOrders(status?: 'active' | 'closed'): Promise<ApiResult<ExecutionOrders>>
  /** Order lookup by id. `scope` picks the active/closed variant of the route. */
  getOrderById(orderId: string, scope?: 'any' | 'active' | 'closed'): Promise<ApiResult<unknown>>

  // ── Phase 1 (2026-07-25) — markets recovery + per-market history ───────────
  /** Primary markets source while GET /api/markets hangs. */
  getMarketsSummary():        Promise<ApiResult<MarketsSummary>>
  getMarketPriceHistory(marketId: string, limit?: number): Promise<ApiResult<MarketPriceHistory>>

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
}

// ─── Registry shape ────────────────────────────────────────────────────────────

export interface ServiceRegistry {
  engine: IEngineService
}
