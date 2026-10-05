// Static mock data for IEngineService — mirrors the real Postman response
// shapes so that MockEngineService and LiveEngineService are interchangeable.
// Values are drawn from actual Postman captures where possible.

import type {
  EngineHealth, EngineRuntime, EngineStats, EngineConfig,
  SurvivalStatus, PriceHistory,
  EngineMarkets, EnginePositions, EngineEvents, EngineEdges,
  EngineIdentity, ExecutionStatus, RateLimitBucket,
  ExecutionPolicy, ExecutionTrades, PaperStats,
  PositionsHistory, SurvivalPatterns,
  Consensus, ConsensusBias, ConsensusHistory,
  ResearchReports, Portfolio, Balance, PortfolioHistory, PortfolioSummary, PortfolioPerformance,
  AnalyticsSegments, AnalyticsSignals, AnalyticsSummary, AnalyticsTopSegments, AnalyticsHourly,
  PaperStatus, SystemMetrics, TradesLedger, ExecutionOrders,
  MarketsSummary, MarketPriceHistory, MarketHistoryPoint, MarketDetail,
} from '@/types/engine'

import type {
  MarketMakerMetrics, KalmanAssetState, KalmanLayer,
  KellyKalmanLayer, BayesianLayer, BrierLayer, ShapleyLayer,
  MathLayersStatus, MathRecommendationsEnvelope, PerformanceBuckets,
} from '@/types/quant'

const NOW = Date.now()
const UPTIME_MS = 6_036_291

const MOCK_COMPONENTS = {
  bot:               true,
  clobClient:        true,
  executionEngine:   true,
  marketFetcher:     true,
  resolutionTracker: true,
  pnlCalculator:     true,
  telegramAlerter:   false,
  healthMonitor:     true,
  survivalBrain:     true,
  paperTrader:       true,
  consensusEngine:   true,
  marketHistory:     true,
  portfolioTracker:  true,
  analyticsEngine:   true,
} as const

export const MOCK_ENGINE_HEALTH: EngineHealth = {
  status: 'online',
  // The mock returns domain shapes directly (no DTO round-trip), so it states
  // its own label rather than borrowing the live engine's "healthy" wording.
  statusLabel: 'online',
  components: [
    { name: 'price_feed', healthy: true,  message: 'Connected and receiving data',      latencyMs: 19.3, checkedAt: NOW },
    { name: 'main_loop',  healthy: true,  message: 'Running (last heartbeat 2.1s ago)', latencyMs: null, checkedAt: NOW },
    { name: 'api_access', healthy: true,  message: 'API responding normally',           latencyMs: 88.5, checkedAt: NOW },
    { name: 'memory',     healthy: true,  message: 'Memory usage: 112MB / 500MB',       latencyMs: null, checkedAt: NOW },
  ],
  checkDurationMs: 95.2,
  uptimeSeconds:   UPTIME_MS / 1_000,
  stats: { healthChecks: 305, warnings: 0, errors: 0, restarts: 0, lastWarning: null, lastError: null },
  timestamp: NOW,
}

export const MOCK_ENGINE_RUNTIME: EngineRuntime = {
  mode:          'paper',
  initializedAt: NOW - UPTIME_MS,
  components:    MOCK_COMPONENTS,
  stats: { startedAt: NOW - UPTIME_MS, edgesDetected: 0, ordersExecuted: 0, totalPnl: 0 },
  timestamp: NOW,
}

export const MOCK_ENGINE_STATS: EngineStats = {
  currentPrice:       60_545.17,
  feedLatencyMs:      365.5,
  feedConnected:      true,
  activePositions:    0,
  edgesDetected:      0,
  ordersExecuted:     0,
  avgExecutionTimeMs: null,
  uptimeSeconds:      UPTIME_MS / 1_000,
  unrealizedPnl:      0,
  realizedPnl:        0,
  totalPnl:           0,
  healthStatus:       'online',
  healthComponents:   MOCK_ENGINE_HEALTH.components,
  runtimeComponents:  MOCK_COMPONENTS,
  timestamp:          NOW,
}

export const MOCK_ENGINE_CONFIG: EngineConfig = {
  environment:               'paper',
  anthropicApiKey:           null,
  polymarketApiUrl:          'https://clob.polymarket.com',
  polygonChainId:            137,
  initialBankroll:           100,
  maxBetPercent:             20,
  maxConcurrentPositions:    10,
  minEdge:                   2,
  kellyFraction:             0.5,
  maxLatencyMs:              100,
  dashboardUpdateIntervalMs: 500,
  dashboardApiEnabled:       true,
  dashboardApiHost:          '0.0.0.0',
  dashboardApiPort:          8000,
  logLevel:                  'INFO',

  // Strategy filter parameters — the values observed live on 2026-09-09, so
  // mock mode renders the same shape the real engine does.
  minEdgeYes:                4,
  minEdgeNo:                 3,
  minVolume:                 5,
  minAlignment:              -0.5,
  blockedHours:              [],
  edgeConfirmationCount:     1,
  earlyExitThreshold:        -70,
  lowLiquidityStartHour:     0,
  lowLiquidityEndHour:       0,
}

export const MOCK_SURVIVAL_STATUS: SurvivalStatus = {
  currentCapital:       100,
  initialCapital:       100,
  capitalPct:           100,
  state:                'HEALTHY',
  dailyBurnRate:        0,
  daysOfRunway:         null,
  recoveryTradesNeeded: 0,
  avgWinSize:           0,
  dailyTarget:          1,
  weeklyTarget:         5,
  dailyPnl:             0,
  weeklyPnl:            0,
  behindTargetPct:      100,
  kellyModifier:        1,
  minEdgeThreshold:     1.6,
  totalPatterns:        0,
  filteredPatterns:     0,
  timestamp:            NOW,
  patternsSummary:      [],
}

// 50 deterministic price points matching the Postman capture range (~60 480 – 60 545).
export const MOCK_PRICE_HISTORY: PriceHistory = (() => {
  const history = Array.from({ length: 50 }, (_, i) => ({
    ts:    NOW - (50 - i) * 1_000,
    price: 60_480 + Math.sin(i / 5) * 32 + Math.sin(i / 11) * 14,
  }))
  return { current: history[history.length - 1]!.price, history, timestamp: NOW }
})()

export const MOCK_ENGINE_IDENTITY: EngineIdentity = {
  status:        'online',
  bot:           'BTC 5-Minute Trading Bot',
  version:       '1.0.0',
  mode:          'paper',
  initializedAt: NOW - UPTIME_MS,
  components:    MOCK_COMPONENTS,
}

const mockBucket = (name: string, ratePerSec: number, capacity: number): RateLimitBucket => ({
  name, ratePerSec, capacity,
  currentTokens: capacity,
  totalRequests: 0, totalWaits: 0, waitRatePct: 0, avgWaitMs: 0, totalWaitTimeMs: 0,
})

// Mirrors the 2026-07-02 /api/execution/status capture: fresh paper session, no trades.
export const MOCK_EXECUTION_STATUS: ExecutionStatus = {
  available:          true,
  mode:               'paper',
  totalTrades:        0,
  wins:               0,
  losses:             0,
  winRate:            0,
  totalPnl:           0,
  activePositions:    0,
  closedPositions:    0,
  avgExecutionMs:     0,
  fastestTradeMs:     0,
  slowestTradeMs:     0,
  balance:            100,
  balanceCacheAgeSec: 0,
  retryStats: {
    totalRetries: 0, successfulRetries: 0, failedAfterRetries: 0,
    networkErrors: 0, balanceErrors: 0, invalidOrderErrors: 0,
  },
  rateLimitBuckets: {
    market: mockBucket('market_fetch', 1 / 6, 5),
    price:  mockBucket('price_fetch',  1,     10),
    order:  mockBucket('order_submit', 0.5,   5),
  },
  backoff: { active: false, until: null, durationMs: 1_000, total429s: 0, recent429s5min: 0 },
  resolutionStats: {
    totalResolved: 0, wins: 0, losses: 0, autoClosed: 0,
    resolutionErrors: 0, trackedPositions: 0, isRunning: true,
  },
  timestamp: NOW,
}

// Empty-array mocks mirror the Postman samples — the engine has no active data yet.
export const MOCK_ENGINE_MARKETS: EngineMarkets   = { markets: [],   count: 0, timestamp: NOW }
export const MOCK_ENGINE_POSITIONS: EnginePositions = { positions: [], count: 0, totalUnrealizedPnl: 0, timestamp: NOW }
export const MOCK_ENGINE_EVENTS: EngineEvents     = { events: [],    count: 0, limit: 100, types: null, timestamp: NOW }
export const MOCK_ENGINE_EDGES: EngineEdges       = { edges: [],     count: 0, limit: 50,  timestamp: NOW }

// Mirrors the exported Execution Policy.json — read-only paper-mode order flow.
export const MOCK_EXECUTION_POLICY: ExecutionPolicy = {
  mode:               'paper',
  liveTradingEnabled: false,
  orderFlow: [
    'survival_brain_approval',
    'max_concurrent_position_check',
    'balance_fetch_or_cache',
    'kelly_position_sizing',
    'max_bet_percent_cap',
    'survival_position_modifier',
    'minimum_order_size_check',
    'order_creation',
    'rate_limited_submit_with_retry',
    'position_tracking',
  ],
  riskLimits: {
    maxConcurrentPositions: 10,
    maxBetPercent:          20,
    kellyFraction:          0.5,
    maxLatencyMs:           100,
    minimumOrderSizeUsd:    10,
  },
  orderTemplate: {
    side:           'BUY',
    orderType:      'GTC',
    priceBuffer:    0.01,
    tokenSelection: 'YES uses edge.yes_token_id; NO uses edge.no_token_id',
    yesPrice:       'min(edge.market_yes_price + 0.01, 0.99)',
    noPrice:        'min(edge.market_no_price + 0.01, 0.99)',
  },
  knownLimitations: [
    'YES/NO token ids now flow from market_fetcher to edge_detector to execution_engine.',
    'Verify Polymarket token ordering and order signing with tiny paper/live tests before scaling.',
    'This endpoint is read-only and never places orders.',
  ],
  timestamp: NOW,
}

// Mirrors Execution Trades.json — fresh session, no active or closed trades.
export const MOCK_EXECUTION_TRADES: ExecutionTrades = {
  activePositions: [],
  closedPositions: [],
  timestamp:       NOW,
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3 (2026-07-22 redeploy) — mock fixtures for the 20 newly-live
// endpoints, values drawn directly from real captured payloads (paper mode,
// live session mid-run — capital drawn down to $46.27, state CRITICAL).
// ═══════════════════════════════════════════════════════════════════════════

export const MOCK_POSITIONS_HISTORY: PositionsHistory = { available: true, history: [], count: 0, limit: 50, timestamp: NOW, total: null, hasMore: null }

export const MOCK_SURVIVAL_PATTERNS: SurvivalPatterns = {
  available: true,
  patterns: [
    { key: '11|btc_5min|10%+', hour: 11, marketType: 'btc_5min', edgeBucket: '10%+', wins: 4, losses: 11, totalTrades: 15, winRate: 0.267, avgPnl: -3.32, isFiltered: false },
    { key: '12|btc_5min|10%+', hour: 12, marketType: 'btc_5min', edgeBucket: '10%+', wins: 4, losses: 8, totalTrades: 12, winRate: 0.333, avgPnl: 0.0, isFiltered: false },
    { key: '12|btc_5min|5-10%', hour: 12, marketType: 'btc_5min', edgeBucket: '5-10%', wins: 1, losses: 3, totalTrades: 4, winRate: 0.25, avgPnl: -0.56, isFiltered: false },
    { key: '13|btc_5min|10%+', hour: 13, marketType: 'btc_5min', edgeBucket: '10%+', wins: 0, losses: 1, totalTrades: 1, winRate: 0.0, avgPnl: -1.73, isFiltered: false },
  ],
  count: 4, filteredCount: 0, timestamp: NOW,
}

export const MOCK_CONSENSUS: Consensus = {
  available: true, message: null,
  reading: {
    scoreTimestamp: NOW, score: -0.125, confidence: 0.333, signalCount: 5,
    signals: { edgeDirection: -0.306, edgeConfidence: 0.36, rsiMomentum: -0.5, macdTrend: 0.0, priceMomentum: 0.0 },
    allSignals: [
      { key: 'edge_direction', value: -0.306 }, { key: 'edge_confidence', value: 0.36 }, { key: 'rsi_momentum', value: -0.5 },
      { key: 'macd_trend', value: 0.0 }, { key: 'price_momentum', value: 0.0 },
    ],
    assetPrice: 65590.2, assetSymbol: 'BTC', interpretation: 'NEUTRAL',
  },
  timestamp: NOW,
}

export const MOCK_CONSENSUS_BIAS: ConsensusBias = {
  available: true, message: null,
  detail: {
    totalEdges: 2,
    bias: { yesCount: 1, noCount: 1, yesPercent: 50.0, noPercent: 50.0 },
    confidence: { average: 0.36, p50: 0.47, p75: 0.47, p90: 0.47, min: 0.25, max: 0.47 },
    recentTrend: { last10Edges: 2, yesCount: 1, noCount: 1, bias: 'NEUTRAL' },
  },
  timestamp: NOW,
}

export const MOCK_CONSENSUS_HISTORY: ConsensusHistory = (() => {
  // One point deliberately has a null price: the live engine renamed this
  // field out from under the frontend once already, and the mock should
  // exercise the branch that survives it rather than only the happy path.
  const history = Array.from({ length: 20 }, (_, i) => ({ ts: NOW - (20 - i) * 5_000, score: -0.125, confidence: 0.333, assetPrice: i === 0 ? null : 65590.2, assetSymbol: 'BTC' }))
  return { available: true, history, timestamp: NOW }
})()

export const MOCK_RESEARCH_REPORTS: ResearchReports = {
  available: true,
  reports: [
    { type: 'market_conditions', title: 'Current Market Conditions', summary: 'Monitoring 2 active BTC market(s)', details: { active_markets: 2, current_btc_price: 65590.2, feed_latency_ms: 210.64 }, generatedAt: NOW },
    { type: 'edge_analysis', title: 'Edge Detection Analysis', summary: 'Average edge: 4.00%, confidence: 0.36', details: { total_edges: 2, avg_edge_pct: 4.0, avg_confidence: 0.36, yes_edges: 1, no_edges: 1 }, generatedAt: NOW },
    { type: 'risk_assessment', title: 'Risk Assessment', summary: 'State: CRITICAL, Capital: 46.3%', details: { survival_state: 'CRITICAL', capital_pct: 46.3, kelly_modifier: 0.25, min_edge_threshold: 10.0, days_of_runway: 0.9 }, generatedAt: NOW },
  ],
  count: 3, timestamp: NOW,
}

export const MOCK_PORTFOLIO: Portfolio = {
  available: true, mode: 'paper',
  balance: { current: 100.0, cacheAgeSec: null },
  positions: { active: [], activeCount: 0, totalUnrealizedPnl: 0.0 },
  pnl: { realized: 0.0, unrealized: 0.0, total: 0.0 },
  performance: { totalTrades: 0, wins: 0, losses: 0, winRate: 0.0, avgExecutionMs: 0 },
  survival: { state: 'CRITICAL', capital: 46.27, capitalPct: 46.3, kellyModifier: 0.25, minEdgeThreshold: 10.0 },
  btcPrice: 65590.2, timestamp: NOW,
}

export const MOCK_BALANCE: Balance = { available: true, balanceUsd: 100.0, cacheAgeSec: null, cacheFresh: false, timestamp: NOW }

export const MOCK_PORTFOLIO_HISTORY: PortfolioHistory = (() => {
  const history = Array.from({ length: 30 }, (_, i) => ({
    ts: NOW - (30 - i) * 60_000, totalValue: 46.27 + Math.sin(i / 4) * 2, cashBalance: 46.27,
    unrealizedPnl: 0.0, realizedPnl: -18.54, positionCount: 3, btcPrice: 65590 + i * 2, winRate: 0.286, totalTrades: 21,
  }))
  return { available: true, history, timestamp: NOW }
})()

export const MOCK_PORTFOLIO_SUMMARY: PortfolioSummary = {
  available: true, message: null,
  summary: {
    currentValue: 46.27, initialValue: 100.0, peakValue: 100.0, totalReturnPct: -53.73, currentDrawdownPct: 53.73,
    snapshotCount: 107, timeRangeSeconds: 7994.1, firstSnapshot: NOW - 7_994_100, lastSnapshot: NOW,
    currentPositions: 4, currentWinRate: 0.286, totalTrades: 21,
  },
  timestamp: NOW,
}

export const MOCK_PORTFOLIO_PERFORMANCE: PortfolioPerformance = {
  available: true, message: null,
  performance: {
    periodHours: 24, startValue: 100.0, endValue: 46.27, valueChange: -53.73,
    returnPct: -53.73, maxDrawdownPct: 54.54, tradesInPeriod: 21, snapshotCount: 107,
  },
  lookbackHours: 24, timestamp: NOW,
}

export const MOCK_ANALYTICS_SEGMENTS: AnalyticsSegments = { available: true, segments: [], count: 0, segmentType: null, timestamp: NOW }
export const MOCK_ANALYTICS_SIGNALS: AnalyticsSignals = { available: true, signals: [], count: 0, timestamp: NOW }
export const MOCK_ANALYTICS_SUMMARY: AnalyticsSummary = {
  available: true,
  summary: { totalTradesAnalyzed: 0, overallWinRate: 0, totalPnl: 0, segmentCount: 0, signalCount: 0, historySize: 0 },
  timestamp: NOW,
}
export const MOCK_ANALYTICS_TOP_SEGMENTS: AnalyticsTopSegments = { available: true, topSegments: [], segmentType: 'edge_bucket', metric: 'win_rate', limit: 5, timestamp: NOW }
export const MOCK_ANALYTICS_HOURLY: AnalyticsHourly = { available: true, hourly: [], count: 0, timestamp: NOW }

export const MOCK_PAPER_STATUS: PaperStatus = { available: true, enabled: true, pendingTrades: 4, completedTrades: 28, totalPnl: 12.4, winRate: 0.643, timestamp: NOW }

export const MOCK_SYSTEM_METRICS: SystemMetrics = {
  available: true,
  uptime: { seconds: 4737.5, formatted: '1h 18m 57s' },
  memoryMb: { rssMb: 91.48, vmsMb: 296.63 },
  cpuPercent: 0.0,
  components: MOCK_COMPONENTS,
  eventLogSize: 200,
  timestamp: NOW,
}

export const MOCK_TRADES_LEDGER: TradesLedger = { available: true, ledger: [], count: 0, summary: { totalPnl: 0, wins: 0, losses: 0, winRate: 0 }, timestamp: NOW }

export const MOCK_EXECUTION_ORDERS: ExecutionOrders = { available: true, activeOrders: [], closedOrders: [], activeCount: 0, closedCount: 0, totalCount: 0, timestamp: NOW }

// Mirrors Paper Trading Stats.json — $100 session start, nothing traded yet.
export const MOCK_PAPER_STATS: PaperStats = {
  available: true,
  paperTrading: {
    sessionStart:      NOW - UPTIME_MS,
    initialCapital:    100,
    currentCapital:    100,
    totalTrades:       0,
    wins:              0,
    losses:            0,
    pushes:            0,
    pending:           0,
    totalPnl:          0,
    winRate:           0,
    avgWin:            0,
    avgLoss:           0,
    largestWin:        0,
    largestLoss:       0,
    survivalStates:    [],
    edgeBuckets:       {},
    hourlyPerformance: {},
  },
  timestamp: NOW,
  integrity: null,
  session: null,
}

// ─── Markets summary (2026-07-25) ─────────────────────────────────────────────
// Primary markets source while GET /api/markets hangs. Shape mirrors a real
// /api/markets/history/summary capture; prices are in cents (0–100) to match
// the domain convention applied by toMarketsSummary().

export const MOCK_MARKETS_SUMMARY: MarketsSummary = {
  available: true,
  markets: [
    {
      marketId:         '0xc325b6c6447818ed22565fff8c3f1c1e0d90ee1ae8c867276222e00c79cd0848',
      question:         'Bitcoin Up or Down - July 24, 5:30PM-5:45PM ET',
      snapshotCount:    6,
      timeRangeSeconds: 137.8,
      firstSnapshot:    NOW - 300_000,
      lastSnapshot:     NOW - 160_000,
      yesPrice:         { current: 7.5,  min: 2.5,  max: 31.5, avg: 21.67 },
      noPrice:          { current: 92.5, min: 68.5, max: 97.5, avg: 78.33 },
      btcPrice:         { current: 64099.4, min: 64099.4, max: 64100.1, avg: 64099.98 },
      volume:           { current: 22101.12, total: 132606.71, avg: 22101.12 },
    },
    {
      marketId:         '0x4c4d7b835105cb9639f2e5c9ddade041876cb6c36090a787873340c455e318e3',
      question:         'Bitcoin Up or Down - July 25, 2:30AM-2:45AM ET',
      snapshotCount:    4,
      timeRangeSeconds: 98.2,
      firstSnapshot:    NOW - 140_000,
      lastSnapshot:     NOW - 42_000,
      yesPrice:         { current: 38.5, min: 0.5,  max: 41.0, avg: 25.4 },
      noPrice:          { current: 61.5, min: 59.0, max: 99.5, avg: 74.6 },
      btcPrice:         { current: 63910.7, min: 63910.7, max: 63941.5, avg: 63925.3 },
      volume:           { current: 18420.55, total: 73682.2, avg: 18420.55 },
    },
  ],
  count: 2,
  timestamp: NOW,
}

/** Synthesises a short price history for any market id, so mock mode can drive
 *  the market-detail chart without a fixture per market. */
export function mockMarketPriceHistory(marketId: string, limit = 100): MarketPriceHistory {
  const points = Math.min(limit, 24)
  const history: MarketHistoryPoint[] = Array.from({ length: points }, (_, i) => {
    const ts       = NOW - (points - 1 - i) * 30_000
    const yesPrice = 20 + Math.sin(i / 3) * 12
    return {
      ts,
      marketId,
      question:        'Bitcoin Up or Down - mock market',
      yesPrice,
      noPrice:         100 - yesPrice,
      volume:          18000 + i * 120,
      btcPrice:        64000 + Math.sin(i / 4) * 60,
      baselinePrice:   64000,
      edgePct:         i % 4 === 0 ? 6.5 : null,
      durationMinutes: 15,
    }
  })
  return { available: true, marketId, history, count: history.length, limit, timestamp: NOW }
}

/**
 * GET /api/markets/:market_id — market + its history in one envelope.
 *
 * `hasClosed: false` and a future `closesAt`: the mock represents an ACTIVE
 * market, so the expiry branch in the detail page is exercised by the live
 * engine's genuinely-expired markets rather than faked here.
 */
export function mockMarketDetail(marketId: string): MarketDetail {
  const history = mockMarketPriceHistory(marketId, 100).history
  const latest  = history[history.length - 1]
  return {
    available: true,
    market: {
      id:                  marketId,
      question:            'Bitcoin Up or Down - mock market',
      baselinePrice:       64000,
      baselinePriceSource: 'feed',
      yesTokenId:          'mock-yes-token',
      noTokenId:           'mock-no-token',
      // Domain prices are 0–1, matching the wire; mockMarketPriceHistory
      // generates its points on a 0–100 scale, so this is not derived from it.
      yesPrice:            0.62,
      noPrice:             0.38,
      createdAt:           NOW - 15 * 60_000,
      closesAt:            NOW + 5 * 60_000,
      volume:              latest?.volume ?? 18_000,
      durationMinutes:     15,
      marketTier:          1,
      assetCategory:       'crypto',
      hasClosed:           false,
    },
    history,
    historyCount: history.length,
    timestamp:    NOW,
  }
}

// ─── Quant surface (2026-08-20) ───────────────────────────────────────────────
// Shaped from the real captured payloads so mock mode exercises the SAME code
// paths as live — including the "engine has learned nothing" branches, which is
// the state the live engine has actually been in. `MOCK_MATH_LAYERS_STATUS`
// deliberately keeps `regime: 'unknown'` and zero sample counts on some layers:
// a mock that pretends every layer is fitted would hide exactly the honesty
// gates (`initialised`, `hasPosterior`, `hasPredictions`, `hasAttribution`)
// these adapters exist to enforce.

const mockMarketMaker: MarketMakerMetrics = {
  overreactionCount: 0, underreactionCount: 0, overreactionRatio: 0,
  underreactionRatio: 0, meanReversionOpportunities: 0,
}

function mockKalmanAsset(symbol: string, price: number, regime: string): KalmanAssetState {
  return {
    symbol,
    priceEstimate:            price,
    priceUncertainty:         10,
    velocityEstimate:         regime === 'unknown' ? 0 : 1.4,
    velocityUncertainty:      3.16,
    regime,
    probabilityYes:           0.5,
    probabilityNo:            0.5,
    uncertainty:              0.003,
    meanReversionOpportunity: false,
    meanReversionStrength:    0,
    marketMaker:              mockMarketMaker,
    timestamp:                NOW,
    initialised:              regime !== 'unknown',
    // The mock uses a symmetric 0.5/0.5 seed, which IS a partition. The live
    // engine's values are not (0.88/0.20) — see KalmanAssetState.probabilityYes.
    probabilitiesArePartition: true,
  }
}

/** BTC fitted, ETH/SOL still on their seeds — covers both display branches. */
export const MOCK_KALMAN_LAYER: KalmanLayer = {
  available: true, multiAsset: true, activeFilters: 3, timestamp: NOW,
  assets: [
    mockKalmanAsset('BTC', 65590.2, 'sideways'),
    mockKalmanAsset('ETH', 3500, 'unknown'),
    mockKalmanAsset('SOL', 150, 'unknown'),
  ],
}

export const MOCK_BAYESIAN_LAYER: BayesianLayer = {
  regimeProbs: { bull: 0.33, bear: 0.33, sideways: 0.34 },
  mostLikelyRegime: 'sideways', regimeUncertainty: 1.585,
  edgeThresholdMean: 5, edgeThresholdStd: 2,
  positionSizeMean: 0.1, positionSizeStd: 0.05,
  parameterUncertainty: 0.447, winRateMean: 0.5, winRateStd: 0.289,
  totalTrades: 0, timestamp: NOW, hasPosterior: false,
}

export const MOCK_BRIER_LAYER: BrierLayer = {
  brierScore: 0, brierSkillScore: 0, calibrationStatus: 'excellent',
  totalPredictions: 0, isOverconfident: false, overconfidenceRatio: 1,
  isUnderconfident: false, underconfidenceRatio: 1, calibrationCurve: [],
  timestamp: NOW, hasPredictions: false,
}

const MOCK_SIGNALS = [
  'rsi_oversold', 'rsi_overbought', 'macd_bullish', 'macd_bearish',
  'momentum_up', 'momentum_down', 'mean_reversion', 'trend_following',
  'regime_bull', 'regime_bear',
]

export const MOCK_SHAPLEY_LAYER: ShapleyLayer = {
  totalTrades: 0, totalSignals: MOCK_SIGNALS.length,
  bestSignals: [], worstSignals: [],
  recommendations: { keep: [], remove: [], monitor: MOCK_SIGNALS },
  attributions: MOCK_SIGNALS.map((signal) => ({
    signal, shapleyValue: 0, sampleSize: 0, confidence: 0,
    isPositive: false, isSignificant: false,
  })),
  timestamp: NOW, hasAttribution: false,
}

export const MOCK_KELLY_KALMAN_LAYER: KellyKalmanLayer = {
  totalDecisions: 0, avgPositionSize: 0, avgKellyFraction: 0,
  avgUncertaintyPenalty: 0, minPositionSize: 0, maxPositionSize: 0,
  recentDecisions: [], message: 'No sizing history yet', hasDecisions: false,
}

export const MOCK_MATH_LAYERS_STATUS: MathLayersStatus = {
  available: true, message: null,
  kalman:   MOCK_KALMAN_LAYER,
  kelly:    MOCK_KELLY_KALMAN_LAYER,
  bayesian: MOCK_BAYESIAN_LAYER,
  brier:    MOCK_BRIER_LAYER,
  shapley:  MOCK_SHAPLEY_LAYER,
  timestamp: NOW,
}

export const MOCK_MATH_RECOMMENDATIONS: MathRecommendationsEnvelope = {
  available: true, message: null, timestamp: NOW,
  recommendations: {
    currentBtcPrice: 65590.2,
    assetRegimes: [
      { symbol: 'BTC', regime: 'sideways', priceUncertainty: 10, velocityEstimate: 1.4, probabilityYes: 0.5, probabilityNo: 0.5 },
      { symbol: 'ETH', regime: 'unknown',  priceUncertainty: 10, velocityEstimate: 0,   probabilityYes: 0.5, probabilityNo: 0.5 },
      { symbol: 'SOL', regime: 'unknown',  priceUncertainty: 10, velocityEstimate: 0,   probabilityYes: 0.5, probabilityNo: 0.5 },
    ],
    marketRegime: 'sideways', priceUncertainty: 10, velocityEstimate: 1.4,
    kalmanProbYes: 0.5, kalmanProbNo: 0.5,
    baseKellyFraction: 0.5, maxPositionPct: 0.15, minPositionPct: 0.01,
    bayesianWinRate: 0.5, bayesianEdgeThreshold: 5, bayesianPositionSize: 0.1,
    bayesianRegimeProbs: { bull: 0.33, bear: 0.33, sideways: 0.34 },
    brierScore: 0, calibrationStatus: 'excellent',
    isOverconfident: false, isUnderconfident: false,
    bestSignals: [], worstSignals: [],
    signalRecommendations: { keep: [], remove: [], monitor: MOCK_SIGNALS },
    overallRecommendation: 'SKIP', confidence: 'low',
  },
}

const MOCK_CATEGORIES = ['crypto', 'macro', 'politics', 'sports', 'entertainment', 'science_tech']

export const MOCK_PERFORMANCE_BY_CATEGORY: PerformanceBuckets = {
  available: true, message: null, timestamp: NOW,
  buckets: MOCK_CATEGORIES.map((key) => ({
    key,
    edgesDetected: key === 'crypto' ? 2 : 0,
    tradesTaken:   key === 'crypto' ? 1 : 0,
    wins: 0, losses: key === 'crypto' ? 1 : 0,
    totalPnl: key === 'crypto' ? -1.73 : 0,
    winRate: 0, avgEdgePct: key === 'crypto' ? 4.0 : 0,
    activePositions: 0, closedPositions: key === 'crypto' ? 1 : 0,
    hasActivity: key === 'crypto',
  })),
  anyActivity: true,
}

/** Empty on purpose — matches the live engine, which only materialises an asset
 *  bucket once that asset has actually traded. */
export const MOCK_PERFORMANCE_BY_ASSET: PerformanceBuckets = {
  available: true, message: null, buckets: [], anyActivity: false, timestamp: NOW,
}
