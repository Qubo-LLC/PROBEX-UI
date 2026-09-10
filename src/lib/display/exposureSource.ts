// Exposure provenance — which backend surface answers "what is open right now?"
//
// ─── The defect this fixes ───────────────────────────────────────────────────
// The Overview's Exposure panel read `/api/stats.active_positions`, falling back
// to `/api/execution/status.active_positions`. Both reported **0** while the
// engine held three open positions:
//
//   /api/stats.active_positions             0     ← live execution engine
//   /api/execution/status.active_positions  0     ← live execution engine
//   /api/positions.count                    3     ← actual open positions
//   /api/portfolio.positions.active_count   3     ← actual open positions
//
// The panel therefore rendered "0 of 10 max · Flat — no capital currently at
// risk" while capital was, in fact, at risk. That copy is the most dangerous
// thing this cockpit can say incorrectly.
//
// ─── Why this is not a random backend contradiction ──────────────────────────
// The four sources split cleanly into two agreeing pairs, along the SAME seam as
// the P&L surfaces (see performanceSource.ts): `/api/stats` and
// `/api/execution/status` describe the LIVE order-flow engine, which is
// correctly zero in paper mode because no live order has been placed.
// `/api/positions` and `/api/portfolio` describe the positions the engine is
// actually holding, in whichever mode it is running.
//
// So the rule is not "prefer /api/positions because it is bigger". It is:
// `/api/positions` is the position ledger and answers "what is open"; the
// execution surface answers "what has the live order-flow engine done", which is
// a different question and stays available as such.
//
// The original fallback chain also could not have worked. `??` only advances on
// null/undefined, and both surfaces send a real `0` — so the fallback never
// fired, and the comment justifying it ("stats is the faster poll, execution is
// the fallback when stats is failing") described behaviour the code did not have.

import type { EnginePositions, EngineStats, ExecutionStatus } from '@/types/engine'

export interface ExposureView {
  /** Open positions right now. Null until the position ledger resolves. */
  openPositions: number | null
  /**
   * Aggregate unrealized P&L across those positions, in USD.
   *
   * Taken from the same envelope as the count so the two cannot disagree — a
   * position count from one endpoint beside a P&L from another can present a
   * combination neither surface ever reported.
   */
  unrealizedPnl: number | null
  /** Endpoint the figures came from; null when nothing has resolved. */
  endpoint: string | null
  /**
   * Live order-flow positions, kept separate. In paper mode this is 0 and that
   * is correct and worth showing — it is simply not the exposure figure.
   */
  liveExecutionPositions: number | null
}

const POSITIONS_ENDPOINT = '/api/positions'

export interface ExposureSourceInput {
  /** Resolved /api/positions — the position ledger. */
  positions: EnginePositions | null
  /** Resolved /api/stats. Not used for the count; see the header. */
  stats: EngineStats | null
  /** Resolved /api/execution/status — live order flow. */
  executionStatus: ExecutionStatus | null
}

/**
 * Selects the exposure figures.
 *
 * Deliberately has NO fallback to `/api/stats` when the ledger is unavailable.
 * A wrong position count is worse than an absent one: "0 open positions" is an
 * assertion an operator will act on, whereas a withheld value prompts them to
 * look. The panel renders an awaiting state instead.
 */
export function selectExposureSource(input: ExposureSourceInput): ExposureView {
  const { positions, executionStatus } = input

  const liveExecutionPositions = executionStatus?.activePositions ?? null

  if (positions === null) {
    return {
      openPositions: null,
      unrealizedPnl: null,
      endpoint:      null,
      liveExecutionPositions,
    }
  }

  return {
    openPositions: positions.count,
    unrealizedPnl: positions.totalUnrealizedPnl,
    endpoint:      POSITIONS_ENDPOINT,
    liveExecutionPositions,
  }
}
