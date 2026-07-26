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
}

// ─── Store shape ─────────────────────────────────────────────────────────────

interface ApplicationStore {
  /** Live ServiceState<T> for each engine endpoint. */
  engine:        EngineEndpoints
  /** Epoch ms of the most recent store write; null until first update. */
  lastRefreshed: number | null
  /** Merge a partial endpoint update into the store. */
  updateEngine:  (updates: Partial<EngineEndpoints>) => void
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
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useApplicationStore = create<ApplicationStore>((set) => ({
  engine:        initialEndpoints,
  lastRefreshed: null,
  updateEngine:  (updates) =>
    set((prev) => ({
      engine:        { ...prev.engine, ...updates },
      lastRefreshed: Date.now(),
    })),
}))
