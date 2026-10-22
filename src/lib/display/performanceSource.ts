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

import type { EngineMode, ExecutionStatus } from '@/types/engine'
import type { Runway } from '@/types/runway'

/** Which set of books a figure came from. */
export type PerformanceSurface =
  /** The engine's sleeve ledgers (paper, research sizing) — /api/runway. */
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
  /**
   * Settled-position P&L, when the surface reports one SEPARATELY from
   * unrealized. Null, not 0, when the surface does not split it out — the paper
   * surface (sleeve ledgers) reports both; the live surface (/api/execution/status)
   * reports only a single combined `total_pnl` with no realized/unrealized split.
   * Never derive this by subtracting; only report what the surface actually sent.
   */
  realizedPnl:   number | null
  /** Open-position mark-to-market P&L. Same null-means-unreported rule as above. */
  unrealizedPnl: number | null
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

const PAPER_ENDPOINT = '/api/runway'
const LIVE_ENDPOINT  = '/api/execution/status'

/** The sleeves' combined books: settled positions, realized PnL, equity incl. the reserve. */
function paperMetrics(r: Runway): PerformanceMetrics {
  const sum = (k: string) => r.sleeves.reduce((n, s) => n + (s.counts[k] ?? 0), 0)
  const wins = sum('won'), losses = sum('lost')
  return {
    totalTrades: sum('settled'),
    wins,
    losses,
    winRate:     wins + losses > 0 ? wins / (wins + losses) : 0,
    // Historical note: this field has always meant "realized P&L from settled
    // positions", not realized+unrealized — kept as-is since other callers
    // already depend on that meaning. Use realizedPnl/unrealizedPnl below for a
    // figure that states which one it is.
    totalPnl:    r.combined?.realizedPnl ?? 0,
    realizedPnl:   r.combined?.realizedPnl ?? null,
    unrealizedPnl: r.combined?.unrealizedPnl ?? null,
    balance:     r.combined ? r.combined.equity + r.combined.reserve : null,
    pending:     r.combined?.openPositions ?? null,
  }
}

function liveMetrics(e: ExecutionStatus): PerformanceMetrics {
  return {
    totalTrades: e.totalTrades,
    wins:        e.wins,
    losses:      e.losses,
    winRate:     e.winRate,
    totalPnl:    e.totalPnl,
    // /api/execution/status reports one combined total_pnl and does not split it
    // into realized/unrealized — null, not a guess, so a caller cannot invent a
    // breakdown the live surface never sent.
    realizedPnl:   null,
    unrealizedPnl: null,
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
  /** Resolved /api/runway (the sleeve ledgers), or null while loading/errored. */
  runway:          Runway | null
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
  const { engineMode, runway, executionStatus } = input

  const paper = runway          === null ? null : paperMetrics(runway)
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
          label:    'Paper, research sizing',
          endpoint: PAPER_ENDPOINT,
          note:     'The engine is trading on paper in its sleeves; the sleeve ledgers have not been received yet.',
        },
        metrics:     null,
        counterpart: null,
        conflict:    null,
      }
    }
    return {
      provenance: {
        surface:  'paper',
        label:    'Paper, research sizing',
        endpoint: PAPER_ENDPOINT,
        note:     'Simulated results from the sleeve ledgers (CRYPTO, EVENTS): paper positions at a fixed research size. No real capital is at risk and no live orders have been placed.',
      },
      metrics: paper,
      counterpart: live === null ? null : {
        surface:  'live',
        label:    'Live execution',
        endpoint: LIVE_ENDPOINT,
        metrics:  live,
      },
      conflict: live === null ? null : detectConflict(paper, live, 'The sleeve ledgers', 'the live execution engine'),
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
