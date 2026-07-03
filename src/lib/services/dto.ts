// Backend DTO → domain adapters — the single translation point between the
// engine's snake_case wire shapes and the app's camelCase domain types. Live
// services receive DTOs and call these; the mock returns domain shapes directly.
//
// Wire conventions:
//   • Entity timestamps are ISO 8601 strings → normalized to epoch ms here
//   • Money is USD floats; percentages arrive as the backend sends them

import type {
  EngineHealthDTO, HealthComponentDTO, RuntimeComponentsDTO,
  EngineRuntimeDTO, EngineStatsDTO, EngineConfigDTO, SurvivalDTO, PriceHistoryDTO,
  EngineMarketsDTO, EnginePositionsDTO, EngineEventsDTO, EngineEdgesDTO,
  EngineIdentityDTO, ExecutionStatusDTO, RateLimitBucketDTO,
  EngineHealth, HealthComponent, RuntimeComponents, EngineRuntime, EngineStats,
  EngineConfig, SurvivalStatus, PriceHistory,
  EngineMarkets, EnginePositions, EngineEvents, EngineEdges,
  EngineIdentity, ExecutionStatus, RateLimitBucket,
  EngineHealthStatus, SurvivalState, EngineMode,
} from '@/types/engine'

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
