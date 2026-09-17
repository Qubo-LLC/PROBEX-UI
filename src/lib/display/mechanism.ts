// The engine's mechanism, read from the records that describe it.
//
// ─── What "strategy" is on this wire (re-captured 2026-09-16) ────────────────
// There is no strategy object: no name, type, version, on/off flag, decision
// log or per-trade rationale anywhere in the API. What the engine exposes is
// the MECHANISM in parts:
//
//   /api/config              the rules it was started with — thresholds,
//                            Kelly fraction, caps, timing gates
//   /api/survival            the survival brain's live adjustments — state,
//                            kelly_modifier, min_edge_threshold, and the
//                            pattern-filter tallies
//   /api/survival/patterns   the patterns it tracks (hour × window × edge
//                            bucket) and which it has STOPPED trading
//   /api/edges               the candidates it sees right now, with the
//                            indicators it read on each
//   /api/markets             what it scanned this cycle
//   /api/stats               process-scoped counters (edges detected, orders)
//   /api/paper-stats         the paper session's trades and outcomes
//   /api/execution/status    the REAL-order subsystem — legitimately 0 in
//                            paper mode
//   /api/events              the record of what it did (trade/edge/…)
//
// Everything a page can say about "the strategy" is one of those, or a
// comparison between two of them. Nothing below asserts a rule the contract
// does not document: how the three edge thresholds combine, the units of
// min_alignment and early_exit_threshold, and whether an edge event caused a
// trade event are all left as stated.
//
// ─── Two readings the old pipeline got wrong ─────────────────────────────────
//   survival.filtered_patterns  was shown as "passed". It is the number of
//     tracked patterns the brain has STOPPED trading — the live payload has
//     filtered_patterns 0 with every /survival/patterns row is_filtered:false.
//   execution.total_trades      was the EXECUTE counter. That subsystem places
//     real orders and is 0 in paper mode, while /api/paper-stats records 10
//     paper trades. In paper mode the paper session is the execution record.

import type { EngineConfig, SurvivalStatus, PaperTrading, ExecutionStatus, EngineStats, EngineMarkets, EngineEdges } from '@/types/engine'
import { deriveEngineFocus, isHaltedState, type EngineFocusState } from './engineFocus'
import type { EdgeRow } from '@/lib/mappers/edges'

// ─── Sizing (derived) ─────────────────────────────────────────────────────────

export interface SizingReading {
  baseKelly:      number
  modifier:       number
  /** base × modifier — derived on this screen. */
  effectiveKelly: number
  maxBetPercent:  number
  /** capital × max_bet_percent — derived on this screen. */
  maxStakeUsd:    number
}

export function sizingReading(cfg: EngineConfig | null, sv: SurvivalStatus | null): SizingReading | null {
  if (!cfg || !sv) return null
  return {
    baseKelly:      cfg.kellyFraction,
    modifier:       sv.kellyModifier,
    effectiveKelly: cfg.kellyFraction * sv.kellyModifier,
    maxBetPercent:  cfg.maxBetPercent,
    maxStakeUsd:    sv.currentCapital * (cfg.maxBetPercent / 100),
  }
}

// ─── Execution record (mode-aware) ───────────────────────────────────────────

export type ExecutionReading =
  /** Paper mode: the paper session is where trades are recorded. */
  | { kind: 'paper'; trades: number; wins: number; losses: number; pending: number; sessionStart: number }
  /** Live mode: the real-order subsystem. `isRunning` is the resolution tracker's own flag. */
  | { kind: 'live'; trades: number; wins: number; losses: number; isRunning: boolean }
  | { kind: 'unknown' }

export function executionReading(
  mode: string | null,
  paper: PaperTrading | null,
  execution: ExecutionStatus | null,
): ExecutionReading {
  const m = (mode ?? '').toLowerCase()
  if (m === 'paper' && paper) {
    return { kind: 'paper', trades: paper.totalTrades, wins: paper.wins, losses: paper.losses, pending: paper.pending, sessionStart: paper.sessionStart }
  }
  if (m !== 'paper' && m !== '' && execution) {
    return { kind: 'live', trades: execution.totalTrades, wins: execution.wins, losses: execution.losses, isRunning: execution.resolutionStats.isRunning }
  }
  return { kind: 'unknown' }
}

// ─── The verdict (A) ──────────────────────────────────────────────────────────

export interface MechanismVerdict {
  focus: EngineFocusState
  /** Markets scanned this cycle; null until /api/markets answers. */
  marketsScanned: number | null
  halted: boolean
}

/** The engine's current posture: what it sees and whether it can act. The
 *  same reading Overview leads with, applied to the strongest current edge. */
export function mechanismVerdict(input: {
  markets: EngineMarkets | null
  edges: EngineEdges | null
  edgeRows: readonly EdgeRow[] | null
  survival: SurvivalStatus | null
}): MechanismVerdict {
  const rows = input.edgeRows ?? []
  const top = rows.length > 0 ? rows.reduce((a, b) => (b.edgePct > a.edgePct ? b : a)) : null
  return {
    focus: deriveEngineFocus({ topEdge: top, edgesKnown: input.edges !== null, survival: input.survival }),
    marketsScanned: input.markets?.count ?? null,
    halted: isHaltedState(input.survival?.state),
  }
}

// ─── Pattern filter ───────────────────────────────────────────────────────────

export interface PatternFilterReading {
  tracked: number
  /** Patterns the brain has stopped trading — `filtered` in the engine's words. */
  stopped: number
}

export function patternFilterReading(sv: SurvivalStatus | null): PatternFilterReading | null {
  if (!sv) return null
  return { tracked: sv.totalPatterns, stopped: sv.filteredPatterns }
}

// ─── Process counters ─────────────────────────────────────────────────────────

export interface ProcessCounters {
  edgesDetected: number
  ordersExecuted: number
  uptimeSeconds: number
}

export function processCounters(stats: EngineStats | null): ProcessCounters | null {
  if (!stats) return null
  return { edgesDetected: stats.edgesDetected, ordersExecuted: stats.ordersExecuted, uptimeSeconds: stats.uptimeSeconds }
}
