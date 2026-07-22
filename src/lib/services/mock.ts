// Mock engine service — backs mock mode (NEXT_PUBLIC_API_MODE=mock) and seeds
// the synchronous-first hooks via peek* so the UI never flashes a loading state.
// The live implementation swaps in behind the same registry (see index.ts).

import { ok, type ApiResult } from './response'
import type { IEngineService, ServiceRegistry } from './interfaces'
import {
  MOCK_ENGINE_HEALTH, MOCK_ENGINE_RUNTIME, MOCK_ENGINE_STATS,
  MOCK_ENGINE_CONFIG, MOCK_SURVIVAL_STATUS, MOCK_PRICE_HISTORY,
  MOCK_ENGINE_MARKETS, MOCK_ENGINE_POSITIONS, MOCK_ENGINE_EVENTS, MOCK_ENGINE_EDGES,
  MOCK_ENGINE_IDENTITY, MOCK_EXECUTION_STATUS,
  MOCK_EXECUTION_POLICY, MOCK_EXECUTION_TRADES, MOCK_PAPER_STATS,
  MOCK_POSITIONS_HISTORY, MOCK_SURVIVAL_PATTERNS,
  MOCK_CONSENSUS, MOCK_CONSENSUS_BIAS, MOCK_CONSENSUS_HISTORY,
  MOCK_RESEARCH_REPORTS, MOCK_PORTFOLIO, MOCK_BALANCE, MOCK_PORTFOLIO_HISTORY, MOCK_PORTFOLIO_SUMMARY, MOCK_PORTFOLIO_PERFORMANCE,
  MOCK_ANALYTICS_SEGMENTS, MOCK_ANALYTICS_SIGNALS, MOCK_ANALYTICS_SUMMARY, MOCK_ANALYTICS_TOP_SEGMENTS, MOCK_ANALYTICS_HOURLY,
  MOCK_PAPER_STATUS, MOCK_SYSTEM_METRICS, MOCK_TRADES_LEDGER, MOCK_EXECUTION_ORDERS,
} from '@/mock/engine'
import type {
  EngineHealth, EngineRuntime, EngineStats, EngineConfig, SurvivalStatus, PriceHistory,
  EngineMarkets, EnginePositions, EngineEvents, EngineEdges,
  EngineIdentity, ExecutionStatus,
  ExecutionPolicy, ExecutionTrades, PaperStats,
  PositionsHistory, SurvivalPatterns,
  Consensus, ConsensusBias, ConsensusHistory,
  ResearchReports, Portfolio, Balance, PortfolioHistory, PortfolioSummary, PortfolioPerformance,
  AnalyticsSegments, AnalyticsSignals, AnalyticsSummary, AnalyticsTopSegments, AnalyticsHourly,
  PaperStatus, SystemMetrics, TradesLedger, ExecutionOrders,
} from '@/types/engine'

class MockEngineService implements IEngineService {
  peekHealth():          EngineHealth    { return MOCK_ENGINE_HEALTH }
  peekRuntime():         EngineRuntime   { return MOCK_ENGINE_RUNTIME }
  peekStats():           EngineStats     { return MOCK_ENGINE_STATS }
  peekConfig():          EngineConfig    { return MOCK_ENGINE_CONFIG }
  peekSurvival():        SurvivalStatus  { return MOCK_SURVIVAL_STATUS }
  peekPriceHistory():    PriceHistory    { return MOCK_PRICE_HISTORY }
  peekMarkets():         EngineMarkets   { return MOCK_ENGINE_MARKETS }
  peekPositions():       EnginePositions { return MOCK_ENGINE_POSITIONS }
  peekEvents():          EngineEvents    { return MOCK_ENGINE_EVENTS }
  peekEdges():           EngineEdges     { return MOCK_ENGINE_EDGES }
  peekIdentity():        EngineIdentity  { return MOCK_ENGINE_IDENTITY }
  peekExecutionStatus(): ExecutionStatus { return MOCK_EXECUTION_STATUS }
  peekExecutionPolicy(): ExecutionPolicy { return MOCK_EXECUTION_POLICY }
  peekExecutionTrades(): ExecutionTrades { return MOCK_EXECUTION_TRADES }
  peekPaperStats():      PaperStats      { return MOCK_PAPER_STATS }

  peekPositionsHistory():     PositionsHistory     { return MOCK_POSITIONS_HISTORY }
  peekSurvivalPatterns():     SurvivalPatterns     { return MOCK_SURVIVAL_PATTERNS }
  peekConsensus():            Consensus            { return MOCK_CONSENSUS }
  peekConsensusBias():        ConsensusBias        { return MOCK_CONSENSUS_BIAS }
  peekConsensusHistory():     ConsensusHistory     { return MOCK_CONSENSUS_HISTORY }
  peekResearchReports():      ResearchReports      { return MOCK_RESEARCH_REPORTS }
  peekPortfolio():            Portfolio            { return MOCK_PORTFOLIO }
  peekBalance():              Balance              { return MOCK_BALANCE }
  peekPortfolioHistory():     PortfolioHistory     { return MOCK_PORTFOLIO_HISTORY }
  peekPortfolioSummary():     PortfolioSummary     { return MOCK_PORTFOLIO_SUMMARY }
  peekPortfolioPerformance(): PortfolioPerformance { return MOCK_PORTFOLIO_PERFORMANCE }
  peekAnalyticsSegments():    AnalyticsSegments    { return MOCK_ANALYTICS_SEGMENTS }
  peekAnalyticsSignals():     AnalyticsSignals     { return MOCK_ANALYTICS_SIGNALS }
  peekAnalyticsSummary():     AnalyticsSummary     { return MOCK_ANALYTICS_SUMMARY }
  peekAnalyticsTopSegments(): AnalyticsTopSegments { return MOCK_ANALYTICS_TOP_SEGMENTS }
  peekAnalyticsHourly():      AnalyticsHourly      { return MOCK_ANALYTICS_HOURLY }
  peekPaperStatus():          PaperStatus          { return MOCK_PAPER_STATUS }
  peekSystemMetrics():        SystemMetrics        { return MOCK_SYSTEM_METRICS }
  peekTradesLedger():         TradesLedger         { return MOCK_TRADES_LEDGER }
  peekExecutionOrders():      ExecutionOrders      { return MOCK_EXECUTION_ORDERS }

  async getHealth():          Promise<ApiResult<EngineHealth>>    { return ok(MOCK_ENGINE_HEALTH) }
  async getRuntime():         Promise<ApiResult<EngineRuntime>>   { return ok(MOCK_ENGINE_RUNTIME) }
  async getStats():           Promise<ApiResult<EngineStats>>     { return ok(MOCK_ENGINE_STATS) }
  async getConfig():          Promise<ApiResult<EngineConfig>>    { return ok(MOCK_ENGINE_CONFIG) }
  async getSurvival():        Promise<ApiResult<SurvivalStatus>>  { return ok(MOCK_SURVIVAL_STATUS) }
  async getPriceHistory():    Promise<ApiResult<PriceHistory>>    { return ok(MOCK_PRICE_HISTORY) }
  async getMarkets():         Promise<ApiResult<EngineMarkets>>   { return ok(MOCK_ENGINE_MARKETS) }
  async getPositions():       Promise<ApiResult<EnginePositions>> { return ok(MOCK_ENGINE_POSITIONS) }
  async getEvents():          Promise<ApiResult<EngineEvents>>    { return ok(MOCK_ENGINE_EVENTS) }
  async getEdges():           Promise<ApiResult<EngineEdges>>     { return ok(MOCK_ENGINE_EDGES) }
  async getIdentity():        Promise<ApiResult<EngineIdentity>>  { return ok(MOCK_ENGINE_IDENTITY) }
  async getExecutionStatus(): Promise<ApiResult<ExecutionStatus>> { return ok(MOCK_EXECUTION_STATUS) }
  async getExecutionPolicy(): Promise<ApiResult<ExecutionPolicy>> { return ok(MOCK_EXECUTION_POLICY) }
  async getExecutionTrades(): Promise<ApiResult<ExecutionTrades>> { return ok(MOCK_EXECUTION_TRADES) }
  async getPaperStats():      Promise<ApiResult<PaperStats>>      { return ok(MOCK_PAPER_STATS) }

  async getPositionsHistory():     Promise<ApiResult<PositionsHistory>>     { return ok(MOCK_POSITIONS_HISTORY) }
  async getSurvivalPatterns():     Promise<ApiResult<SurvivalPatterns>>     { return ok(MOCK_SURVIVAL_PATTERNS) }
  async getConsensus():            Promise<ApiResult<Consensus>>            { return ok(MOCK_CONSENSUS) }
  async getConsensusBias():        Promise<ApiResult<ConsensusBias>>        { return ok(MOCK_CONSENSUS_BIAS) }
  async getConsensusHistory():     Promise<ApiResult<ConsensusHistory>>     { return ok(MOCK_CONSENSUS_HISTORY) }
  async getResearchReports():      Promise<ApiResult<ResearchReports>>      { return ok(MOCK_RESEARCH_REPORTS) }
  async getPortfolio():            Promise<ApiResult<Portfolio>>            { return ok(MOCK_PORTFOLIO) }
  async getBalance():              Promise<ApiResult<Balance>>              { return ok(MOCK_BALANCE) }
  async getPortfolioHistory():     Promise<ApiResult<PortfolioHistory>>     { return ok(MOCK_PORTFOLIO_HISTORY) }
  async getPortfolioSummary():     Promise<ApiResult<PortfolioSummary>>     { return ok(MOCK_PORTFOLIO_SUMMARY) }
  async getPortfolioPerformance(): Promise<ApiResult<PortfolioPerformance>> { return ok(MOCK_PORTFOLIO_PERFORMANCE) }
  async getAnalyticsSegments():    Promise<ApiResult<AnalyticsSegments>>    { return ok(MOCK_ANALYTICS_SEGMENTS) }
  async getAnalyticsSignals():     Promise<ApiResult<AnalyticsSignals>>     { return ok(MOCK_ANALYTICS_SIGNALS) }
  async getAnalyticsSummary():     Promise<ApiResult<AnalyticsSummary>>     { return ok(MOCK_ANALYTICS_SUMMARY) }
  async getAnalyticsTopSegments(): Promise<ApiResult<AnalyticsTopSegments>> { return ok(MOCK_ANALYTICS_TOP_SEGMENTS) }
  async getAnalyticsHourly():      Promise<ApiResult<AnalyticsHourly>>      { return ok(MOCK_ANALYTICS_HOURLY) }
  async getPaperStatus():          Promise<ApiResult<PaperStatus>>          { return ok(MOCK_PAPER_STATUS) }
  async getSystemMetrics():        Promise<ApiResult<SystemMetrics>>        { return ok(MOCK_SYSTEM_METRICS) }
  async getTradesLedger():         Promise<ApiResult<TradesLedger>>         { return ok(MOCK_TRADES_LEDGER) }
  async getExecutionOrders():      Promise<ApiResult<ExecutionOrders>>      { return ok(MOCK_EXECUTION_ORDERS) }
}

export const mockServices: ServiceRegistry = {
  engine: new MockEngineService(),
}
