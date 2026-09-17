// Capital presentation helpers — what the engine's account records can
// honestly say about where the capital is and how it got there.
//
// ─── What exists on this wire (live-read 2026-09-16 09:11Z) ──────────────────
//   /api/portfolio          mode, balance.current, pnl {realized, unrealized},
//                           positions summary — the engine's live account ledger
//   /api/balance            balance_usd (+ cache freshness) — same figure
//   /api/paper-stats        initial_capital, current_capital, session_start
//   /api/positions          open positions with cost basis
//   /api/trades/ledger      every settled trade with its realized P&L
//   /api/execution/status   the REAL-order executor's balance — 100.00, the
//                           untouched initial bankroll, because it places no
//                           orders in paper mode
//   /api/portfolio/summary  the SNAPSHOT series' value — 33 h old at audit,
//                           and larger than the ledger because a position
//                           open at the last snapshot later lost
//
// There is NO wallet primitive: no deposits, withdrawals, fees, transfers,
// cash-vs-equity split beyond balance and unrealized P&L, and no transaction
// history. The only thing that moves the balance is a settled trade — so
// the settled-trade ledger IS the capital-movement ledger, and a running
// balance can be derived from it and CHECKED against the reported balance.
// That check is the one derivation this module makes, and it says whether it
// held.

import type { SettledTrade } from '@/types/engine'

export interface Movement {
  trade: SettledTrade
  /** Balance after this settlement, walking from the initial capital in
   *  settlement order. Derived. */
  balanceAfter: number
}

/** Newest-first movements with the balance after each, from the initial
 *  capital forward. */
export function capitalMovements(initialCapital: number, trades: readonly SettledTrade[]): Movement[] {
  const ordered = [...trades].sort((a, b) => a.closedAt - b.closedAt)
  let running = initialCapital
  const out: Movement[] = []
  for (const t of ordered) {
    running += t.pnl
    out.push({ trade: t, balanceAfter: running })
  }
  return out.reverse()
}

export type Reconciliation =
  /** initial + Σ realized equals the reported balance (within a cent). */
  | { kind: 'reconciles'; sumPnl: number; endsAt: number }
  /** They differ, and by how much — stated, never hidden. */
  | { kind: 'differs'; sumPnl: number; endsAt: number; reported: number; gap: number }
  /** The ledger page is capped below the engine's count, so the sum cannot
   *  be claimed complete. */
  | { kind: 'incomplete'; shown: number; total: number }

/** A cent: two accounting surfaces that agree to the cent agree. */
const TOLERANCE = 0.005

export function reconcile(
  initialCapital: number,
  trades: readonly SettledTrade[],
  reportedBalance: number,
  ledgerTotal: number,
): Reconciliation {
  if (trades.length < ledgerTotal) return { kind: 'incomplete', shown: trades.length, total: ledgerTotal }
  const sumPnl = trades.reduce((s, t) => s + t.pnl, 0)
  const endsAt = initialCapital + sumPnl
  const gap = reportedBalance - endsAt
  return Math.abs(gap) <= TOLERANCE
    ? { kind: 'reconciles', sumPnl, endsAt }
    : { kind: 'differs', sumPnl, endsAt, reported: reportedBalance, gap }
}
