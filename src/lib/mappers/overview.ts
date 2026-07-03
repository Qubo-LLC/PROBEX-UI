// ─── Command Center mapper ────────────────────────────────────────────────────
//
// Maps engine store slices → CommandCenterVM for the Overview page.
//
// Design contract (PROBEX_PRODUCT_SPEC.md §4, §6):
//   • Each section is null until its backing endpoint has data — the page hides
//     sections rather than rendering fake zeros.
//   • Trading truth (PnL, trades, balance) comes from /api/execution/status,
//     NOT runtime.stats (spec §6.2).
//   • Attention items are derived, never invented: endpoint errors, feed
//     disconnects, survival state, unhealthy components, active backoff.

import type { ServiceState } from '@/lib/services/response'
import type {
  EngineStats, EngineIdentity, SurvivalStatus, ExecutionStatus,
  EngineEdges, EngineHealth, HealthComponent,
  EngineMode, SurvivalState, RuntimeComponents,
} from '@/types/engine'

// ─── View model ───────────────────────────────────────────────────────────────

export interface AttentionItem {
  severity: 'critical' | 'warning'
  /** Short operator-facing headline. */
  message:  string
  /** Optional supporting detail (component message, error text). */
  detail?:  string
}

export interface RuntimeComponentChip {
  key:    string
  label:  string
  active: boolean
}

export interface CommandCenterVM {
  /** null while / identity has not resolved. */
  identity: {
    botName:       string
    version:       string
    mode:          EngineMode
    initializedAt: number
  } | null

  /** null while /api/stats has not resolved. */
  vitals: {
    currentPrice:    number
    feedConnected:   boolean
    feedLatencyMs:   number
    uptimeSeconds:   number
    activePositions: number
    unrealizedPnl:   number
    realizedPnl:     number
  } | null

  /** Active edge count from the /api/edges envelope; null until resolved. */
  activeEdges: number | null

  /** null while /api/execution/status has not resolved. Trading truth. */
  trading: {
    balance:     number
    totalPnl:    number
    totalTrades: number
    wins:        number
    losses:      number
    winRate:     number   // 0–1
  } | null

  /** null while /api/survival has not resolved. */
  capital: {
    currentCapital: number
    initialCapital: number
    capitalPct:     number        // 0–1
    state:          SurvivalState
    dailyPnl:       number
    dailyTarget:    number
    dailyProgress:  number        // 0–1, capped
    weeklyPnl:      number
    weeklyTarget:   number
    weeklyProgress: number        // 0–1, capped
  } | null

  /** Runtime component chips (from stats aggregate); null until stats resolve. */
  runtimeComponents: RuntimeComponentChip[] | null

  /** Health probe components (from /health); null until resolved. */
  healthComponents: HealthComponent[] | null

  /** Derived operator alerts, most severe first. Empty = all clear. */
  attention: AttentionItem[]

  /** True while nothing has resolved yet (initial page load). */
  isLoading: boolean

  /** True when /api/stats errored — the engine API itself is unreachable. */
  isUnreachable: boolean
}

// ─── Component labels ─────────────────────────────────────────────────────────

const RUNTIME_LABELS: Record<keyof RuntimeComponents, string> = {
  bot:               'Bot Core',
  clobClient:        'CLOB Client',
  executionEngine:   'Execution Engine',
  marketFetcher:     'Market Fetcher',
  resolutionTracker: 'Resolution Tracker',
  pnlCalculator:     'PnL Calculator',
  telegramAlerter:   'Telegram Alerter',
  healthMonitor:     'Health Monitor',
  survivalBrain:     'Survival Brain',
  paperTrader:       'Paper Trader',
}

function toRuntimeChips(components: RuntimeComponents): RuntimeComponentChip[] {
  return (Object.keys(RUNTIME_LABELS) as Array<keyof RuntimeComponents>).map((key) => ({
    key,
    label:  RUNTIME_LABELS[key],
    active: components[key],
  }))
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

interface CommandCenterSlices {
  stats:     ServiceState<EngineStats>
  identity:  ServiceState<EngineIdentity>
  survival:  ServiceState<SurvivalStatus>
  execution: ServiceState<ExecutionStatus>
  edges:     ServiceState<EngineEdges>
  health:    ServiceState<EngineHealth>
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function toCommandCenter(s: CommandCenterSlices): CommandCenterVM {
  const stats     = s.stats.status     === 'success' ? s.stats.data     : null
  const identity  = s.identity.status  === 'success' ? s.identity.data  : null
  const survival  = s.survival.status  === 'success' ? s.survival.data  : null
  const execution = s.execution.status === 'success' ? s.execution.data : null
  const edges     = s.edges.status     === 'success' ? s.edges.data     : null
  const health    = s.health.status    === 'success' ? s.health.data    : null

  // ── Attention (most severe first) ─────────────────────────────────────────
  const critical: AttentionItem[] = []
  const warning:  AttentionItem[] = []

  if (s.stats.status === 'error') {
    // Distinguish "the whole API is down" from "one endpoint is failing" —
    // if any sibling endpoint responds, only /api/stats is broken.
    const othersAlive =
      s.survival.status === 'success' || s.execution.status === 'success' || s.identity.status === 'success'
    critical.push({
      severity: 'critical',
      message:  othersAlive ? 'Stats endpoint failing (/api/stats)' : 'Engine API unreachable',
      ...(s.stats.error?.message && { detail: s.stats.error.message }),
    })
  }
  if (stats && !stats.feedConnected) {
    critical.push({ severity: 'critical', message: 'Price feed disconnected' })
  }
  if (survival) {
    if (survival.state === 'CRITICAL' || survival.state === 'DANGER') {
      critical.push({
        severity: 'critical',
        message:  `Survival state: ${survival.state}`,
        detail:   `Capital at ${survival.capitalPct.toFixed(1)}% of initial`,
      })
    } else if (survival.state === 'CAUTION') {
      warning.push({
        severity: 'warning',
        message:  'Survival state: CAUTION',
        detail:   `Capital at ${survival.capitalPct.toFixed(1)}% of initial`,
      })
    }
  }
  for (const c of health?.components ?? []) {
    if (!c.healthy) {
      warning.push({ severity: 'warning', message: `Health check failing: ${c.name}`, detail: c.message })
    }
  }
  if (execution?.backoff.active) {
    warning.push({
      severity: 'warning',
      message:  'Rate-limit backoff active',
      detail:   `${execution.backoff.recent429s5min} × 429 in the last 5 minutes`,
    })
  }
  if (execution && !execution.available) {
    warning.push({ severity: 'warning', message: 'Execution engine reports unavailable' })
  }

  return {
    identity: identity && {
      botName:       identity.bot,
      version:       identity.version,
      mode:          identity.mode,
      initializedAt: identity.initializedAt,
    },

    vitals: stats && {
      currentPrice:    stats.currentPrice,
      feedConnected:   stats.feedConnected,
      feedLatencyMs:   stats.feedLatencyMs,
      uptimeSeconds:   stats.uptimeSeconds,
      activePositions: stats.activePositions,
      unrealizedPnl:   stats.unrealizedPnl,
      realizedPnl:     stats.realizedPnl,
    },

    activeEdges: edges ? edges.count : null,

    trading: execution && {
      balance:     execution.balance,
      totalPnl:    execution.totalPnl,
      totalTrades: execution.totalTrades,
      wins:        execution.wins,
      losses:      execution.losses,
      winRate:     execution.winRate,
    },

    capital: survival && {
      currentCapital: survival.currentCapital,
      initialCapital: survival.initialCapital,
      capitalPct:     survival.capitalPct / 100,
      state:          survival.state,
      dailyPnl:       survival.dailyPnl,
      dailyTarget:    survival.dailyTarget,
      dailyProgress:  survival.dailyTarget  > 0 ? clamp01(survival.dailyPnl  / survival.dailyTarget)  : 0,
      weeklyPnl:      survival.weeklyPnl,
      weeklyTarget:   survival.weeklyTarget,
      weeklyProgress: survival.weeklyTarget > 0 ? clamp01(survival.weeklyPnl / survival.weeklyTarget) : 0,
    },

    runtimeComponents: stats ? toRuntimeChips(stats.runtimeComponents) : null,
    healthComponents:  health ? health.components : null,

    attention: [...critical, ...warning],

    isLoading:
      s.stats.status === 'loading' &&
      s.identity.status === 'loading' &&
      s.survival.status === 'loading',

    isUnreachable: s.stats.status === 'error',
  }
}

// formatUptime moved to src/lib/display/engine.ts (shared display helpers).
