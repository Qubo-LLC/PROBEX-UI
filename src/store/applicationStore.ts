// Central ApplicationState store — the single source of truth for all engine
// endpoint data. Populated exclusively by ApplicationStateLoader (mounted once
// in DashboardLayout). All hooks that need engine data read from here;
// none of them issue their own fetch calls.
//
// In mock mode the store is populated with mock engine data (MockEngineService),
// but mapped hooks check env.API_MODE and fall back to mock admin services
// instead of reading the store — so mock mode is unaffected.

import { create } from 'zustand'
import { loadingState, type ServiceState } from '@/lib/services/response'
import type {
  EngineHealth,
  EngineRuntime,
  EngineStats,
  EngineConfig,
  SurvivalStatus,
  PriceHistory,
  EngineMarkets,
  EnginePositions,
  EngineEvents,
  EngineEdges,
  EngineIdentity,
  ExecutionStatus,
  ExecutionPolicy,
  PaperStats,
  PositionsHistory,
  SurvivalPatterns,
  Consensus,
  ConsensusBias,
  ConsensusHistory,
  ResearchReports,
  Balance,
  Portfolio,
  PortfolioHistory,
  PortfolioSummary,
  AnalyticsSignals,
  AnalyticsSummary,
  AnalyticsTopSegments,
  AnalyticsHourly,
  PaperStatus,
  SystemMetrics,
  TradesLedger,
  ExecutionOrders,
} from '@/types/engine'
import type {
  MathLayersStatus,
  MathRecommendationsEnvelope,
  PerformanceBuckets,
} from '@/types/quant'

// ─── Per-endpoint state map ───────────────────────────────────────────────────

export interface EngineEndpoints {
  health:       ServiceState<EngineHealth>
  runtime:      ServiceState<EngineRuntime>
  stats:        ServiceState<EngineStats>
  config:       ServiceState<EngineConfig>
  survival:     ServiceState<SurvivalStatus>
  priceHistory: ServiceState<PriceHistory>
  markets:      ServiceState<EngineMarkets>
  positions:    ServiceState<EnginePositions>
  events:       ServiceState<EngineEvents>
  edges:        ServiceState<EngineEdges>
  identity:        ServiceState<EngineIdentity>
  executionStatus: ServiceState<ExecutionStatus>
  executionPolicy: ServiceState<ExecutionPolicy>
  paperStats:      ServiceState<PaperStats>

  // Phase 3 (2026-07-22 redeploy) — 20 newly-live endpoints
  /** /api/portfolio — the PERSISTED capital snapshot. Distinct from
   *  executionStatus, which is process-scoped and resets on engine restart. */
  portfolio:            ServiceState<Portfolio>
  positionsHistory:     ServiceState<PositionsHistory>
  survivalPatterns:     ServiceState<SurvivalPatterns>
  consensus:            ServiceState<Consensus>
  consensusBias:        ServiceState<ConsensusBias>
  consensusHistory:     ServiceState<ConsensusHistory>
  researchReports:      ServiceState<ResearchReports>
  balance:              ServiceState<Balance>
  portfolioHistory:     ServiceState<PortfolioHistory>
  portfolioSummary:     ServiceState<PortfolioSummary>
  analyticsSignals:     ServiceState<AnalyticsSignals>
  analyticsSummary:     ServiceState<AnalyticsSummary>
  analyticsTopSegments: ServiceState<AnalyticsTopSegments>
  analyticsHourly:      ServiceState<AnalyticsHourly>
  paperStatus:          ServiceState<PaperStatus>
  systemMetrics:        ServiceState<SystemMetrics>
  tradesLedger:         ServiceState<TradesLedger>
  executionOrders:      ServiceState<ExecutionOrders>

  // Quant surface (2026-08-20). `mathLayersStatus` is the composite of all five
  // layers, so the per-layer routes are deliberately NOT stored — a page that
  // needs one layer alone fetches it directly (see useServices.ts).
  mathLayersStatus:     ServiceState<MathLayersStatus>
  mathRecommendations:  ServiceState<MathRecommendationsEnvelope>
  performanceByCategory: ServiceState<PerformanceBuckets>
  performanceByAsset:   ServiceState<PerformanceBuckets>
}

// ─── Store shape ─────────────────────────────────────────────────────────────

interface ApplicationStore {
  /** Live ServiceState<T> for each engine endpoint. */
  engine:        EngineEndpoints
  /**
   * Epoch ms of the most recent SUCCESSFUL refresh; null until the first one.
   *
   * ─── Why not "the most recent store write" ─────────────────────────────────
   * It was, and that made the top-nav heartbeat lie. `updateEngine` is called
   * on every state transition — including the transition that marks a slice
   * STALE because its refresh just failed. So a cockpit whose backend had gone
   * away kept writing to the store, kept bumping this value, and kept
   * displaying "Updated just now" beside panels that were simultaneously
   * reporting "Stale · 29s ago".
   *
   * Caught in end-to-end fault injection on 2026-09-07, not by a unit test: the
   * two components were individually correct and disagreed only once they were
   * on screen together.
   *
   * It now advances only when a slice actually came back fresh, which is what
   * every consumer already assumed it meant.
   */
  lastRefreshed: number | null
  /** Merge a partial endpoint update into the store. */
  updateEngine:  (updates: Partial<EngineEndpoints>) => void
}

/**
 * Did this batch contain at least one genuinely fresh response?
 *
 * A slice qualifies when it holds data and is not stale. `loading` and `error`
 * do not count (nothing arrived), and neither does a stale slice — that is the
 * absence of a refresh, which is the whole point.
 */
function hasFreshUpdate(updates: Partial<EngineEndpoints>): boolean {
  return Object.values(updates).some(
    (slice) =>
      slice !== undefined &&
      (slice.status === 'success' || slice.status === 'empty') &&
      !slice.isStale,
  )
}

// ─── Initial state (all endpoints start as 'loading') ────────────────────────

const initialEndpoints: EngineEndpoints = {
  health:       loadingState<EngineHealth>(),
  runtime:      loadingState<EngineRuntime>(),
  stats:        loadingState<EngineStats>(),
  config:       loadingState<EngineConfig>(),
  survival:     loadingState<SurvivalStatus>(),
  priceHistory: loadingState<PriceHistory>(),
  markets:      loadingState<EngineMarkets>(),
  positions:    loadingState<EnginePositions>(),
  events:       loadingState<EngineEvents>(),
  edges:        loadingState<EngineEdges>(),
  identity:        loadingState<EngineIdentity>(),
  executionStatus: loadingState<ExecutionStatus>(),
  executionPolicy: loadingState<ExecutionPolicy>(),
  paperStats:      loadingState<PaperStats>(),

  portfolio:            loadingState<Portfolio>(),
  positionsHistory:     loadingState<PositionsHistory>(),
  survivalPatterns:     loadingState<SurvivalPatterns>(),
  consensus:            loadingState<Consensus>(),
  consensusBias:        loadingState<ConsensusBias>(),
  consensusHistory:     loadingState<ConsensusHistory>(),
  researchReports:      loadingState<ResearchReports>(),
  balance:              loadingState<Balance>(),
  portfolioHistory:     loadingState<PortfolioHistory>(),
  portfolioSummary:     loadingState<PortfolioSummary>(),
  analyticsSignals:     loadingState<AnalyticsSignals>(),
  analyticsSummary:     loadingState<AnalyticsSummary>(),
  analyticsTopSegments: loadingState<AnalyticsTopSegments>(),
  analyticsHourly:      loadingState<AnalyticsHourly>(),
  paperStatus:          loadingState<PaperStatus>(),
  systemMetrics:        loadingState<SystemMetrics>(),
  tradesLedger:         loadingState<TradesLedger>(),
  executionOrders:      loadingState<ExecutionOrders>(),

  mathLayersStatus:      loadingState<MathLayersStatus>(),
  mathRecommendations:   loadingState<MathRecommendationsEnvelope>(),
  performanceByCategory: loadingState<PerformanceBuckets>(),
  performanceByAsset:    loadingState<PerformanceBuckets>(),
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useApplicationStore = create<ApplicationStore>((set) => ({
  engine:        initialEndpoints,
  lastRefreshed: null,
  updateEngine:  (updates) =>
    set((prev) => ({
      engine:        { ...prev.engine, ...updates },
      // Held at its previous value when nothing actually refreshed, so
      // "last updated" stays true rather than tracking store activity.
      lastRefreshed: hasFreshUpdate(updates) ? Date.now() : prev.lastRefreshed,
    })),
}))
