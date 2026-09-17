// ─── Command Center mapper ────────────────────────────────────────────────────
//
// Maps engine store slices → CommandCenterVM for the Overview page.
//
// Design contract (PROBEX_PRODUCT_SPEC.md §4, §6):
//   • Each section is null until its backing endpoint has data — the page hides
//     sections rather than rendering fake zeros.
//   • Trading performance (PnL, trades, win rate) comes from the surface that
//     matches the engine's own execution mode — see lib/display/performanceSource.
//     It previously came from /api/execution/status unconditionally and was
//     labelled "trading truth"; in paper mode that surface correctly reads all
//     zeros (no live orders), so the Overview showed $0.00 · 0 trades while the
//     Portfolio page showed +$22.38 · 59 trades from the paper surface. Both
//     were right about their own endpoint; the product was incoherent.
//   • Live execution STATE is still surfaced, separately, as `execution` — it
//     is real and worth showing. It is simply not paper performance.
//   • Attention items are derived, never invented: endpoint errors, feed
//     disconnects, survival state, unhealthy components, active backoff.

import type { ServiceState } from '@/lib/services/response'
import type {
  EngineStats, EngineIdentity, SurvivalStatus, ExecutionStatus, PaperStats, EnginePositions,
  EngineEdges, EngineHealth, HealthComponent,
  EngineMode, SurvivalState, RuntimeComponents, EngineHealthStatus,
} from '@/types/engine'
import { survivalStateSeverity, survivalStateLabel } from '@/lib/display/engine'
import { selectPerformanceSource, type PerformanceView } from '@/lib/display/performanceSource'

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
    /** null when the engine does not report them (see EngineIdentity). */
    botName:       string | null
    version:       string | null
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

  /**
   * Performance for the engine's CURRENT mode, with its origin attached.
   * Null until the mode and the matching surface have both resolved — a
   * cockpit that cannot say which books it is reading must not print a P&L.
   *
   * `provenance.label` must be rendered wherever these figures are: in paper
   * mode they are simulated results, and presenting them unlabelled is the
   * thing this structure exists to prevent.
   */
  performance: PerformanceView

  /**
   * Live execution engine STATE — order flow, balance, positions.
   *
   * Kept separate from `performance` on purpose. In paper mode every counter
   * here is legitimately zero because no live order has been placed, and that
   * is information the operator wants; it is not, and must never be rendered
   * as, the paper session's performance.
   */
  execution: {
    available:       boolean
    mode:            EngineMode
    balance:         number
    activePositions: number
    closedPositions: number
    totalTrades:     number
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

  /** Overall health status ('online'|'degraded'|'offline'); null until resolved.
   *  V3 Phase 1 addition — feeds the Overview EnginePulseCard's condensed
   *  health summary (full per-probe detail remains the Admin console's job). */
  healthStatus: EngineHealthStatus | null

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
  consensusEngine:   'Consensus Engine',
  marketHistory:     'Market History',
  portfolioTracker:  'Portfolio Tracker',
  analyticsEngine:   'Analytics Engine',
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
  stats:      ServiceState<EngineStats>
  identity:   ServiceState<EngineIdentity>
  survival:   ServiceState<SurvivalStatus>
  execution:  ServiceState<ExecutionStatus>
  edges:      ServiceState<EngineEdges>
  health:     ServiceState<EngineHealth>
  paperStats: ServiceState<PaperStats>
  /** Position ledger — authoritative for open positions and unrealized P&L. */
  positions:  ServiceState<EnginePositions>
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function toCommandCenter(s: CommandCenterSlices): CommandCenterVM {
  const stats     = s.stats.status     === 'success' ? s.stats.data     : null
  const identity  = s.identity.status  === 'success' ? s.identity.data  : null
  const survival  = s.survival.status  === 'success' ? s.survival.data  : null
  const execution = s.execution.status === 'success' ? s.execution.data : null
  const edges     = s.edges.status     === 'success' ? s.edges.data     : null
  const health    = s.health.status    === 'success' ? s.health.data    : null
  const paper     = s.paperStats.status === 'success' ? s.paperStats.data : null
  const positions = s.positions.status  === 'success' ? s.positions.data  : null

  // Mode comes from the engine's own report. `identity` is derived from
  // /api/runtime (see live.ts getIdentity), and the execution surface reports
  // the same value independently — either confirms it, and neither is guessed.
  const engineMode: EngineMode | null = identity?.mode ?? execution?.mode ?? null

  const performance = selectPerformanceSource({
    engineMode,
    paperStats:      paper,
    executionStatus: execution,
  })

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
    // ─── The CONDITION, not the state name ─────────────────────────────────
    // This used to read "Survival state: Wounded". That put a single alarming
    // word on the Overview as if it were a global product status, which is a
    // misreading of what it is: the survival brain's classification of the
    // CAPITAL position, produced from P&L, burn rate and runway, and meaningful
    // only beside those inputs. Detached from them it was neither actionable
    // nor dismissible.
    //
    // The alert stays — the condition is real and the operator should see it —
    // but it now states the actionable fact (how much capital is left) rather
    // than the label. The engine's own word survives in `detail`, which
    // AttentionRow renders as the row's title, so nothing is hidden from an
    // operator who wants it.
    //
    // The state itself is presented in full where it can be understood:
    // Strategy (it moves the Kelly modifier and the edge threshold), Portfolio
    // and Survival (it is a conclusion about capital).
    //
    // Severity-driven so DEAD (and any future danger-class state) escalates to
    // a critical alert instead of being silently skipped by a state whitelist.
    const sev = survivalStateSeverity(survival.state)
    const message = `Capital at ${survival.capitalPct.toFixed(1)}% of initial`
    const detail = `The survival brain classifies this as ${survivalStateLabel(survival.state)}. See Strategy for the thresholds it moves, or Portfolio for the capital context.`
    if (sev === 'danger') {
      critical.push({ severity: 'critical', message, detail })
    } else if (sev === 'caution') {
      warning.push({ severity: 'warning', message, detail })
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
      // `/api/stats.active_positions` reports the LIVE execution engine's
      // positions, which is 0 in paper mode while the engine holds real ones.
      // The position ledger is authoritative — see lib/display/exposureSource.
      // Falls back to the stats figure only when the ledger has not resolved,
      // which is the one case where they cannot contradict each other.
      activePositions: positions?.count ?? stats.activePositions,
      unrealizedPnl:   positions?.totalUnrealizedPnl ?? stats.unrealizedPnl,
      realizedPnl:     stats.realizedPnl,
    },

    activeEdges: edges ? edges.count : null,

    performance,

    execution: execution && {
      available:       execution.available,
      mode:            execution.mode,
      balance:         execution.balance,
      activePositions: execution.activePositions,
      closedPositions: execution.closedPositions,
      totalTrades:     execution.totalTrades,
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
    healthStatus:      health ? health.status : null,

    attention: [...critical, ...warning],

    isLoading:
      s.stats.status === 'loading' &&
      s.identity.status === 'loading' &&
      s.survival.status === 'loading',

    isUnreachable: s.stats.status === 'error',
  }
}

// formatUptime moved to src/lib/display/engine.ts (shared display helpers).
