// Static mock data for IEngineService — mirrors the real Postman response
// shapes so that MockEngineService and LiveEngineService are interchangeable.
// Values are drawn from actual Postman captures where possible.

import type {
  EngineHealth, EngineRuntime, EngineStats, EngineConfig,
  SurvivalStatus, PriceHistory,
  EngineMarkets, EnginePositions, EngineEvents, EngineEdges,
  EngineIdentity, ExecutionStatus, RateLimitBucket,
} from '@/types/engine'

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
} as const

export const MOCK_ENGINE_HEALTH: EngineHealth = {
  status: 'online',
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
