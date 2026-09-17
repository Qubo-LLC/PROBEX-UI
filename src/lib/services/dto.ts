// Backend DTO → domain adapters — the single translation point between the
// engine's snake_case wire shapes and the app's camelCase domain types. Live
// services receive DTOs and call these; the mock returns domain shapes directly.
//
// Wire conventions:
//   • Entity timestamps are ISO 8601 strings → normalized to epoch ms here
//   • Money is USD floats; percentages arrive as the backend sends them
//
// ─── The two-shape envelope ──────────────────────────────────────────────────
// Many engine endpoints carry an `available` flag, and several answer with ONE
// OF TWO shapes: the full payload, or `{ available: false, message }` with the
// payload key OMITTED entirely. Verified 2026-08-20 on /api/consensus,
// /api/consensus/bias, /api/portfolio/summary and (nested)
// /api/portfolio/performance — see docs/BACKEND_CONTRACT_2026-08-20.md.
//
// Those four are modelled explicitly: their domain types make the payload
// `| null` so "not computed yet" cannot be mistaken for zero.
//
// The remaining `available`-bearing endpoints were all observed returning the
// full shape, so their types are left alone rather than restructured on
// speculation. They are guarded with `requireAvailable()` instead: if the
// engine ever sends them the short shape, the adapter raises a NAMED, typed
// error the UI can report honestly, rather than a raw TypeError from
// dereferencing `undefined` — which is what produced a misleading hard-error
// state before this audit.

import { normalizeHealthStatus } from './health'
import { ServiceException } from './response'
import type {
  EngineHealthDTO, HealthComponentDTO, RuntimeComponentsDTO,
  EngineRuntimeDTO, EngineStatsDTO, EngineConfigDTO, EngineConfigFilterFieldsDTO, SurvivalDTO, PriceHistoryDTO,
  EngineMarketsDTO, EnginePositionsDTO, EngineEventsDTO, EngineEdgesDTO,
  EngineIdentityDTO, ExecutionStatusDTO, RateLimitBucketDTO,
  ExecutionPolicyDTO, ExecutionTradesDTO, PaperStatsDTO, BucketPerformanceStatDTO,
  EngineHealth, HealthComponent, RuntimeComponents, EngineRuntime, EngineStats,
  EngineConfig, SurvivalStatus, PriceHistory,
  EngineMarkets, EnginePositions, EngineEvents, EngineEdges,
  EngineIdentity, ExecutionStatus, RateLimitBucket,
  ExecutionPolicy, ExecutionTrades, PaperStats, BucketPerformanceStat,
  SurvivalState, EngineMode,
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
  MarketDetailDTO, MarketDetail, MarketDetailItemDTO, MarketDetailItem,
  SettledTradeDTO, SettledTrade,
  MutationResultDTO, MutationResult,
} from '@/types/engine'

/** win_rate is 0–100 on the wire everywhere; normalize to 0–1 so all domain
 *  winRates share one convention. */
const pctToFraction = (pct: number): number => pct / 100

/**
 * Reads the consensus surface's spot price across the multi-asset rename.
 *
 * The engine renamed `btc_price` → `asset_price` on `/api/consensus` and
 * `/api/consensus/history` when consensus went multi-asset. The old name is
 * still accepted because this backend has renamed fields under us before and
 * the fallback costs one `??`.
 *
 * Returns null rather than 0 when neither is present: a missing price and a
 * price of zero are different facts, and it was a non-null assumption here that
 * crashed the Consensus page with `undefined.toLocaleString()`.
 */
function assetPriceOf(p: { asset_price?: number; btc_price?: number }): number | null {
  const value = p.asset_price ?? p.btc_price
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

// ─── Time normalization ─────────────────────────────────────────────────────────

/**
 * Parse an ISO timestamp that carries NO timezone offset as UTC.
 *
 * The engine emits naive strings ("2026-09-09T22:24:43.012114") that are in
 * fact UTC. ECMAScript parses an offset-less date-TIME string as LOCAL time,
 * so those values land off by the viewer's UTC offset. Measured on a UTC+3
 * machine: a probe that answered one second ago read as 3.00 hours old.
 *
 * ─── Why this is now the product-wide parse (2026-09-15) ─────────────────────
 * It was first applied to one field (`checked_at`) because only two of the
 * fourteen naive fields had been proven UTC by clock comparison, and the
 * portfolio-history series had never been captured. That evidence is now
 * complete, all of it from the live engine on 2026-09-15:
 *
 *   initialized_at        naive "…T23:33:15.6" equals now − uptime_seconds
 *                         (…T23:33:19Z, the gap being request latency)
 *   events[].timestamp    interleaves with the ledger's opened_at/closed_at
 *                         within 3–7 ms for the same trade
 *   portfolio/history[]   a snapshot at …T23:29:32.999456 sits 220 µs from
 *                         the edge event at …T23:29:32.999676 — one cycle
 *   ledger / positions    the same process clock as the events above
 *
 * Every naive field is written by one process from one clock, and that clock
 * is UTC. The three offset-aware fields (`closes_at`, `created_at`, the price
 * feed) are untouched by construction: a zone suffix is honoured as written.
 * Parsing the naive ones as local was the ONLY reason the Portfolio chart's
 * axis and the activity rows beneath it disagreed by the viewer's offset.
 *
 * Strings with no time part are left to the platform: "2026-09-14Z" is not a
 * date, so the suffix is added only when a time follows the date.
 */
export const naiveUtcToMs = (iso: string): number => {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso)
  const hasTime = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(iso)
  return new Date(hasZone || !hasTime ? iso : iso + 'Z').getTime()
}

/** ISO 8601 → epoch ms, with the engine's naive-UTC convention applied. */
export const isoToMs = naiveUtcToMs
export const msToIso = (ms: number): string => new Date(ms).toISOString()

// ─── Two-shape envelope guard ─────────────────────────────────────────────────

/**
 * Asserts that an `available`-gated payload is actually present.
 *
 * Turns the engine's "not computed yet" short shape into a typed, named
 * ServiceException instead of a TypeError raised deep inside a mapper. The
 * distinction is the whole point: a ServiceException carries a code and a
 * message the UI can present as a real state, whereas
 * `Cannot read properties of undefined (reading 'timestamp')` reaches the user
 * as generic breakage and tells the operator nothing true.
 *
 * @param payload   The nested object the DTO declares.
 * @param endpoint  Path, for the operator-facing message.
 * @param message   The engine's own `message`, when it sent one.
 */
function requireAvailable<T>(
  payload:  T | undefined | null,
  endpoint: string,
  message?: string,
): T {
  if (payload === undefined || payload === null) {
    throw new ServiceException(
      'PAYLOAD_UNAVAILABLE',
      message ?? `${endpoint} reported no data available yet`,
      // Retryable: this is a transient engine state, not a contract violation.
      // The engine starts sending the full shape as soon as it has something.
      true,
    )
  }
  return payload
}

// ─── Engine shared helpers ────────────────────────────────────────────────────

function toHealthComponent(dto: HealthComponentDTO): HealthComponent {
  return {
    name:      dto.name,
    healthy:   dto.healthy,
    message:   dto.message,
    latencyMs: dto.latency_ms,
    // Same convention as every other engine timestamp (naiveUtcToMs); this
    // field was the first to get it, when the proof covered it alone.
    checkedAt: naiveUtcToMs(dto.checked_at),
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
    status:          normalizeHealthStatus(dto.status),
    statusLabel:     dto.status,
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
    healthStatus:       normalizeHealthStatus(dto.health_status),
    healthComponents:   dto.health_components.map(toHealthComponent),
    runtimeComponents:  toRuntimeComponents(dto.runtime_components),
    timestamp:          isoToMs(dto.timestamp),
  }
}

// ─── /api/config ──────────────────────────────────────────────────────────────

export function toEngineConfig(dto: EngineConfigDTO): EngineConfig {
  const c = dto.config
  // The filter parameters are optional on the wire — see
  // EngineConfigFilterFieldsDTO. Reading them through that view keeps the
  // guards honest without widening EngineConfigInnerDTO itself.
  const f = c as EngineConfigFilterFieldsDTO
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

    // Defensive: the DTO does not declare these (an older capture predates
    // them), so each is read through a guard rather than asserted. A missing or
    // wrong-typed field becomes null, never 0 and never undefined.
    minEdgeYes:            numOrNull(f.min_edge_yes),
    minEdgeNo:             numOrNull(f.min_edge_no),
    minVolume:             numOrNull(f.min_volume),
    minAlignment:          numOrNull(f.min_alignment),
    blockedHours:          numArrayOrNull(f.blocked_hours),
    edgeConfirmationCount: numOrNull(f.edge_confirmation_count),
    earlyExitThreshold:    numOrNull(f.early_exit_threshold),
    lowLiquidityStartHour: numOrNull(f.low_liquidity_start_hour),
    lowLiquidityEndHour:   numOrNull(f.low_liquidity_end_hour),
  }
}

/** Finite number or null. Guards fields the DTO does not declare. */
const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

/** Array of finite numbers or null. An empty array is meaningful (= none
 *  configured) and is preserved as []; a non-array becomes null. */
const numArrayOrNull = (v: unknown): number[] | null =>
  Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)) : null

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
    status:        normalizeHealthStatus(dto.status),
    bot:           dto.bot,
    version:       dto.version,
    mode:          dto.runtime.mode as EngineMode,
    initializedAt: isoToMs(dto.runtime.initialized_at),
    components:    toRuntimeComponents(dto.runtime.components),
  }
}

/**
 * Identity synthesised from /api/runtime — the primary source, because the
 * engine's host-root `/` is the marketing site behind the production bridge.
 * Runtime carries the functional identity (mode, initialized_at, components).
 * It does NOT carry the engine's name or version, and neither does any other
 * /api/* endpoint; they used to be filled from the dashboard's own APP_NAME /
 * APP_VERSION here, which put "Probex 2.0.0" under the label "Engine" in the
 * shell. They are null now, and the shell says the version is not reported.
 * `status` is 'online' because a successful runtime response means the engine
 * process is up.
 */
export function runtimeToIdentity(dto: EngineRuntimeDTO): EngineIdentity {
  return {
    status:        'online',
    bot:           null,
    version:       null,
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
  // The source of trading truth — if the engine ever withholds it, say so
  // plainly rather than crashing mid-map. See the two-shape note in the header.
  const s = requireAvailable(dto.status, '/api/execution/status')
  return {
    available:          dto.available,
    mode:               dto.mode as EngineMode,
    totalTrades:        s.total_trades,
    wins:               s.wins,
    losses:             s.losses,
    // 2026-09-07: this was the ONE win_rate on the wire not being normalised.
    // It read as 0–1 because the live value has been exactly 0 (paper mode
    // places no live orders), which is indistinguishable from a fraction and
    // hid the defect. Every other win_rate the engine sends is 0–100 —
    // /api/paper-stats sends 74.6, /api/trades/ledger sends 80,
    // /api/survival/patterns sends 100 — and this field is computed by the same
    // backend from the same trade set. The first live order would have rendered
    // a 74.6% win rate as 7460%.
    winRate:            pctToFraction(s.win_rate),
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
  // UTC-aware, like the item timestamps in mappers/events.ts: this envelope's
  // clock is compared against the newest event's to say how old the log is,
  // so the two must be parsed the same way. See naiveUtcToMs for the proof.
  return { events: dto.events, count: dto.count, limit: dto.limit, types: dto.types, timestamp: naiveUtcToMs(dto.timestamp) }
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

/**
 * The engine answers /api/consensus with ONE OF TWO shapes: a full reading, or
 * `{ available: false, message }` with the `consensus` key omitted entirely.
 * Dereferencing it unconditionally threw a TypeError, which the hook caught and
 * rendered as a hard error — turning "the engine hasn't computed one yet" into
 * "something is broken". They are different facts; keep them different.
 */
export function toConsensus(dto: ConsensusDTO): Consensus {
  const c = dto.consensus
  return {
    available: dto.available,
    message:   dto.message ?? null,
    reading: !dto.available || c === undefined ? null : {
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
      // Everything the wire sent, not only the five the type names — the
      // typed projection is what hid three of eight signals from every view.
      allSignals: Object.entries(c.signals as unknown as Record<string, unknown>)
        .filter((kv): kv is [string, number] => typeof kv[1] === 'number' && Number.isFinite(kv[1]))
        .map(([key, value]) => ({ key, value })),
      assetPrice:  assetPriceOf(c),
      assetSymbol: c.asset_symbol ?? null,
      interpretation: c.interpretation,
    },
    timestamp: isoToMs(dto.timestamp),
  }
}

/** Same two-shape envelope as toConsensus — `bias`/`confidence`/`recent_trend`
 *  are all absent when the engine has detected no edges yet. */
export function toConsensusBias(dto: ConsensusBiasDTO): ConsensusBias {
  const { bias, confidence, recent_trend: trend } = dto
  return {
    available: dto.available,
    message:   dto.message ?? null,
    detail: !dto.available || bias === undefined || confidence === undefined || trend === undefined
      ? null
      : {
        // Reached only when bias/confidence/recent_trend are all present, which
        // the engine sends as one block with total_edges — so this default is
        // unreachable belt-and-braces, not an unknown being coerced to zero.
        totalEdges: dto.total_edges ?? 0,
        bias: {
          yesCount: bias.yes_count, noCount: bias.no_count,
          yesPercent: bias.yes_percent, noPercent: bias.no_percent,
        },
        confidence: {
          average: confidence.average, p50: confidence.p50, p75: confidence.p75,
          p90: confidence.p90, min: confidence.min, max: confidence.max,
        },
        recentTrend: {
          last10Edges: trend.last_10_edges,
          yesCount: trend.yes_count, noCount: trend.no_count,
          bias: trend.bias,
        },
      },
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toConsensusHistory(dto: ConsensusHistoryDTO): ConsensusHistory {
  return {
    available: dto.available,
    // CHRONOLOGICAL, oldest first — a guarantee of the domain shape. This wire
    // happens to arrive oldest-first (verified 2026-09-16, unlike every other
    // history endpoint), and the three consumers plot it in order; the sort
    // makes that a promise rather than an observation.
    history: dto.history.map((p) => ({
      ts: isoToMs(p.timestamp), score: p.score, confidence: p.confidence,
      assetPrice: assetPriceOf(p), assetSymbol: p.asset_symbol ?? null,
    })).sort((a, b) => a.ts - b.ts),
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
    // CHRONOLOGICAL, oldest first — a guarantee of the domain shape, not of
    // the wire. /api/portfolio/history returns snapshots NEWEST FIRST
    // (verified 2026-09-15: 23:31 → 22:35). Every consumer is a time series
    // or a running-peak derivation, and four of them were plotting wire order:
    // the x-axis ran backwards on Portfolio's three charts and Analytics'
    // two, and the drawdown curve was computed against the future. One sort
    // here, at the adapter, is the one place that fixes all of them. The
    // wire contract itself is untouched.
    history: dto.history.map((p) => ({
      ts: isoToMs(p.timestamp), totalValue: p.total_value, cashBalance: p.cash_balance,
      unrealizedPnl: p.unrealized_pnl, realizedPnl: p.realized_pnl, positionCount: p.position_count,
      btcPrice: p.btc_price, winRate: pctToFraction(p.win_rate), totalTrades: p.total_trades,
    })).sort((a, b) => a.ts - b.ts),
    timestamp: isoToMs(dto.timestamp),
  }
}

/** Two-shape envelope — `summary` is absent while the portfolio tracker has
 *  recorded no snapshots ("No portfolio data available yet"). */
export function toPortfolioSummary(dto: PortfolioSummaryDTO): PortfolioSummary {
  const s = dto.summary
  return {
    available: dto.available,
    message:   dto.message ?? null,
    summary: !dto.available || s === undefined ? null : {
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

/**
 * Nested two-shape envelope: the OUTER `available` reports whether the endpoint
 * worked, the INNER one whether the lookback window contained anything. The
 * metric keys are absent in the "no data" case, so the previous mapping wrote
 * `undefined` into fields typed `number` — a type lie that would have rendered
 * as NaN the moment any consumer stopped checking `.available` first.
 */
export function toPortfolioPerformance(dto: PortfolioPerformanceDTO): PortfolioPerformance {
  const p = dto.performance
  const measured =
    dto.available && p !== undefined && p.available && p.period_hours !== undefined
  return {
    available: dto.available && (p?.available ?? false),
    message:   p?.message ?? dto.message ?? null,
    performance: !measured ? null : {
      periodHours: p.period_hours as number,
      startValue: p.start_value as number,
      endValue: p.end_value as number,
      valueChange: p.value_change as number,
      returnPct: p.return_pct as number,
      maxDrawdownPct: p.max_drawdown_pct as number,
      tradesInPeriod: p.trades_in_period as number,
      snapshotCount: p.snapshot_count as number,
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
  const s = requireAvailable(dto.summary, '/api/analytics/summary')
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
    completedTrades: dto.completed_trades,
    totalPnl: dto.total_pnl, winRate: pctToFraction(dto.win_rate),
    timestamp: isoToMs(dto.timestamp),
  }
}

export function toSystemMetrics(dto: SystemMetricsDTO): SystemMetrics {
  // Documented as "requires psutil" — an install without it is a plausible
  // route to the short shape, so this one is guarded on the same principle.
  const uptime = requireAvailable(dto.uptime, '/api/system/metrics')
  return {
    available: dto.available,
    uptime: { seconds: uptime.seconds, formatted: uptime.formatted },
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

// ─── /api/markets/:market_id ──────────────────────────────────────────────────

export function toMarketDetailItem(dto: MarketDetailItemDTO, now: number = Date.now()): MarketDetailItem {
  const closesAt = isoToMs(dto.closes_at)
  return {
    id:                  dto.id,
    question:            dto.question,
    baselinePrice:       dto.baseline_price,
    baselinePriceSource: dto.baseline_price_source,
    yesTokenId:          dto.yes_token_id,
    noTokenId:           dto.no_token_id,
    yesPrice:            dto.yes_price,
    noPrice:             dto.no_price,
    createdAt:           isoToMs(dto.created_at),
    closesAt,
    volume:              dto.volume,
    durationMinutes:     dto.duration_minutes,
    marketTier:          dto.market_tier,
    assetCategory:       dto.asset_category,
    // Not a guess: closes_at is a confirmed wire field and this is a direct
    // comparison against it. NaN (an unparseable date) yields false — we do not
    // know it has closed, so we do not claim it.
    hasClosed:           Number.isFinite(closesAt) && closesAt < now,
  }
}

export function toMarketDetail(dto: MarketDetailDTO, now: number = Date.now()): MarketDetail {
  return {
    available:    dto.available,
    // `now` is threaded rather than left to the item adapter's own default so
    // the expiry derivation is testable against a fixed clock.
    market:       toMarketDetailItem(requireAvailable(dto.market, '/api/markets/:market_id'), now),
    // Wire returns newest-first; charts want oldest-first. Same convention as
    // toMarketPriceHistory, and the item shape is byte-identical to that
    // endpoint's — confirmed 2026-09-07, so one point adapter serves both.
    history:      (dto.history ?? []).map(toMarketHistoryPoint).sort((a, b) => a.ts - b.ts),
    historyCount: dto.history_count,
    timestamp:    isoToMs(dto.timestamp),
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
    // Optional at runtime even though the DTO declares them: an older engine
    // build, or a replayed fixture, can omit them. A missing descriptor must
    // degrade to null rather than render the string "undefined".
    assetCategory:   typeof dto.asset_category === 'string' ? dto.asset_category : null,
    assetSymbol:     typeof dto.asset_symbol === 'string' ? dto.asset_symbol : null,
    durationMinutes: typeof dto.duration_minutes === 'number' ? dto.duration_minutes : null,
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
