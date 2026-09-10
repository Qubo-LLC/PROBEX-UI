// Performance provenance — which backend surface answers "how is the engine
// doing?", and how the cockpit is required to label that answer.
//
// ─── The problem this solves ─────────────────────────────────────────────────
// The engine keeps THREE independent sets of trading books, and on 2026-09-07
// they disagreed with each other on every figure that matters:
//
//                       /api/stats  /api/execution/status  /api/paper-stats  /api/analytics/*
//   total P&L                    0                      0             22.38                 0
//   trades                      62                      0                59                62
//   wins                         —                      0                44                 0
//   win rate                     —                      0             74.6%                 0
//
// None of those is a bug in isolation. The execution surface is the LIVE
// order-flow engine's own accounting, and it reads zero because the engine has
// placed no live orders — which is correct and is itself worth showing. The
// paper surface is the simulator's accounting, and it reads 59 trades at
// +$22.38 — also correct. `/api/analytics/*` records all 62 trades as losses,
// which contradicts both and is a backend defect (see docs/BACKEND_HANDOFF).
//
// The cockpit's bug was reading the LIVE surface unconditionally and labelling
// it "trading truth". In paper mode that renders $0.00 · 0 trades · 0% on the
// Overview while the Portfolio page — reading the paper surface — shows
// +$22.38 · 59 trades · 74.6%. Both pages were right about their own endpoint
// and the product as a whole was incoherent.
//
// ─── The rule ────────────────────────────────────────────────────────────────
// Select by the engine's OWN declared execution mode, and never merge the two:
//
//   paper mode → performance comes from the paper surface, labelled PAPER.
//                The live execution surface is still shown, as execution STATE
//                ("no live orders placed"), never as performance.
//   live mode  → performance comes from the live execution surface, which is
//                the only surface that accounts for real order flow.
//   unknown    → neither is selected. A cockpit that cannot say which books it
//                is reading must not present a P&L figure at all; picking one
//                optimistically is how the original defect was introduced.
//
// Two constraints follow from the product-owner decision on 2026-09-07, and
// both are load-bearing:
//   • Paper P&L is NEVER presented as universal truth. It is presented as the
//     paper session's result, named as such, wherever it appears.
//   • The existence of a second, disagreeing surface is NEVER hidden. When the
//     surfaces conflict the cockpit says so rather than silently preferring one.

import type { EngineMode, ExecutionStatus, PaperStats } from '@/types/engine'

/** Which set of books a figure came from. */
export type PerformanceSurface =
  /** The paper simulator's accounting — /api/paper-stats. */
  | 'paper'
  /** The live order-flow engine's accounting — /api/execution/status. */
  | 'live'
  /** Mode not yet confirmed, or the selected surface has not resolved. */
  | 'unknown'

/**
 * The performance figures the cockpit is allowed to show, with their origin
 * attached. Every field here is a confirmed wire field — see the endpoint noted
 * on `endpoint` and the field map in docs/DATA_PROVENANCE.md.
 */
export interface PerformanceMetrics {
  totalTrades: number
  wins:        number
  losses:      number
  /** 0–1. Normalised from the wire's 0–100 by the DTO adapters. */
  winRate:     number
  totalPnl:    number
  /** Account balance, when the selected surface reports one. */
  balance:     number | null
  /** Trades opened but not yet resolved, when the surface reports it. */
  pending:     number | null
}

export interface PerformanceProvenance {
  surface:  PerformanceSurface
  /** Operator-facing label, e.g. "Paper session". Never blank. */
  label:    string
  /** The endpoint these figures came from; null when nothing is selected. */
  endpoint: string | null
  /** One sentence stating what these numbers are and are not. */
  note:     string
}

export interface PerformanceView {
  provenance: PerformanceProvenance
  /** Null when no surface could be selected — the UI must show nothing. */
  metrics:    PerformanceMetrics | null
  /**
   * The surface that was NOT selected, kept deliberately separate so a page can
   * show live execution state alongside paper performance without the two ever
   * being added together or mistaken for one another.
   */
  counterpart: {
    surface:  PerformanceSurface
    label:    string
    endpoint: string
    metrics:  PerformanceMetrics
  } | null
  /**
   * Set when the unselected surface reports materially different totals. This
   * is surfaced to the operator, not resolved silently — the cockpit's job is
   * to make the engine's actual state observable, and "the engine's own books
   * disagree" is part of that state.
   */
  conflict: string | null
}

const PAPER_ENDPOINT = '/api/paper-stats'
const LIVE_ENDPOINT  = '/api/execution/status'

function paperMetrics(p: PaperStats): PerformanceMetrics {
  const t = p.paperTrading
  return {
    totalTrades: t.totalTrades,
    wins:        t.wins,
    losses:      t.losses,
    winRate:     t.winRate,
    totalPnl:    t.totalPnl,
    balance:     t.currentCapital,
    pending:     t.pending,
  }
}

function liveMetrics(e: ExecutionStatus): PerformanceMetrics {
  return {
    totalTrades: e.totalTrades,
    wins:        e.wins,
    losses:      e.losses,
    winRate:     e.winRate,
    totalPnl:    e.totalPnl,
    balance:     e.balance,
    // The execution surface has no pending concept — it reports positions, not
    // unresolved trades. Null rather than 0: we do not know, and zero would
    // claim we did.
    pending:     null,
  }
}

/**
 * Do the two surfaces disagree in a way the operator should be told about?
 *
 * Deliberately narrow. In paper mode the live surface reading all zeros is the
 * EXPECTED, correct state — no live orders have been placed — and flagging it
 * would fire permanently and train the operator to ignore the signal. A
 * conflict is only reported when both surfaces claim to have traded and their
 * totals differ, which is the case that indicates a genuine accounting
 * disagreement rather than an idle engine.
 */
function detectConflict(
  selected:    PerformanceMetrics,
  counterpart: PerformanceMetrics,
  selectedLabel:    string,
  counterpartLabel: string,
): string | null {
  const bothTraded = selected.totalTrades > 0 && counterpart.totalTrades > 0
  if (!bothTraded) return null
  if (selected.totalTrades === counterpart.totalTrades && selected.totalPnl === counterpart.totalPnl) return null
  return (
    `${selectedLabel} reports ${selected.totalTrades} trades, ` +
    `${counterpartLabel} reports ${counterpart.totalTrades}. ` +
    'The engine is keeping two sets of books that do not agree.'
  )
}

export interface PerformanceSourceInput {
  /** The engine's own declared execution mode; null until confirmed. */
  engineMode:      EngineMode | null
  /** Resolved /api/paper-stats, or null while loading/errored. */
  paperStats:      PaperStats | null
  /** Resolved /api/execution/status, or null while loading/errored. */
  executionStatus: ExecutionStatus | null
}

/**
 * Selects the performance surface for the engine's current mode.
 *
 * Mode is read from the engine itself (`/api/runtime`, `/api/execution/status`
 * and `/api/portfolio` all report it identically), never inferred from which
 * surface happens to have data — inferring it would reintroduce exactly the
 * conflation this module removes.
 */
export function selectPerformanceSource(input: PerformanceSourceInput): PerformanceView {
  const { engineMode, paperStats, executionStatus } = input

  const paper = paperStats      === null ? null : paperMetrics(paperStats)
  const live  = executionStatus === null ? null : liveMetrics(executionStatus)

  // ── Mode unconfirmed ──────────────────────────────────────────────────────
  if (engineMode === null) {
    return {
      provenance: {
        surface:  'unknown',
        label:    'Source unconfirmed',
        endpoint: null,
        note:     'The engine has not reported its execution mode, so no performance figures can be attributed.',
      },
      metrics:     null,
      counterpart: null,
      conflict:    null,
    }
  }

  // ── Paper mode ────────────────────────────────────────────────────────────
  if (engineMode === 'paper') {
    if (paper === null) {
      return {
        provenance: {
          surface:  'unknown',
          label:    'Paper session',
          endpoint: PAPER_ENDPOINT,
          note:     'The engine is trading on paper; its session results have not been received yet.',
        },
        metrics:     null,
        counterpart: null,
        conflict:    null,
      }
    }
    return {
      provenance: {
        surface:  'paper',
        label:    'Paper session',
        endpoint: PAPER_ENDPOINT,
        note:     'Simulated results from the paper-trading session. No real capital is at risk and no live orders have been placed.',
      },
      metrics: paper,
      counterpart: live === null ? null : {
        surface:  'live',
        label:    'Live execution',
        endpoint: LIVE_ENDPOINT,
        metrics:  live,
      },
      conflict: live === null ? null : detectConflict(paper, live, 'The paper session', 'the live execution engine'),
    }
  }

  // ── Live mode ─────────────────────────────────────────────────────────────
  // The execution engine's own accounting is the only surface that reflects
  // real order flow; the paper simulator's books are irrelevant to a live
  // engine's performance and are demoted to counterpart, not blended in.
  if (live === null) {
    return {
      provenance: {
        surface:  'unknown',
        label:    'Live execution',
        endpoint: LIVE_ENDPOINT,
        note:     'The engine is trading live; its execution status has not been received yet.',
      },
      metrics:     null,
      counterpart: null,
      conflict:    null,
    }
  }
  return {
    provenance: {
      surface:  'live',
      label:    'Live execution',
      endpoint: LIVE_ENDPOINT,
      note:     'Real order flow executed by the engine. These figures represent capital actually at risk.',
    },
    metrics: live,
    counterpart: paper === null ? null : {
      surface:  'paper',
      label:    'Paper session',
      endpoint: PAPER_ENDPOINT,
      metrics:  paper,
    },
    conflict: null,
  }
}
