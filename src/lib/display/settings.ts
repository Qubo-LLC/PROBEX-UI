// Settings presentation helpers.
//
// ─── What Settings can and cannot change (live-read 2026-09-16) ─────────────
// The engine publishes its configuration on /api/config — 24 parameters — and
// accepts nothing back: PUT, POST and PATCH answer 405 with `allow: GET`, and
// no other endpoint writes configuration. /api/execution/policy is documented
// by the engine itself as read-only. So every engine value on the Settings
// page is POLICY the engine holds, and the only things this page can change
// are preferences kept in the browser: the theme, the accessibility switches,
// the starred markets and the personal profit targets.
//
// The full policy ledgers already exist elsewhere — Strategy › Mechanism
// (edge, filter and sizing rules), Execution › Engine (order policy and risk
// limits), System › Health & Config (runtime, connectivity, dashboard) — and
// this page does not repeat them. It indexes them: which parameters exist,
// how many the engine reported, and where each group is read in full.

import type { EngineConfig, ExecutionPolicy } from '@/types/engine'

// ─── Posture ──────────────────────────────────────────────────────────────────

export interface EnginePosture {
  /** The engine's own word for its environment, or null before it answers. */
  environment: string | null
  liveTradingEnabled: boolean | null
  sentence: string
}

export function enginePosture(config: Pick<EngineConfig, 'environment'> | null, policy: Pick<ExecutionPolicy, 'liveTradingEnabled'> | null): EnginePosture {
  const environment = config?.environment ?? null
  const live = policy?.liveTradingEnabled ?? null
  if (environment === null && live === null) {
    return { environment, liveTradingEnabled: live, sentence: 'The engine has not yet reported its configuration.' }
  }
  const envWord = environment === null ? 'an unreported' : environment.toUpperCase()
  const liveWord = live === null ? '' : live ? ' with live trading ENABLED' : ' with live trading disabled'
  return {
    environment,
    liveTradingEnabled: live,
    sentence: `The engine runs in ${envWord} environment${liveWord}. Its configuration is published read-only; nothing on this page changes it.`,
  }
}

// ─── The policy index ─────────────────────────────────────────────────────────

export type PolicyGroupId = 'thresholds' | 'sizing' | 'execution' | 'runtime'

export interface PolicyGroup {
  id: PolicyGroupId
  label: string
  /** The wire names, so the reader can match them against the engine's own docs. */
  parameters: string[]
  /** How many of them the engine reported a value for (null fields are absent). */
  reported: number
  source: string
}

/** A parameter counts as reported when the adapter produced a non-null value. */
function count(values: readonly unknown[]): number {
  return values.filter((v) => v !== null && v !== undefined).length
}

export function policyGroups(config: EngineConfig | null, policy: ExecutionPolicy | null): PolicyGroup[] {
  const c = config
  const p = policy
  return [
    {
      id: 'thresholds',
      label: 'Edge, filter and timing thresholds',
      parameters: ['min_edge', 'min_edge_yes', 'min_edge_no', 'min_volume', 'min_alignment', 'edge_confirmation_count', 'early_exit_threshold', 'blocked_hours', 'low_liquidity_start_hour', 'low_liquidity_end_hour'],
      reported: c ? count([c.minEdge, c.minEdgeYes, c.minEdgeNo, c.minVolume, c.minAlignment, c.edgeConfirmationCount, c.earlyExitThreshold, c.blockedHours, c.lowLiquidityStartHour, c.lowLiquidityEndHour]) : 0,
      source: '/api/config',
    },
    {
      id: 'sizing',
      label: 'Position sizing',
      parameters: ['initial_bankroll', 'kelly_fraction', 'max_bet_percent', 'max_concurrent_positions'],
      reported: c ? count([c.initialBankroll, c.kellyFraction, c.maxBetPercent, c.maxConcurrentPositions]) : 0,
      source: '/api/config',
    },
    {
      id: 'execution',
      label: 'Order policy and risk limits',
      parameters: ['mode', 'live_trading_enabled', 'order_flow', 'risk_limits', 'order_template', 'known_limitations', 'max_latency_ms'],
      reported: (p ? count([p.mode, p.liveTradingEnabled, p.orderFlow, p.riskLimits, p.orderTemplate, p.knownLimitations]) : 0) + (c ? count([c.maxLatencyMs]) : 0),
      source: '/api/execution/policy · /api/config',
    },
    {
      id: 'runtime',
      label: 'Runtime, connectivity and dashboard',
      parameters: ['environment', 'polymarket_api_url', 'polygon_chain_id', 'anthropic_api_key', 'log_level', 'dashboard_api_enabled', 'dashboard_api_host', 'dashboard_api_port', 'dashboard_update_interval_ms'],
      // The API key is reported as present-or-null; null here means "not
      // configured", which IS a reported fact, so it always counts.
      reported: c ? count([c.environment, c.polymarketApiUrl, c.polygonChainId, c.logLevel, c.dashboardApiEnabled, c.dashboardApiHost, c.dashboardApiPort, c.dashboardUpdateIntervalMs]) + 1 : 0,
      source: '/api/config',
    },
  ]
}

// ─── Data source ──────────────────────────────────────────────────────────────

/** The app's data mode in words the reader can act on. `reason` is the
 *  runtime's own explanation and is shown alongside, never replaced. */
export function dataModeWord(mode: 'live' | 'mock' | 'offline'): { word: string; meaning: string; tone: 'positive' | 'warning' | 'danger' } {
  switch (mode) {
    case 'live':    return { word: 'LIVE ENGINE', meaning: 'every figure in SYNATRA is read from the engine’s API', tone: 'positive' }
    case 'mock':    return { word: 'MOCK DATA', meaning: 'figures are fixtures — nothing shown is the engine', tone: 'warning' }
    case 'offline': return { word: 'OFFLINE', meaning: 'the engine could not be reached when this page was served; reload to retry', tone: 'danger' }
  }
}
