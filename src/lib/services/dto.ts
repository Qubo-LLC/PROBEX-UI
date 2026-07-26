// Backend DTO → domain adapters — the single translation point between the
// engine's snake_case wire shapes and the app's camelCase domain types. Live
// services receive DTOs and call these; the mock returns domain shapes directly.
//
// Wire conventions:
//   • Entity timestamps are ISO 8601 strings → normalized to epoch ms here
//   • Money is USD floats; percentages arrive as the backend sends them

import { APP_NAME, APP_VERSION } from '@/config/constants'
import type {
  EngineHealthDTO, HealthComponentDTO, RuntimeComponentsDTO,
  EngineRuntimeDTO, EngineStatsDTO, EngineConfigDTO, SurvivalDTO, PriceHistoryDTO,
  EngineMarketsDTO, EnginePositionsDTO, EngineEventsDTO, EngineEdgesDTO,
  EngineIdentityDTO, ExecutionStatusDTO, RateLimitBucketDTO,
  ExecutionPolicyDTO, ExecutionTradesDTO, PaperStatsDTO, BucketPerformanceStatDTO,
  EngineHealth, HealthComponent, RuntimeComponents, EngineRuntime, EngineStats,
  EngineConfig, SurvivalStatus, PriceHistory,
  EngineMarkets, EnginePositions, EngineEvents, EngineEdges,
  EngineIdentity, ExecutionStatus, RateLimitBucket,
  ExecutionPolicy, ExecutionTrades, PaperStats, BucketPerformanceStat,
  EngineHealthStatus, SurvivalState, EngineMode,
  PositionsHistoryDTO, PositionsHistory,
  SurvivalPatternsDTO, SurvivalPatterns, SurvivalPatternItemDTO, SurvivalPatternItem,
  ConsensusDTO, Consensus, ConsensusBiasDTO, ConsensusBias,
  ConsensusHistoryDTO, ConsensusHistory,
  ResearchReportsDTO, ResearchReports,
  PortfolioDTO, Portfolio, BalanceDTO, Balance,
  PortfolioHistoryDTO, PortfolioHistory, PortfolioSummaryDTO, PortfolioSummary,
  PortfolioPerformanceDTO, PortfolioPerformance,
  AnalyticsSegmentsDTO, AnalyticsSegments, AnalyticsSignalsDTO, AnalyticsSignals,
  AnalyticsSummaryDTO, AnalyticsSummary, AnalyticsTopSegmentsDTO, AnalyticsTopSegments,
  AnalyticsHourlyDTO, AnalyticsHourly,
  PaperStatusDTO, PaperStatus, SystemMetricsDTO, SystemMetrics,
  TradesLedgerDTO, TradesLedger, ExecutionOrdersDTO, ExecutionOrders,
  MarketsSummaryDTO, MarketsSummary, MarketSummaryItemDTO, MarketSummaryItem,
  MarketPriceHistoryDTO, MarketPriceHistory, MarketHistoryPointDTO, MarketHistoryPoint,
  SettledTradeDTO, SettledTrade,
  MutationResultDTO, MutationResult,
} from '@/types/engine'

/** win_rate is 0–100 on the wire everywhere; normalize to 0–1 so all domain
 *  winRates share one convention. */
const pctToFraction = (pct: number): number => pct / 100

// ─── Time normalization ─────────────────────────────────────────────────────────

export const isoToMs = (iso: string): number => new Date(iso).getTime()
export const msToIso = (ms: number): string => new Date(ms).toISOString()

// ─── Engine shared helpers ────────────────────────────────────────────────────

function toHealthComponent(dto: HealthComponentDTO): HealthComponent {
  return {
    name:      dto.name,
    healthy:   dto.healthy,
    message:   dto.message,
    latencyMs: dto.latency_ms,
    checkedAt: isoToMs(dto.checked_at),
  }
}

function toRuntimeComponents(dto: RuntimeComponentsDTO): RuntimeComponents {
  return {
    bot:               dto.bot,
    clobClient:        dto.clob_client,
    executionEngine:   dto.execution_engine,
    marketFetcher:     dto.market_fetcher,
    resolutionTracker: dto.resolution_tracker,
    pnlCalculator:     dto.pnl_calculator,
    telegramAlerter:   dto.telegram_alerter,
    healthMonitor:     dto.health_monitor,
    survivalBrain:     dto.survival_brain,
    paperTrader:       dto.paper_trader,
    consensusEngine:   dto.consensus_engine,
    marketHistory:     dto.market_history,
    portfolioTracker:  dto.portfolio_tracker,
    analyticsEngine:   dto.analytics_engine,
  }
}

// ─── /health ─────────────────────────────────────────────────────────────────

export function toEngineHealth(dto: EngineHealthDTO): EngineHealth {
  return {
    status:          dto.status as EngineHealthStatus,
    components:      dto.components.map(toHealthComponent),
    checkDurationMs: dto.check_duration_ms,
    uptimeSeconds:   dto.uptime_seconds,
    stats: {
      healthChecks: dto.stats.health_checks,
      warnings:     dto.stats.warnings,
      errors:       dto.stats.errors,
      restarts:     dto.stats.restarts,
      lastWarning:  dto.stats.last_warning,
      lastError:    dto.stats.last_error,
    },
    timestamp: isoToMs(dto.timestamp),
  }
}

// ─── /api/runtime ─────────────────────────────────────────────────────────────

export function toEngineRuntime(dto: EngineRuntimeDTO): EngineRuntime {
  return {
    mode:          dto.mode as EngineMode,
    initializedAt: isoToMs(dto.initialized_at),
    components:    toRuntimeComponents(dto.components),
    stats: {
      startedAt:      isoToMs(dto.stats.started_at),
      edgesDetected:  dto.stats.edges_detected,
      ordersExecuted: dto.stats.orders_executed,
      totalPnl:       dto.stats.total_pnl,
    },
    timestamp: isoToMs(dto.timestamp),
  }
}

// ─── /api/stats ───────────────────────────────────────────────────────────────

export function toEngineStats(dto: EngineStatsDTO): EngineStats {
  return {
    currentPrice:       dto.current_price,
    feedLatencyMs:      dto.feed_latency_ms,
    feedConnected:      dto.feed_connected,
    activePositions:    dto.active_positions,
    edgesDetected:      dto.edges_detected,
    ordersExecuted:     dto.orders_executed,
    avgExecutionTimeMs: dto.avg_execution_time_ms,
    uptimeSeconds:      dto.uptime_seconds,
    unrealizedPnl:      dto.unrealized_pnl,
    realizedPnl:        dto.realized_pnl,
    totalPnl:           dto.total_pnl,
    healthStatus:       dto.health_status as EngineHealthStatus,
    healthComponents:   dto.health_components.map(toHealthComponent),
    runtimeComponents:  toRuntimeComponents(dto.runtime_components),
    timestamp:          isoToMs(dto.timestamp),
  }
}

// ─── /api/config ──────────────────────────────────────────────────────────────

export function toEngineConfig(dto: EngineConfigDTO): EngineConfig {
  const c = dto.config
  return {
    environment:               c.environment as EngineMode,
    anthropicApiKey:           c.anthropic_api_key,
    polymarketApiUrl:          c.polymarket_api_url,
    polygonChainId:            c.polygon_chain_id,
    initialBankroll:           c.initial_bankroll,
    maxBetPercent:             c.max_bet_percent,
    maxConcurrentPositions:    c.max_concurrent_positions,
    minEdge:                   c.min_edge,
    kellyFraction:             c.kelly_fraction,
    maxLatencyMs:              c.max_latency_ms,
    dashboardUpdateIntervalMs: c.dashboard_update_interval_ms,
    dashboardApiEnabled:       c.dashboard_api_enabled,
    dashboardApiHost:          c.dashboard_api_host,
    dashboardApiPort:          c.dashboard_api_port,
    logLevel:                  c.log_level,
  }
}

// ─── /api/survival ────────────────────────────────────────────────────────────

export function toSurvivalStatus(dto: SurvivalDTO): SurvivalStatus {
  return {
    currentCapital:       dto.current_capital,
    initialCapital:       dto.initial_capital,
    capitalPct:           dto.capital_pct,
    state:                dto.state as SurvivalState,
    dailyBurnRate:        dto.daily_burn_rate,
    daysOfRunway:         dto.days_of_runway,
    recoveryTradesNeeded: dto.recovery_trades_needed,
    avgWinSize:           dto.avg_win_size,
    dailyTarget:          dto.daily_target,
    weeklyTarget:         dto.weekly_target,
    dailyPnl:             dto.daily_pnl,
    weeklyPnl:            dto.weekly_pnl,
    behindTargetPct:      dto.behind_target_pct,
    kellyModifier:        dto.kelly_modifier,
    minEdgeThreshold:     dto.min_edge_threshold,
    totalPatterns:        dto.total_patterns,
    filteredPatterns:     dto.filtered_patterns,
    timestamp:            isoToMs(dto.timestamp),
    patternsSummary:      dto.patterns_summary,
  }
}

// ─── /api/price-history ───────────────────────────────────────────────────────

export function toPriceHistory(dto: PriceHistoryDTO): PriceHistory {
  return {
    current:   dto.current,
    history:   dto.history.map((p) => ({ ts: isoToMs(p.timestamp), price: p.price })),
    timestamp: isoToMs(dto.timestamp),
  }
}

// ─── / (API root — identity) ──────────────────────────────────────────────────

export function toEngineIdentity(dto: EngineIdentityDTO): EngineIdentity {
  return {
    status:        dto.status as EngineHealthStatus,
    bot:           dto.bot,
    version:       dto.version,
    mode:          dto.runtime.mode as EngineMode,
    initializedAt: isoToMs(dto.runtime.initialized_at),
    components:    toRuntimeComponents(dto.runtime.components),
  }
}

/**
 * Identity synthesised from /api/runtime — the fallback source when the engine's
 * host-root `/` is unreachable (e.g. behind a reverse proxy that only forwards
 * `/api/*`, as in the DuckDNS production deployment). Runtime carries the
 * functional identity (mode, initialized_at, components); bot name and version
 * are static and come from app constants. `status` is 'online' because a
 * successful runtime response means the engine process is up.
 */
export function runtimeToIdentity(dto: EngineRuntimeDTO): EngineIdentity {
  return {
    status:        'online',
    bot:           APP_NAME,
    version:       APP_VERSION,
    mode:          dto.mode as EngineMode,
    initializedAt: isoToMs(dto.initialized_at),
    components:    toRuntimeComponents(dto.components),
  }
}

// ─── /api/execution/status ────────────────────────────────────────────────────

function toRateLimitBucket(dto: RateLimitBucketDTO): RateLimitBucket {
  return {
    name:            dto.name,
    ratePerSec:      dto.rate_per_sec,
    capacity:        dto.capacity,
    currentTokens:   dto.current_tokens,
    totalRequests:   dto.total_requests,
    totalWaits:      dto.total_waits,
    waitRatePct:     dto.wait_rate_pct,
    avgWaitMs:       dto.avg_wait_ms,
    totalWaitTimeMs: dto.total_wait_time_ms,
  }
}

export function toExecutionStatus(dto: ExecutionStatusDTO): ExecutionStatus {
  const s = dto.status
  return {
    available:          dto.available,
    mode:               dto.mode as EngineMode,
    totalTrades:        s.total_trades,
    wins:               s.wins,
    losses:             s.losses,
    winRate:            s.win_rate,
    totalPnl:           s.total_pnl,
    activePositions:    s.active_positions,
    closedPositions:    s.closed_positions,
    avgExecutionMs:     s.avg_execution_ms,
    fastestTradeMs:     s.fastest_trade_ms,
    slowestTradeMs:     s.slowest_trade_ms,
    balance:            s.balance,
    balanceCacheAgeSec: s.balance_cache_age_sec,
    retryStats: {
      totalRetries:       s.retry_stats.total_retries,
      successfulRetries:  s.retry_stats.successful_retries,
      failedAfterRetries: s.retry_stats.failed_after_retries,
      networkErrors:      s.retry_stats.network_errors,
      balanceErrors:      s.retry_stats.balance_errors,
      invalidOrderErrors: s.retry_stats.invalid_order_errors,
    },
    rateLimitBuckets: {
      market: toRateLimitBucket(s.rate_limiting.buckets.market),
      price:  toRateLimitBucket(s.rate_limiting.buckets.price),
      order:  toRateLimitBucket(s.rate_limiting.buckets.order),
    },
    backoff: {
      active:         s.rate_limiting.backoff.active,
      until:          s.rate_limiting.backoff.until === null ? null : isoToMs(s.rate_limiting.backoff.until),
      durationMs:     s.rate_limiting.backoff.duration_ms,
      total429s:      s.rate_limiting.backoff.total_429s,
      recent429s5min: s.rate_limiting.backoff.recent_429s_5min,
    },
    resolutionStats: {
      totalResolved:    s.resolution_stats.total_resolved,
      wins:             s.resolution_stats.wins,
      losses:           s.resolution_stats.losses,
      autoClosed:       s.resolution_stats.auto_closed,
      resolutionErrors: s.resolution_stats.resolution_errors,
      trackedPositions: s.resolution_stats.tracked_positions,
      isRunning:        s.resolution_stats.is_running,
    },
    timestamp: isoToMs(dto.timestamp),
  }
}

// ─── Collection envelopes (items stay unknown[] until schemas are confirmed) ───

export function toEngineMarkets(dto: EngineMarketsDTO): EngineMarkets {
  return { markets: dto.markets, count: dto.count, timestamp: isoToMs(dto.timestamp) }
}

export function toEnginePositions(dto: EnginePositionsDTO): EnginePositions {
  return {
    positions:          dto.positions,
    count:              dto.count,
    totalUnrealizedPnl: dto.total_unrealized_pnl,
    timestamp:          isoToMs(dto.timestamp),
  }
}

export function toEngineEvents(dto: EngineEventsDTO): EngineEvents {
  return { events: dto.events, count: dto.count, limit: dto.limit, types: dto.types, timestamp: isoToMs(dto.timestamp) }
}

export function toEngineEdges(dto: EngineEdgesDTO): EngineEdges {
  return { edges: dto.edges, count: dto.count, limit: dto.limit, timestamp: isoToMs(dto.timestamp) }
}

// ─── /api/execution/policy ──────────────────────────────────────────────────────

export function toExecutionPolicy(dto: ExecutionPolicyDTO): ExecutionPolicy {
  return {
    mode:               dto.mode as EngineMode,
    liveTradingEnabled: dto.live_trading_enabled,
    orderFlow:          dto.order_flow,
    riskLimits: {
      maxConcurrentPositions: dto.risk_limits.max_concurrent_positions,
      maxBetPercent:          dto.risk_limits.max_bet_percent,
      kellyFraction:          dto.risk_limits.kelly_fraction,
      maxLatencyMs:           dto.risk_limits.max_latency_ms,
      minimumOrderSizeUsd:    dto.risk_limits.minimum_order_size_usd,
    },
    orderTemplate: {
      side:           dto.order_template.side,
      orderType:      dto.order_template.order_type,
      priceBuffer:    dto.order_template.price_buffer,
      tokenSelection: dto.order_template.token_selection,
      yesPrice:       dto.order_template.yes_price,
      noPrice:        dto.order_template.no_price,
    },
    knownLimitations: dto.known_limitations,
    timestamp:        isoToMs(dto.timestamp),
  }
}

// ─── /api/execution/trades (items unknown[] until a non-empty sample lands) ─────

export function toExecutionTrades(dto: ExecutionTradesDTO): ExecutionTrades {
  return {
    activePositions: dto.active_positions,
    closedPositions: dto.closed_positions,
    timestamp:       isoToMs(dto.timestamp),
  }
}

// ─── /api/paper-stats ───────────────────────────────────────────────────────────

function toBucketPerformanceStat(dto: BucketPerformanceStatDTO): BucketPerformanceStat {
  return { wins: dto.wins, losses: dto.losses, totalPnl: dto.total_pnl, winRate: pctToFraction(dto.win_rate) }
}

function toBucketPerformanceRecord(dto: Record<string, BucketPerformanceStatDTO>): Record<string, BucketPerformanceStat> {
  const out: Record<string, BucketPerformanceStat> = {}
  for (const [key, value] of Object.entries(dto)) out[key] = toBucketPerformanceStat(value)
  return out
}

export function toPaperStats(dto: PaperStatsDTO): PaperStats {
  const p = dto.paper_trading
  return {
    available: dto.available,
    paperTrading: {
      sessionStart:      isoToMs(p.session_start),
      initialCapital:    p.initial_capital,
      currentCapital:    p.current_capital,
      totalTrades:       p.total_trades,
      wins:              p.wins,
      losses:            p.losses,
      pushes:            p.pushes,
      pending:           p.pending,
      totalPnl:          p.total_pnl,
      winRate:           pctToFraction(p.win_rate),
      avgWin:            p.avg_win,
      avgLoss:           p.avg_loss,
      largestWin:        p.largest_win,
      largestLoss:       p.largest_loss,
      survivalStates:    p.survival_states.map(([iso, state]) => [isoToMs(iso), state] as [number, string]),
      edgeBuckets:       toBucketPerformanceRecord(p.edge_buckets),
      hourlyPerformance: toBucketPerformanceRecord(p.hourly_performance),
    },
    timestamp: isoToMs(dto.timestamp),
  }
}

// ─── Additional endpoint adapters ─────────────────────────────────────────────

export function toPositionsHistory(dto: PositionsHistoryDTO): PositionsHistory {
  return {
    available: dto.available,
    history:   dto.history.map(toSettledTrade),
    count:     dto.count,
    limit:     dto.limit,
    timestamp: isoToMs(dto.timestamp),
  }
}

function toSurvivalPatternItem(dto: SurvivalPatternItemDTO): SurvivalPatternItem {
  return {
    key: dto.key, hour: dto.hour, marketType: dto.market_type, edgeBucket: dto.edge_bucket,
    wins: dto.wins, losses: dto.losses, totalTrades: dto.total_trades,
    winRate: pctToFraction(dto.win_rate), avgPnl: dto.avg_pnl, isFiltered: dto.is_filtered,
  }
}

export function toSurvivalPatterns(dto: SurvivalPatternsDTO): SurvivalPatterns {
  return {
    available: dto.available,
    patterns: dto.patterns.map(toSurvivalPatternItem),
    count: dto.count,
    filteredCount: dto.filtered_count,
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toConsensus(dto: ConsensusDTO): Consensus {
  const c = dto.consensus
  return {
    available: dto.available,
    scoreTimestamp: isoToMs(c.timestamp),
    score: c.score,
    confidence: c.confidence,
    signalCount: c.signal_count,
    signals: {
      edgeDirection: c.signals.edge_direction,
      edgeConfidence: c.signals.edge_confidence,
      rsiMomentum: c.signals.rsi_momentum,
      macdTrend: c.signals.macd_trend,
      priceMomentum: c.signals.price_momentum,
    },
    btcPrice: c.btc_price,
    interpretation: c.interpretation,
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toConsensusBias(dto: ConsensusBiasDTO): ConsensusBias {
  return {
    available: dto.available,
    totalEdges: dto.total_edges,
    bias: {
      yesCount: dto.bias.yes_count, noCount: dto.bias.no_count,
      yesPercent: dto.bias.yes_percent, noPercent: dto.bias.no_percent,
    },
    confidence: {
      average: dto.confidence.average, p50: dto.confidence.p50, p75: dto.confidence.p75,
      p90: dto.confidence.p90, min: dto.confidence.min, max: dto.confidence.max,
    },
    recentTrend: {
      last10Edges: dto.recent_trend.last_10_edges,
      yesCount: dto.recent_trend.yes_count, noCount: dto.recent_trend.no_count,
      bias: dto.recent_trend.bias,
    },
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toConsensusHistory(dto: ConsensusHistoryDTO): ConsensusHistory {
  return {
    available: dto.available,
    history: dto.history.map((p) => ({ ts: isoToMs(p.timestamp), score: p.score, confidence: p.confidence, btcPrice: p.btc_price })),
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toResearchReports(dto: ResearchReportsDTO): ResearchReports {
  return {
    available: dto.available,
    reports: dto.reports.map((r) => ({ type: r.type, title: r.title, summary: r.summary, details: r.details, generatedAt: isoToMs(r.generated_at) })),
    count: dto.count,
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toPortfolio(dto: PortfolioDTO): Portfolio {
  return {
    available: dto.available,
    mode: dto.mode as EngineMode,
    balance: { current: dto.balance.current, cacheAgeSec: dto.balance.cache_age_sec },
    positions: {
      active: dto.positions.active,
      activeCount: dto.positions.active_count,
      totalUnrealizedPnl: dto.positions.total_unrealized_pnl,
    },
    pnl: { realized: dto.pnl.realized, unrealized: dto.pnl.unrealized, total: dto.pnl.total },
    performance: {
      totalTrades: dto.performance.total_trades, wins: dto.performance.wins, losses: dto.performance.losses,
      winRate: pctToFraction(dto.performance.win_rate), avgExecutionMs: dto.performance.avg_execution_ms,
    },
    survival: {
      state: dto.survival.state as SurvivalState, capital: dto.survival.capital, capitalPct: dto.survival.capital_pct,
      kellyModifier: dto.survival.kelly_modifier, minEdgeThreshold: dto.survival.min_edge_threshold,
    },
    btcPrice: dto.btc_price,
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toBalance(dto: BalanceDTO): Balance {
  return {
    available: dto.available, balanceUsd: dto.balance_usd, cacheAgeSec: dto.cache_age_sec,
    cacheFresh: dto.cache_fresh, timestamp: isoToMs(dto.timestamp),
  }
}

export function toPortfolioHistory(dto: PortfolioHistoryDTO): PortfolioHistory {
  return {
    available: dto.available,
    history: dto.history.map((p) => ({
      ts: isoToMs(p.timestamp), totalValue: p.total_value, cashBalance: p.cash_balance,
      unrealizedPnl: p.unrealized_pnl, realizedPnl: p.realized_pnl, positionCount: p.position_count,
      btcPrice: p.btc_price, winRate: pctToFraction(p.win_rate), totalTrades: p.total_trades,
    })),
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toPortfolioSummary(dto: PortfolioSummaryDTO): PortfolioSummary {
  const s = dto.summary
  return {
    available: dto.available,
    summary: {
      currentValue: s.current_value, initialValue: s.initial_value, peakValue: s.peak_value,
      totalReturnPct: s.total_return_pct, currentDrawdownPct: s.current_drawdown_pct,
      snapshotCount: s.snapshot_count, timeRangeSeconds: s.time_range_seconds,
      firstSnapshot: isoToMs(s.first_snapshot), lastSnapshot: isoToMs(s.last_snapshot),
      currentPositions: s.current_positions, currentWinRate: pctToFraction(s.current_win_rate),
      totalTrades: s.total_trades,
    },
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toPortfolioPerformance(dto: PortfolioPerformanceDTO): PortfolioPerformance {
  const p = dto.performance
  return {
    available: dto.available,
    performance: {
      available: p.available, periodHours: p.period_hours, startValue: p.start_value, endValue: p.end_value,
      valueChange: p.value_change, returnPct: p.return_pct, maxDrawdownPct: p.max_drawdown_pct,
      tradesInPeriod: p.trades_in_period, snapshotCount: p.snapshot_count,
    },
    lookbackHours: dto.lookback_hours,
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toAnalyticsSegments(dto: AnalyticsSegmentsDTO): AnalyticsSegments {
  return { available: dto.available, segments: dto.segments, count: dto.count, segmentType: dto.segment_type, timestamp: isoToMs(dto.timestamp) }
}

export function toAnalyticsSignals(dto: AnalyticsSignalsDTO): AnalyticsSignals {
  return { available: dto.available, signals: dto.signals, count: dto.count, timestamp: isoToMs(dto.timestamp) }
}

export function toAnalyticsSummary(dto: AnalyticsSummaryDTO): AnalyticsSummary {
  const s = dto.summary
  return {
    available: dto.available,
    summary: {
      totalTradesAnalyzed: s.total_trades_analyzed, overallWinRate: pctToFraction(s.overall_win_rate),
      totalPnl: s.total_pnl, segmentCount: s.segment_count, signalCount: s.signal_count, historySize: s.history_size,
    },
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toAnalyticsTopSegments(dto: AnalyticsTopSegmentsDTO): AnalyticsTopSegments {
  return {
    available: dto.available, topSegments: dto.top_segments, segmentType: dto.segment_type,
    metric: dto.metric, limit: dto.limit, timestamp: isoToMs(dto.timestamp),
  }
}

export function toAnalyticsHourly(dto: AnalyticsHourlyDTO): AnalyticsHourly {
  return { available: dto.available, hourly: dto.hourly, count: dto.count, timestamp: isoToMs(dto.timestamp) }
}

export function toPaperStatus(dto: PaperStatusDTO): PaperStatus {
  return {
    available: dto.available, enabled: dto.enabled, pendingTrades: dto.pending_trades,
    completedTrades: dto.completed_trades, timestamp: isoToMs(dto.timestamp),
  }
}

export function toSystemMetrics(dto: SystemMetricsDTO): SystemMetrics {
  return {
    available: dto.available,
    uptime: { seconds: dto.uptime.seconds, formatted: dto.uptime.formatted },
    memoryMb: { rssMb: dto.memory.rss_mb, vmsMb: dto.memory.vms_mb },
    cpuPercent: dto.cpu.percent,
    components: toRuntimeComponents(dto.components),
    eventLogSize: dto.event_log_size,
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toTradesLedger(dto: TradesLedgerDTO): TradesLedger {
  return {
    available: dto.available, ledger: dto.ledger.map(toSettledTrade), count: dto.count,
    summary: {
      totalPnl: dto.summary.total_pnl, wins: dto.summary.wins, losses: dto.summary.losses,
      winRate: pctToFraction(dto.summary.win_rate),
    },
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toExecutionOrders(dto: ExecutionOrdersDTO): ExecutionOrders {
  return {
    available: dto.available, activeOrders: dto.active_orders, closedOrders: dto.closed_orders,
    activeCount: dto.active_count, closedCount: dto.closed_count, totalCount: dto.total_count,
    timestamp: isoToMs(dto.timestamp),
  }
}

// ─── Markets (2026-07-25 — summary is the primary source while /markets hangs) ─

/** Wire prices are 0–1 probabilities; the UI renders cents throughout. */
const priceToCents = (p: number): number => p * 100

function toMarketSummaryItem(dto: MarketSummaryItemDTO): MarketSummaryItem {
  return {
    marketId:         dto.market_id,
    question:         dto.question,
    snapshotCount:    dto.snapshot_count,
    timeRangeSeconds: dto.time_range_seconds,
    firstSnapshot:    isoToMs(dto.first_snapshot),
    lastSnapshot:     isoToMs(dto.last_snapshot),
    yesPrice: {
      current: priceToCents(dto.yes_price.current), min: priceToCents(dto.yes_price.min),
      max:     priceToCents(dto.yes_price.max),     avg: priceToCents(dto.yes_price.avg),
    },
    noPrice: {
      current: priceToCents(dto.no_price.current), min: priceToCents(dto.no_price.min),
      max:     priceToCents(dto.no_price.max),     avg: priceToCents(dto.no_price.avg),
    },
    // BTC price is an absolute USD figure — no cents conversion.
    btcPrice: { ...dto.btc_price },
    volume:   { ...dto.volume },
  }
}

export function toMarketsSummary(dto: MarketsSummaryDTO): MarketsSummary {
  return {
    available: dto.available,
    markets:   dto.markets.map(toMarketSummaryItem),
    count:     dto.count,
    timestamp: isoToMs(dto.timestamp),
  }
}

function toMarketHistoryPoint(dto: MarketHistoryPointDTO): MarketHistoryPoint {
  return {
    ts:              isoToMs(dto.timestamp),
    marketId:        dto.market_id,
    question:        dto.question,
    yesPrice:        priceToCents(dto.yes_price),
    noPrice:         priceToCents(dto.no_price),
    volume:          dto.volume,
    btcPrice:        dto.btc_price,
    baselinePrice:   dto.baseline_price,
    edgePct:         dto.edge_pct,
    durationMinutes: dto.duration_minutes,
  }
}

export function toMarketPriceHistory(dto: MarketPriceHistoryDTO): MarketPriceHistory {
  return {
    available: dto.available,
    marketId:  dto.market_id,
    // Wire returns newest-first; charts want oldest-first.
    history:   dto.history.map(toMarketHistoryPoint).sort((a, b) => a.ts - b.ts),
    count:     dto.count,
    limit:     dto.limit,
    timestamp: isoToMs(dto.timestamp),
  }
}

/**
 * Adapts the historical archive (/api/markets/history/summary) into the same
 * EngineMarkets envelope the markets surface consumes, so a browsable list of
 * past markets can reuse parseMarketRows() and the existing market components.
 *
 * NOT a replacement for /api/markets — that returns only what the engine is
 * scanning right now (1–3 live markets), whereas this is the 100+ market
 * archive. Keep the two distinct; conflating them mislabels historical markets
 * as live ones.
 *
 * Operates on the raw DTO so prices stay 0–1 — parseMarketRows does its own
 * ×100 conversion, and going through toMarketsSummary() would double it.
 */
export function marketsSummaryToEngineMarkets(dto: MarketsSummaryDTO): EngineMarkets {
  return {
    markets: dto.markets.map((m) => ({
      id:            m.market_id,
      question:      m.question,
      yes_price:     m.yes_price.current,
      no_price:      m.no_price.current,
      volume:        m.volume.current,
      baseline_price: m.btc_price.current,
      // The summary reports observation windows, not market close times. Using
      // last_snapshot as closes_at would be a lie, so it stays absent.
    })),
    count:     dto.count,
    timestamp: isoToMs(dto.timestamp),
  }
}

// ─── Settled trades (ledger + positions history share this item shape) ────────

export function toSettledTrade(dto: SettledTradeDTO): SettledTrade {
  return {
    marketId:        dto.market_id,
    direction:       dto.direction.toLowerCase(),
    size:            dto.size,
    entryPrice:      priceToCents(dto.entry_price),
    exitPrice:       dto.exit_price === null ? null : priceToCents(dto.exit_price),
    pnl:             dto.pnl,
    pnlPercent:      pctToFraction(dto.pnl_percent),
    edgePct:         dto.edge_pct,
    holdTimeSeconds: dto.hold_time_seconds,
    openedAt:        isoToMs(dto.opened_at),
    closedAt:        isoToMs(dto.closed_at),
    won:             dto.won,
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** A 2xx is the real success signal; the body only downgrades it if it says so
 *  explicitly (`success: false`, or a status of 'error'/'failed'). */
export function toMutationResult(dto: MutationResultDTO | null | undefined): MutationResult {
  const raw = (dto ?? {}) as Record<string, unknown>
  const explicitFailure =
    dto?.success === false ||
    dto?.status === 'error' ||
    dto?.status === 'failed'

  const message =
    typeof dto?.message === 'string' ? dto.message :
    typeof dto?.detail  === 'string' ? dto.detail  :
    typeof dto?.status  === 'string' ? dto.status  :
    null

  return { success: !explicitFailure, message, raw }
}
