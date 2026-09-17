// Execution and paper-session presentation helpers.
//
// ─── Three different things (live-read 2026-09-16) ───────────────────────────
//   /api/execution/status    the REAL-order subsystem: its own process-scoped
//                            counters (0 trades, 0 fills, 0 retries), its own
//                            balance (100.00 — the untouched initial bankroll,
//                            because in paper mode it submits nothing), rate
//                            limiters, backoff, and the resolution tracker
//   /api/execution/policy    how an order WOULD be built: the engine's own
//                            ordered step list, risk limits, order template,
//                            and its own stated limitations
//   /api/paper-stats,        the paper SESSION's record: capital, trades,
//   /api/paper/status        outcomes, breakdowns — simulated, recorded, never
//                            sent anywhere
//
// Settlements are on Capital & Ledger; positions on Positions; the engine's
// reasoning on Mechanism. Nothing here explains WHY an order happened.

import type { ExecutionPolicy, BucketPerformanceStat } from '@/types/engine'
import type { WriteGateReason } from './writeGate'

// ─── Posture ──────────────────────────────────────────────────────────────────

export interface ExecutionPosture {
  word: string
  tone: 'positive' | 'warning' | 'danger' | 'neutral'
  sentence: string
}

/**
 * The execution posture, in words. Every state is a sentence with an explicit
 * mode word — colour only reinforces it. Sources: policy.mode,
 * policy.liveTradingEnabled, status.available, and the write gate's reason
 * (the same authority the order controls obey, so page and buttons agree).
 */
export function executionPosture(
  policy: Pick<ExecutionPolicy, 'mode' | 'liveTradingEnabled'> | null,
  available: boolean | null,
  gateReason: WriteGateReason,
): ExecutionPosture {
  const mode = policy?.mode ?? null
  const liveEnabled = policy?.liveTradingEnabled ?? null
  if (gateReason === 'engine-unreachable') {
    return { word: 'UNAVAILABLE', tone: 'danger', sentence: 'The execution engine is unreachable. No execution state can be confirmed and no order can be sent.' }
  }
  if (mode === null || liveEnabled === null) {
    return { word: 'UNCONFIRMED', tone: 'warning', sentence: 'The engine has not yet reported its execution mode. Nothing below is confirmed until it does.' }
  }
  if (mode === 'live' || liveEnabled === true) {
    return { word: 'LIVE', tone: 'danger', sentence: 'The engine is configured for LIVE trading — orders it places risk real capital.' }
  }
  if (available === false) {
    return { word: 'PAPER · SUBSYSTEM UNAVAILABLE', tone: 'warning', sentence: 'The engine is in PAPER mode and live trading is disabled, but the execution subsystem reports itself unavailable — figures below are its last known state.' }
  }
  return { word: 'PAPER', tone: 'positive', sentence: 'The engine is in PAPER mode and live trading is disabled. The real-order subsystem is idle: it submits nothing, and its counters below are its own, not the paper session’s.' }
}

// ─── Paper breakdowns ─────────────────────────────────────────────────────────

export interface BucketRow {
  key: string
  label: string
  trades: number
  wins: number
  losses: number
  winRate: number
  totalPnl: number
}

/** The engine keys hourly performance by the hour of its own clock, which is
 *  UTC (every naive timestamp it emits is UTC — see dto.ts). Labelled as such
 *  rather than shown as a bare "22:00" the viewer would read in local time. */
export function hourLabel(key: string): string {
  const h = Number(key)
  return Number.isInteger(h) && h >= 0 && h < 24 ? `${String(h).padStart(2, '0')}:00 UTC` : key
}

export function bucketRows(buckets: Record<string, BucketPerformanceStat>, label: (key: string) => string = (k) => k): BucketRow[] {
  return Object.entries(buckets).map(([key, s]) => ({
    key, label: label(key), trades: s.wins + s.losses, wins: s.wins, losses: s.losses, winRate: s.winRate, totalPnl: s.totalPnl,
  }))
}
