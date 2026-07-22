// Wire DTOs (exact backend JSON shapes, snake_case) and camelCase domain types
// for all six confirmed engine endpoints. DTOs mirror the Postman collection
// responses literally — adapters in lib/services/dto.ts are the only
// translation point. No invented fields; no fields beyond what the captured
// samples contain.

// ─── Shared substructures ──────────────────────────────────────────────────────
// Both /health and /api/stats embed these component shapes.

/** Component health entry from /health components[] and /api/stats health_components[] */
export interface HealthComponentDTO {
  name:       string
  healthy:    boolean
  message:    string
  latency_ms: number | null  // null when not measured for this component
  checked_at: string         // ISO 8601
}

/** Runtime component flags from /api/runtime components{} and /api/stats runtime_components{}.
 *  2026-07-22 redeploy added 4 new flags (consensus_engine, market_history,
 *  portfolio_tracker, analytics_engine) — confirmed live in root identity,
 *  /api/stats, /api/runtime, and /api/system/metrics. */
export interface RuntimeComponentsDTO {
  bot:                boolean
  clob_client:        boolean
  execution_engine:   boolean
  market_fetcher:     boolean
  resolution_tracker: boolean
  pnl_calculator:     boolean
  telegram_alerter:   boolean
  health_monitor:     boolean
  survival_brain:     boolean
  paper_trader:       boolean
  consensus_engine:   boolean
  market_history:     boolean
  portfolio_tracker:  boolean
  analytics_engine:   boolean
}

// ─── /health ──────────────────────────────────────────────────────────────────

export interface HealthStatsDTO {
  health_checks: number
  warnings:      number
  errors:        number
  restarts:      number
  last_warning:  string | null
  last_error:    string | null
}

export interface EngineHealthDTO {
  status:            string              // 'online' | 'degraded' | 'offline'
  components:        HealthComponentDTO[]
  check_duration_ms: number
  uptime_seconds:    number
  stats:             HealthStatsDTO
  timestamp:         string             // ISO 8601
}

// ─── /api/runtime ─────────────────────────────────────────────────────────────

export interface RuntimeStatsDTO {
  started_at:      string   // ISO 8601
  edges_detected:  number
  orders_executed: number
  total_pnl:       number
}

export interface EngineRuntimeDTO {
  mode:           string   // 'paper' | 'live'
  initialized_at: string   // ISO 8601
  components:     RuntimeComponentsDTO
  stats:          RuntimeStatsDTO
  timestamp:      string   // ISO 8601
}

// ─── /api/stats ───────────────────────────────────────────────────────────────

export interface EngineStatsDTO {
  current_price:         number
  feed_latency_ms:       number
  feed_connected:        boolean
  active_positions:      number
  edges_detected:        number
  orders_executed:       number
  avg_execution_time_ms: number | null  // null until first execution
  uptime_seconds:        number
  unrealized_pnl:        number
  realized_pnl:          number
  total_pnl:             number
  health_status:         string
  health_components:     HealthComponentDTO[]
  runtime_components:    RuntimeComponentsDTO
  timestamp:             string  // ISO 8601
}

// ─── /api/config ──────────────────────────────────────────────────────────────

export interface EngineConfigInnerDTO {
  environment:                  string
  anthropic_api_key:            string | null  // redacted in paper mode
  polymarket_api_url:           string
  polygon_chain_id:             number
  initial_bankroll:             number
  max_bet_percent:              number
  max_concurrent_positions:     number
  min_edge:                     number
  kelly_fraction:               number
  max_latency_ms:               number
  dashboard_update_interval_ms: number
  dashboard_api_enabled:        boolean
  dashboard_api_host:           string
  dashboard_api_port:           number
  log_level:                    string
}

export interface EngineConfigDTO {
  config:    EngineConfigInnerDTO
  timestamp: string  // ISO 8601
}

// ─── /api/survival ────────────────────────────────────────────────────────────

export interface SurvivalDTO {
  current_capital:        number
  initial_capital:        number
  capital_pct:            number
  state:                  string    // 'HEALTHY' | 'CAUTION' | 'DANGER' | 'CRITICAL'
  daily_burn_rate:        number
  days_of_runway:         number | null  // null when burn rate is 0
  recovery_trades_needed: number
  avg_win_size:           number
  daily_target:           number
  weekly_target:          number
  daily_pnl:              number
  weekly_pnl:             number
  behind_target_pct:      number
  kelly_modifier:         number
  min_edge_threshold:     number
  total_patterns:         number
  filtered_patterns:      number
  timestamp:              string    // ISO 8601
  patterns_summary:       unknown[] // empty in all captured samples; item shape TBD
}

// ─── /api/price-history ───────────────────────────────────────────────────────

export interface PricePointDTO {
  timestamp: string  // ISO 8601 with Z suffix (UTC)
  price:     number
}

export interface PriceHistoryDTO {
  current:   number
  history:   PricePointDTO[]
  timestamp: string  // ISO 8601 without Z (backend omits timezone on envelope)
}

// ─── Domain types (camelCase; timestamps as epoch ms) ─────────────────────────

export type EngineMode         = 'paper' | 'live'
export type EngineHealthStatus = 'online' | 'degraded' | 'offline'
export type SurvivalState      = 'HEALTHY' | 'CAUTION' | 'DANGER' | 'CRITICAL'

export interface HealthComponent {
  name:      string
  healthy:   boolean
  message:   string
  latencyMs: number | null
  checkedAt: number          // epoch ms
}

export interface HealthStats {
  healthChecks: number
  warnings:     number
  errors:       number
  restarts:     number
  lastWarning:  string | null
  lastError:    string | null
}

export interface EngineHealth {
  status:          EngineHealthStatus
  components:      HealthComponent[]
  checkDurationMs: number
  uptimeSeconds:   number
  stats:           HealthStats
  timestamp:       number    // epoch ms
}

export interface RuntimeComponents {
  bot:               boolean
  clobClient:        boolean
  executionEngine:   boolean
  marketFetcher:     boolean
  resolutionTracker: boolean
  pnlCalculator:     boolean
  telegramAlerter:   boolean
  healthMonitor:     boolean
  survivalBrain:     boolean
  paperTrader:       boolean
  consensusEngine:   boolean
  marketHistory:     boolean
  portfolioTracker:  boolean
  analyticsEngine:   boolean
}

export interface RuntimeStats {
  startedAt:      number    // epoch ms
  edgesDetected:  number
  ordersExecuted: number
  totalPnl:       number
}

export interface EngineRuntime {
  mode:          EngineMode
  initializedAt: number     // epoch ms
  components:    RuntimeComponents
  stats:         RuntimeStats
  timestamp:     number     // epoch ms
}

export interface EngineStats {
  currentPrice:       number
  feedLatencyMs:      number
  feedConnected:      boolean
  activePositions:    number
  edgesDetected:      number
  ordersExecuted:     number
  avgExecutionTimeMs: number | null
  uptimeSeconds:      number
  unrealizedPnl:      number
  realizedPnl:        number
  totalPnl:           number
  healthStatus:       EngineHealthStatus
  healthComponents:   HealthComponent[]
  runtimeComponents:  RuntimeComponents
  timestamp:          number  // epoch ms
}

export interface EngineConfig {
  environment:               EngineMode
  anthropicApiKey:           string | null
  polymarketApiUrl:          string
  polygonChainId:            number
  initialBankroll:           number
  maxBetPercent:             number
  maxConcurrentPositions:    number
  minEdge:                   number
  kellyFraction:             number
  maxLatencyMs:              number
  dashboardUpdateIntervalMs: number
  dashboardApiEnabled:       boolean
  dashboardApiHost:          string
  dashboardApiPort:          number
  logLevel:                  string
}

export interface SurvivalStatus {
  currentCapital:       number
  initialCapital:       number
  capitalPct:           number
  state:                SurvivalState
  dailyBurnRate:        number
  daysOfRunway:         number | null
  recoveryTradesNeeded: number
  avgWinSize:           number
  dailyTarget:          number
  weeklyTarget:         number
  dailyPnl:             number
  weeklyPnl:            number
  behindTargetPct:      number
  kellyModifier:        number
  minEdgeThreshold:     number
  totalPatterns:        number
  filteredPatterns:     number
  timestamp:            number    // epoch ms
  patternsSummary:      unknown[]
}

export interface PricePoint {
  ts:    number  // epoch ms
  price: number
}

export interface PriceHistory {
  current:   number
  history:   PricePoint[]
  timestamp: number  // epoch ms
}

// ─── / (API root — identity) ──────────────────────────────────────────────────
// Served at the host root, outside the /api prefix (like /health).

export interface EngineIdentityDTO {
  status:  string   // 'online'
  bot:     string   // 'BTC 5-Minute Trading Bot'
  version: string   // '1.0.0'
  runtime: {
    mode:           string
    initialized_at: string   // ISO 8601
    components:     RuntimeComponentsDTO
  }
}

/** Flattened identity — bot name/version plus the runtime snapshot the root embeds. */
export interface EngineIdentity {
  status:        EngineHealthStatus
  bot:           string
  version:       string
  mode:          EngineMode
  initializedAt: number             // epoch ms
  components:    RuntimeComponents
}

// ─── /api/execution/status ────────────────────────────────────────────────────
// The execution engine's own account of trading activity. This is the SOURCE OF
// TRADING TRUTH (see PROBEX_PRODUCT_SPEC.md §6.2) — runtime.stats can be seeded
// externally via POST /api/update-stats and must not be trusted for PnL.

export interface RetryStatsDTO {
  total_retries:        number
  successful_retries:   number
  failed_after_retries: number
  network_errors:       number
  balance_errors:       number
  invalid_order_errors: number
}

export interface RateLimitBucketDTO {
  name:               string   // e.g. 'market_fetch'
  rate_per_sec:       number
  capacity:           number
  current_tokens:     number
  total_requests:     number
  total_waits:        number
  wait_rate_pct:      number   // 0–100
  avg_wait_ms:        number
  total_wait_time_ms: number
}

export interface RateLimitBackoffDTO {
  active:           boolean
  until:            string | null   // ISO 8601 | null when inactive
  duration_ms:      number
  total_429s:       number
  recent_429s_5min: number
}

export interface ResolutionStatsDTO {
  total_resolved:    number
  wins:              number
  losses:            number
  auto_closed:       number
  resolution_errors: number
  tracked_positions: number
  is_running:        boolean
}

export interface ExecutionStatusDTO {
  available: boolean
  mode:      string
  status: {
    total_trades:          number
    wins:                  number
    losses:                number
    win_rate:              number   // 0–1
    total_pnl:             number
    active_positions:      number
    closed_positions:      number
    avg_execution_ms:      number
    fastest_trade_ms:      number
    slowest_trade_ms:      number
    balance:               number
    balance_cache_age_sec: number
    retry_stats:           RetryStatsDTO
    rate_limiting: {
      buckets: {
        market: RateLimitBucketDTO
        price:  RateLimitBucketDTO
        order:  RateLimitBucketDTO
      }
      backoff: RateLimitBackoffDTO
    }
    resolution_stats: ResolutionStatsDTO
  }
  timestamp: string   // ISO 8601
}

export interface RetryStats {
  totalRetries:       number
  successfulRetries:  number
  failedAfterRetries: number
  networkErrors:      number
  balanceErrors:      number
  invalidOrderErrors: number
}

export interface RateLimitBucket {
  name:            string
  ratePerSec:      number
  capacity:        number
  currentTokens:   number
  totalRequests:   number
  totalWaits:      number
  waitRatePct:     number   // 0–100
  avgWaitMs:       number
  totalWaitTimeMs: number
}

export interface RateLimitBackoff {
  active:          boolean
  until:           number | null   // epoch ms | null when inactive
  durationMs:      number
  total429s:       number
  recent429s5min:  number
}

export interface ResolutionStats {
  totalResolved:    number
  wins:             number
  losses:           number
  autoClosed:       number
  resolutionErrors: number
  trackedPositions: number
  isRunning:        boolean
}

export interface ExecutionStatus {
  available:          boolean
  mode:               EngineMode
  totalTrades:        number
  wins:               number
  losses:             number
  winRate:            number   // 0–1
  totalPnl:           number
  activePositions:    number
  closedPositions:    number
  avgExecutionMs:     number
  fastestTradeMs:     number
  slowestTradeMs:     number
  balance:            number
  balanceCacheAgeSec: number
  retryStats:         RetryStats
  rateLimitBuckets: {
    market: RateLimitBucket
    price:  RateLimitBucket
    order:  RateLimitBucket
  }
  backoff:            RateLimitBackoff
  resolutionStats:    ResolutionStats
  timestamp:          number   // epoch ms
}

// ─── /api/markets ─────────────────────────────────────────────────────────────
// Item schema not yet captured — always empty in Postman samples.

export interface EngineMarketsDTO {
  markets:   unknown[]
  count:     number
  timestamp: string  // ISO 8601
}

export interface EngineMarkets {
  markets:   unknown[]
  count:     number
  timestamp: number  // epoch ms
}

// ─── /api/positions ───────────────────────────────────────────────────────────

export interface EnginePositionsDTO {
  positions:            unknown[]
  count:                number
  total_unrealized_pnl: number
  timestamp:            string  // ISO 8601
}

export interface EnginePositions {
  positions:          unknown[]
  count:              number
  totalUnrealizedPnl: number
  timestamp:          number  // epoch ms
}

// ─── /api/events ──────────────────────────────────────────────────────────────

export interface EngineEventsDTO {
  events:    unknown[]
  count:     number
  limit:     number
  types:     string[] | null
  timestamp: string  // ISO 8601
}

export interface EngineEvents {
  events:    unknown[]
  count:     number
  limit:     number
  types:     string[] | null
  timestamp: number  // epoch ms
}

// ─── /api/edges ───────────────────────────────────────────────────────────────

export interface EngineEdgesDTO {
  edges:     unknown[]
  count:     number
  limit:     number
  timestamp: string  // ISO 8601
}

export interface EngineEdges {
  edges:     unknown[]
  count:     number
  limit:     number
  timestamp: number  // epoch ms
}

// ─── /api/execution/policy ──────────────────────────────────────────────────────
// Read-only description of the order-execution flow. Fully observed in the
// exported sample (Execution Policy.json). Never places orders.

export interface ExecutionRiskLimitsDTO {
  max_concurrent_positions: number
  max_bet_percent:          number
  kelly_fraction:           number
  max_latency_ms:           number
  minimum_order_size_usd:   number
}

export interface ExecutionOrderTemplateDTO {
  side:            string   // 'BUY'
  order_type:      string   // 'GTC'
  price_buffer:    number
  token_selection: string
  yes_price:       string
  no_price:        string
}

export interface ExecutionPolicyDTO {
  mode:                 string    // 'paper' | 'live'
  live_trading_enabled: boolean
  order_flow:           string[]
  risk_limits:          ExecutionRiskLimitsDTO
  order_template:       ExecutionOrderTemplateDTO
  known_limitations:    string[]
  timestamp:            string    // ISO 8601
}

export interface ExecutionRiskLimits {
  maxConcurrentPositions: number
  maxBetPercent:          number
  kellyFraction:          number
  maxLatencyMs:           number
  minimumOrderSizeUsd:    number
}

export interface ExecutionOrderTemplate {
  side:           string
  orderType:      string
  priceBuffer:    number
  tokenSelection: string
  yesPrice:       string
  noPrice:        string
}

export interface ExecutionPolicy {
  mode:               EngineMode
  liveTradingEnabled: boolean
  orderFlow:          string[]
  riskLimits:         ExecutionRiskLimits
  orderTemplate:      ExecutionOrderTemplate
  knownLimitations:   string[]
  timestamp:          number    // epoch ms
}

// ─── /api/execution/trades ──────────────────────────────────────────────────────
// Active + closed trade lists. Both arrays were empty in the exported sample
// (Execution Trades.json), so item shapes are not yet observed — kept unknown[]
// per the no-invented-fields rule; a mapper is added when a non-empty sample lands.

export interface ExecutionTradesDTO {
  active_positions: unknown[]
  closed_positions: unknown[]
  timestamp:        string    // ISO 8601
}

export interface ExecutionTrades {
  activePositions: unknown[]
  closedPositions: unknown[]
  timestamp:       number     // epoch ms
}

// ─── /api/paper-stats ───────────────────────────────────────────────────────────
// Paper-trading session performance. survival_states / edge_buckets /
// hourly_performance were empty in the exported sample (Paper Trading Stats.json)
// → item/value shapes left loose (unknown[] / Record<string, unknown>).

/** Aggregate performance stat for one bucket (edge-size bucket or hour-of-day).
 *  Confirmed shape from a real 2026-07-22 paper-stats capture — same shape
 *  reused for both edge_buckets values and hourly_performance values. */
export interface BucketPerformanceStatDTO {
  wins:      number
  losses:    number
  total_pnl: number
  win_rate:  number  // 0–100 (percentage, not a 0–1 fraction — confirmed from live sample)
}

export interface PaperTradingInnerDTO {
  session_start:       string    // ISO 8601
  initial_capital:     number
  current_capital:     number
  total_trades:        number
  wins:                number
  losses:              number
  pushes:              number
  pending:             number
  total_pnl:           number
  win_rate:            number    // 0–100 (percentage — confirmed 28.6 in live sample, not 0.286)
  avg_win:             number
  avg_loss:            number
  largest_win:         number
  largest_loss:        number
  /** [ISO timestamp, survival state] tuples — confirmed shape from live sample,
   *  e.g. ["2026-07-22T11:47:31Z", "WOUNDED"]. */
  survival_states:     [string, string][]
  /** Keyed by edge-size bucket label, e.g. "10%+", "5-10%". */
  edge_buckets:        Record<string, BucketPerformanceStatDTO>
  /** Keyed by hour-of-day as a string, e.g. "11", "12". */
  hourly_performance:  Record<string, BucketPerformanceStatDTO>
}

export interface PaperStatsDTO {
  available:     boolean
  paper_trading: PaperTradingInnerDTO
  timestamp:     string    // ISO 8601
}

export interface PaperTrading {
  sessionStart:      number    // epoch ms
  initialCapital:    number
  currentCapital:    number
  totalTrades:       number
  wins:              number
  losses:            number
  pushes:            number
  pending:           number
  totalPnl:          number
  winRate:           number    // 0–1 (normalized from the wire's 0–100 percentage)
  avgWin:            number
  avgLoss:           number
  largestWin:        number
  largestLoss:       number
  /** [epoch ms, survival state] pairs. */
  survivalStates:    [number, string][]
  edgeBuckets:       Record<string, BucketPerformanceStat>
  hourlyPerformance: Record<string, BucketPerformanceStat>
}

export interface BucketPerformanceStat {
  wins:     number
  losses:   number
  totalPnl: number
  winRate:  number  // 0–1 (normalized from the wire's 0–100 percentage)
}

export interface PaperStats {
  available:     boolean
  paperTrading:  PaperTrading
  timestamp:     number    // epoch ms
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3 (2026-07-22 redeploy) — 20 newly-live endpoints, all types derived
// directly from real captured payloads. Never invented. Item arrays with
// zero observed elements stay `unknown[]` per the existing parse-or-report
// convention (markets/positions/events/edges precedent) — a mapper is added
// only once a real, non-empty sample exists.
// ═══════════════════════════════════════════════════════════════════════════

// ─── /api/positions/history ──────────────────────────────────────────────────
// Envelope confirmed live; `history[]` empty in every capture so far — item
// shape unconfirmed, kept unknown[].

export interface PositionsHistoryDTO {
  available: boolean
  history:   unknown[]
  count:     number
  limit:     number
  timestamp: string  // ISO 8601
}

export interface PositionsHistory {
  available: boolean
  history:   unknown[]
  count:     number
  limit:     number
  timestamp: number  // epoch ms
}

// ─── /api/survival/patterns ──────────────────────────────────────────────────
// Item shape fully confirmed from a real, non-empty 2026-07-22 capture.

export interface SurvivalPatternItemDTO {
  key:          string   // e.g. "11|btc_5min|10%+"
  hour:         number   // 0–23
  market_type:  string   // e.g. "btc_5min"
  edge_bucket:  string   // e.g. "10%+", "5-10%"
  wins:         number
  losses:       number
  total_trades: number
  win_rate:     number   // 0–100 (percentage, confirmed)
  avg_pnl:      number
  is_filtered:  boolean
}

export interface SurvivalPatternsDTO {
  available:      boolean
  patterns:       SurvivalPatternItemDTO[]
  count:          number
  filtered_count: number
  timestamp:      string  // ISO 8601
}

export interface SurvivalPatternItem {
  key:          string
  hour:         number
  marketType:   string
  edgeBucket:   string
  wins:         number
  losses:       number
  totalTrades:  number
  winRate:      number   // 0–1 (normalized)
  avgPnl:       number
  isFiltered:   boolean
}

export interface SurvivalPatterns {
  available:     boolean
  patterns:      SurvivalPatternItem[]
  count:         number
  filteredCount: number
  timestamp:     number  // epoch ms
}

// ─── /api/consensus ───────────────────────────────────────────────────────────
// Global platform-wide consensus score. Fully confirmed from a real capture.

export interface ConsensusSignalsDTO {
  edge_direction:  number  // signed
  edge_confidence: number  // 0–1
  rsi_momentum:    number  // signed
  macd_trend:      number  // signed
  price_momentum:  number  // signed
}

export interface ConsensusInnerDTO {
  timestamp:     string   // ISO 8601
  score:         number   // signed, roughly -1..1
  confidence:    number   // 0–1
  signal_count:  number
  signals:       ConsensusSignalsDTO
  btc_price:     number
  interpretation: string  // e.g. "NEUTRAL" — only value observed so far
}

export interface ConsensusDTO {
  available: boolean
  consensus: ConsensusInnerDTO
  timestamp: string  // ISO 8601
}

export interface ConsensusSignals {
  edgeDirection:  number
  edgeConfidence: number
  rsiMomentum:    number
  macdTrend:      number
  priceMomentum:  number
}

export interface Consensus {
  available:      boolean
  scoreTimestamp: number  // epoch ms
  score:          number
  confidence:     number
  signalCount:    number
  signals:        ConsensusSignals
  btcPrice:       number
  interpretation: string
  timestamp:      number  // epoch ms
}

// ─── /api/consensus/bias ──────────────────────────────────────────────────────

export interface ConsensusBiasSplitDTO {
  yes_count:   number
  no_count:    number
  yes_percent: number  // 0–100
  no_percent:  number  // 0–100
}

export interface ConsensusConfidenceStatsDTO {
  average: number
  p50:     number
  p75:     number
  p90:     number
  min:     number
  max:     number
}

export interface ConsensusRecentTrendDTO {
  last_10_edges: number
  yes_count:     number
  no_count:      number
  bias:          string  // e.g. "NEUTRAL"
}

export interface ConsensusBiasDTO {
  available:    boolean
  total_edges:  number
  bias:         ConsensusBiasSplitDTO
  confidence:   ConsensusConfidenceStatsDTO
  recent_trend: ConsensusRecentTrendDTO
  timestamp:    string  // ISO 8601
}

export interface ConsensusBiasSplit {
  yesCount:   number
  noCount:    number
  yesPercent: number
  noPercent:  number
}

export interface ConsensusConfidenceStats {
  average: number
  p50:     number
  p75:     number
  p90:     number
  min:     number
  max:     number
}

export interface ConsensusRecentTrend {
  last10Edges: number
  yesCount:    number
  noCount:     number
  bias:        string
}

export interface ConsensusBias {
  available:   boolean
  totalEdges:  number
  bias:        ConsensusBiasSplit
  confidence:  ConsensusConfidenceStats
  recentTrend: ConsensusRecentTrend
  timestamp:   number  // epoch ms
}

// ─── /api/consensus/history ──────────────────────────────────────────────────
// Item shape fully confirmed from a real, non-empty capture.

export interface ConsensusHistoryPointDTO {
  timestamp:  string  // ISO 8601
  score:      number
  confidence: number
  btc_price:  number
}

export interface ConsensusHistoryDTO {
  available: boolean
  history:   ConsensusHistoryPointDTO[]
  timestamp: string  // ISO 8601
}

export interface ConsensusHistoryPoint {
  ts:         number  // epoch ms
  score:      number
  confidence: number
  btcPrice:   number
}

export interface ConsensusHistory {
  available: boolean
  history:   ConsensusHistoryPoint[]
  timestamp: number  // epoch ms
}

// ─── /api/research/reports ────────────────────────────────────────────────────
// Item shape fully confirmed from a real, non-empty capture. `details` varies
// by report `type` (market_conditions | edge_analysis | risk_assessment
// observed so far) — kept as an untyped record rather than inventing a
// discriminated union from 3 samples.

export interface ResearchReportItemDTO {
  type:          string
  title:         string
  summary:       string
  details:       Record<string, unknown>
  generated_at:  string  // ISO 8601
}

export interface ResearchReportsDTO {
  available: boolean
  reports:   ResearchReportItemDTO[]
  count:     number
  timestamp: string  // ISO 8601
}

export interface ResearchReportItem {
  type:        string
  title:       string
  summary:     string
  details:     Record<string, unknown>
  generatedAt: number  // epoch ms
}

export interface ResearchReports {
  available: boolean
  reports:   ResearchReportItem[]
  count:     number
  timestamp: number  // epoch ms
}

// ─── /api/portfolio (live snapshot) ───────────────────────────────────────────

export interface PortfolioBalanceDTO {
  current:        number
  cache_age_sec:  number | null
}

export interface PortfolioPositionsSummaryDTO {
  active:               unknown[]
  active_count:         number
  total_unrealized_pnl: number
}

export interface PortfolioPnlDTO {
  realized:   number
  unrealized: number
  total:      number
}

export interface PortfolioPerformanceInnerDTO {
  total_trades:      number
  wins:              number
  losses:            number
  win_rate:          number  // 0–100 (percentage, confirmed)
  avg_execution_ms:  number
}

export interface PortfolioSurvivalDTO {
  state:              string
  capital:            number
  capital_pct:        number
  kelly_modifier:     number
  min_edge_threshold: number
}

export interface PortfolioDTO {
  available:   boolean
  mode:        string
  balance:     PortfolioBalanceDTO
  positions:   PortfolioPositionsSummaryDTO
  pnl:         PortfolioPnlDTO
  performance: PortfolioPerformanceInnerDTO
  survival:    PortfolioSurvivalDTO
  btc_price:   number
  timestamp:   string  // ISO 8601
}

export interface PortfolioBalance {
  current:      number
  cacheAgeSec:  number | null
}

export interface PortfolioPositionsSummary {
  active:             unknown[]
  activeCount:        number
  totalUnrealizedPnl: number
}

export interface PortfolioPnl {
  realized:   number
  unrealized: number
  total:      number
}

export interface PortfolioPerformanceInner {
  totalTrades:    number
  wins:           number
  losses:         number
  winRate:        number  // 0–1 (normalized)
  avgExecutionMs: number
}

export interface PortfolioSurvival {
  state:            SurvivalState
  capital:          number
  capitalPct:       number
  kellyModifier:    number
  minEdgeThreshold: number
}

export interface Portfolio {
  available:   boolean
  mode:        EngineMode
  balance:     PortfolioBalance
  positions:   PortfolioPositionsSummary
  pnl:         PortfolioPnl
  performance: PortfolioPerformanceInner
  survival:    PortfolioSurvival
  btcPrice:    number
  timestamp:   number  // epoch ms
}

// ─── /api/balance ─────────────────────────────────────────────────────────────

export interface BalanceDTO {
  available:      boolean
  balance_usd:    number
  cache_age_sec:  number | null
  cache_fresh:    boolean
  timestamp:      string  // ISO 8601
}

export interface Balance {
  available:   boolean
  balanceUsd:  number
  cacheAgeSec: number | null
  cacheFresh:  boolean
  timestamp:   number  // epoch ms
}

// ─── /api/portfolio/history ───────────────────────────────────────────────────
// Item shape fully confirmed from a real, non-empty capture (107 snapshots observed).

export interface PortfolioHistoryPointDTO {
  timestamp:      string  // ISO 8601
  total_value:    number
  cash_balance:   number
  unrealized_pnl: number
  realized_pnl:   number
  position_count: number
  btc_price:      number
  win_rate:       number  // 0–100 (percentage, confirmed)
  total_trades:   number
}

export interface PortfolioHistoryDTO {
  available: boolean
  history:   PortfolioHistoryPointDTO[]
  timestamp: string  // ISO 8601
}

export interface PortfolioHistoryPoint {
  ts:             number  // epoch ms
  totalValue:     number
  cashBalance:    number
  unrealizedPnl:  number
  realizedPnl:    number
  positionCount:  number
  btcPrice:       number
  winRate:        number  // 0–1 (normalized)
  totalTrades:    number
}

export interface PortfolioHistory {
  available: boolean
  history:   PortfolioHistoryPoint[]
  timestamp: number  // epoch ms
}

// ─── /api/portfolio/summary ───────────────────────────────────────────────────

export interface PortfolioSummaryInnerDTO {
  current_value:        number
  initial_value:        number
  peak_value:           number
  total_return_pct:     number
  current_drawdown_pct: number
  snapshot_count:       number
  time_range_seconds:   number
  first_snapshot:       string  // ISO 8601
  last_snapshot:        string  // ISO 8601
  current_positions:    number
  current_win_rate:     number  // 0–100 (percentage, confirmed — matches paper-stats)
  total_trades:         number
}

export interface PortfolioSummaryDTO {
  available: boolean
  summary:   PortfolioSummaryInnerDTO
  timestamp: string  // ISO 8601
}

export interface PortfolioSummaryInner {
  currentValue:       number
  initialValue:       number
  peakValue:          number
  totalReturnPct:     number
  currentDrawdownPct: number
  snapshotCount:      number
  timeRangeSeconds:   number
  firstSnapshot:      number  // epoch ms
  lastSnapshot:       number  // epoch ms
  currentPositions:   number
  currentWinRate:     number  // 0–1 (normalized)
  totalTrades:        number
}

export interface PortfolioSummary {
  available: boolean
  summary:   PortfolioSummaryInner
  timestamp: number  // epoch ms
}

// ─── /api/portfolio/performance ───────────────────────────────────────────────

export interface PortfolioPerformancePeriodDTO {
  available:          boolean
  period_hours:       number
  start_value:        number
  end_value:          number
  value_change:       number
  return_pct:         number
  max_drawdown_pct:   number
  trades_in_period:   number
  snapshot_count:     number
}

export interface PortfolioPerformanceDTO {
  available:      boolean
  performance:    PortfolioPerformancePeriodDTO
  lookback_hours: number
  timestamp:      string  // ISO 8601
}

export interface PortfolioPerformancePeriod {
  available:       boolean
  periodHours:     number
  startValue:      number
  endValue:        number
  valueChange:     number
  returnPct:       number
  maxDrawdownPct:  number
  tradesInPeriod:  number
  snapshotCount:   number
}

export interface PortfolioPerformance {
  available:     boolean
  performance:   PortfolioPerformancePeriod
  lookbackHours: number
  timestamp:     number  // epoch ms
}

// ─── /api/analytics/segments, /signals, /top-segments, /hourly ───────────────
// All four confirmed live but empty in every capture so far (zero trade
// history to segment yet) — item shapes unconfirmed, kept unknown[].

export interface AnalyticsSegmentsDTO {
  available:    boolean
  segments:     unknown[]
  count:        number
  segment_type: string | null
  timestamp:    string  // ISO 8601
}

export interface AnalyticsSegments {
  available:   boolean
  segments:    unknown[]
  count:       number
  segmentType: string | null
  timestamp:   number  // epoch ms
}

export interface AnalyticsSignalsDTO {
  available: boolean
  signals:   unknown[]
  count:     number
  timestamp: string  // ISO 8601
}

export interface AnalyticsSignals {
  available: boolean
  signals:   unknown[]
  count:     number
  timestamp: number  // epoch ms
}

export interface AnalyticsTopSegmentsDTO {
  available:    boolean
  top_segments: unknown[]
  segment_type: string
  metric:       string
  limit:        number
  timestamp:    string  // ISO 8601
}

export interface AnalyticsTopSegments {
  available:   boolean
  topSegments: unknown[]
  segmentType: string
  metric:      string
  limit:       number
  timestamp:   number  // epoch ms
}

export interface AnalyticsHourlyDTO {
  available: boolean
  hourly:    unknown[]
  count:     number
  timestamp: string  // ISO 8601
}

export interface AnalyticsHourly {
  available: boolean
  hourly:    unknown[]
  count:     number
  timestamp: number  // epoch ms
}

// ─── /api/analytics/summary ───────────────────────────────────────────────────

export interface AnalyticsSummaryInnerDTO {
  total_trades_analyzed: number
  overall_win_rate:      number  // 0–100 (percentage, by convention with the rest of this backend)
  total_pnl:             number
  segment_count:         number
  signal_count:          number
  history_size:          number
}

export interface AnalyticsSummaryDTO {
  available: boolean
  summary:   AnalyticsSummaryInnerDTO
  timestamp: string  // ISO 8601
}

export interface AnalyticsSummaryInner {
  totalTradesAnalyzed: number
  overallWinRate:      number  // 0–1 (normalized)
  totalPnl:            number
  segmentCount:        number
  signalCount:         number
  historySize:         number
}

export interface AnalyticsSummary {
  available: boolean
  summary:   AnalyticsSummaryInner
  timestamp: number  // epoch ms
}

// ─── /api/paper/status ────────────────────────────────────────────────────────

export interface PaperStatusDTO {
  available:        boolean
  enabled:          boolean
  pending_trades:   number
  completed_trades: number
  timestamp:        string  // ISO 8601
}

export interface PaperStatus {
  available:       boolean
  enabled:         boolean
  pendingTrades:   number
  completedTrades: number
  timestamp:       number  // epoch ms
}

// ─── /api/system/metrics ──────────────────────────────────────────────────────

export interface SystemMetricsUptimeDTO {
  seconds:   number
  formatted: string  // e.g. "1h 18m 57s"
}

export interface SystemMetricsMemoryDTO {
  rss_mb: number
  vms_mb: number
}

export interface SystemMetricsCpuDTO {
  percent: number
}

export interface SystemMetricsDTO {
  available:      boolean
  uptime:         SystemMetricsUptimeDTO
  memory:         SystemMetricsMemoryDTO
  cpu:            SystemMetricsCpuDTO
  components:     RuntimeComponentsDTO
  event_log_size: number
  timestamp:      string  // ISO 8601
}

export interface SystemMetricsUptime {
  seconds:   number
  formatted: string
}

export interface SystemMetricsMemory {
  rssMb: number
  vmsMb: number
}

export interface SystemMetrics {
  available:    boolean
  uptime:       SystemMetricsUptime
  memoryMb:     SystemMetricsMemory
  cpuPercent:   number
  components:   RuntimeComponents
  eventLogSize: number
  timestamp:    number  // epoch ms
}

// ─── /api/trades/ledger ───────────────────────────────────────────────────────
// Envelope confirmed live; `ledger[]` empty in every capture so far — item
// shape unconfirmed, kept unknown[].

export interface TradesLedgerSummaryDTO {
  total_pnl: number
  wins:      number
  losses:    number
  win_rate:  number  // 0–100 (percentage, by convention)
}

export interface TradesLedgerDTO {
  available: boolean
  ledger:    unknown[]
  count:     number
  summary:   TradesLedgerSummaryDTO
  timestamp: string  // ISO 8601
}

export interface TradesLedgerSummary {
  totalPnl: number
  wins:     number
  losses:   number
  winRate:  number  // 0–1 (normalized)
}

export interface TradesLedger {
  available: boolean
  ledger:    unknown[]
  count:     number
  summary:   TradesLedgerSummary
  timestamp: number  // epoch ms
}

// ─── /api/execution/orders ────────────────────────────────────────────────────
// Envelope confirmed live; both arrays empty in every capture so far — item
// shape unconfirmed, kept unknown[].

export interface ExecutionOrdersDTO {
  available:     boolean
  active_orders: unknown[]
  closed_orders: unknown[]
  active_count:  number
  closed_count:  number
  total_count:   number
  timestamp:     string  // ISO 8601
}

export interface ExecutionOrders {
  available:    boolean
  activeOrders: unknown[]
  closedOrders: unknown[]
  activeCount:  number
  closedCount:  number
  totalCount:   number
  timestamp:    number  // epoch ms
}
