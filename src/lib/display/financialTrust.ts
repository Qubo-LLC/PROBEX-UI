// Financial trust — can the engine's capital, P&L, win rate and trade count be
// believed? (remediation spec §10 Financial Data Trust)
//
// ─── Why this exists ─────────────────────────────────────────────────────────
// The paper session that began 2026-09-21 reports $3.34 × 10⁴⁰ of capital and a
// 100% win rate. Every figure reached the screen byte-for-byte from the engine
// and was rendered, in green, as a result. The numbers were not a formatting
// bug; the trades behind them were impossible (498 of 500 retrievable trades
// entered after their market closed). Formatting an impossible value into a
// legitimate-looking figure is the failure this module exists to stop.
//
// ─── What it may and may not claim ───────────────────────────────────────────
//   • It NEVER alters, clamps, rounds or hides a value. It only says whether
//     the value can be believed.
//   • It NEVER grants VALID. Only the engine can verify its own books, and the
//     engine does not report integrity yet (proposed: `integrity` on
//     /api/paper-stats and /api/portfolio). Until it does, the frontend can
//     only RAISE a flag from evidence it can see — it cannot clear one.
//   • INVALID is the engine's word, not ours. A frontend-detected impossibility
//     is reported as UNTRUSTED and says it is a frontend check.
//
// ─── The frontend check ──────────────────────────────────────────────────────
// Re-entry after settlement: a binary market settles once, so a trade opened on
// a market at or after an earlier trade on that same market had already
// settled cannot be legitimate. The check needs no threshold and no data the
// wire does not already carry (market_id, opened_at, closed_at).

import type { SettledTrade } from '@/types/engine'

export type TrustState = 'valid' | 'untrusted' | 'invalid' | 'stale' | 'unavailable'

/** Where a trust reading came from. */
export type TrustBasis = 'engine' | 'frontend-check'

export interface TrustReading {
  state:    TrustState
  basis:    TrustBasis
  /** One line, for the figure it qualifies. */
  headline: string
  /** The evidence, stated plainly. */
  detail:   string
}

/** Proposed engine field (spec §K.3). Absent on today's wire. */
export interface EngineIntegrity {
  state:      'VALID' | 'INVALID' | 'UNTRUSTED' | 'STALE' | 'UNAVAILABLE'
  violations: { code: string; count: number }[]
}

type TradeLike = Pick<SettledTrade, 'marketId' | 'openedAt' | 'closedAt'>

/**
 * Count trades opened on a market that had ALREADY settled — an earlier trade
 * on the same market closed at or before this one opened. Threshold-free.
 */
export function countReentriesAfterSettlement(trades: readonly TradeLike[]): number {
  const ordered = [...trades]
    .filter((t) => Number.isFinite(t.openedAt))
    .sort((a, b) => a.openedAt - b.openedAt)
  const firstClose = new Map<string, number>()
  let offenders = 0
  for (const t of ordered) {
    const prior = firstClose.get(t.marketId)
    if (prior !== undefined && t.openedAt >= prior) offenders += 1
    if (Number.isFinite(t.closedAt) && (prior === undefined || t.closedAt < prior)) {
      firstClose.set(t.marketId, t.closedAt)
    }
  }
  return offenders
}

export interface TrustInput {
  /** Records the frontend can see (a page of the ledger — not necessarily all). */
  trades:          readonly TradeLike[] | null
  /** Status of the slice that feeds the financial figures. */
  sourceStatus:    'loading' | 'success' | 'empty' | 'error'
  /** Engine-declared integrity, once the backend provides it. */
  engineIntegrity?: EngineIntegrity | null
}

/**
 * Returns a reading when there is something to say, or null when there is not.
 * Null means "no evidence either way" — NOT "valid". Staleness is carried by
 * the existing certainty scale on each figure and is not repeated here.
 */
export function readFinancialTrust(input: TrustInput): TrustReading | null {
  if (input.sourceStatus === 'error') {
    return {
      state: 'unavailable',
      basis: 'frontend-check',
      headline: 'Unavailable',
      detail: 'The engine did not answer, so these figures cannot be shown as current.',
    }
  }

  const engine = input.engineIntegrity
  if (engine) {
    const summary = engine.violations.map((v) => `${v.code.toLowerCase().replace(/_/g, ' ')} (${v.count})`).join(', ')
    switch (engine.state) {
      case 'INVALID':
        return { state: 'invalid', basis: 'engine', headline: 'Invalid', detail: `The engine reports its books failed integrity checks: ${summary || 'see System'}.` }
      case 'UNTRUSTED':
        return { state: 'untrusted', basis: 'engine', headline: 'Unverified', detail: 'The engine cannot verify these figures.' }
      case 'UNAVAILABLE':
        return { state: 'unavailable', basis: 'engine', headline: 'Unavailable', detail: 'The engine reports its integrity source is unavailable.' }
      case 'STALE':
        return { state: 'stale', basis: 'engine', headline: 'Stale', detail: 'The engine reports these figures are older than their freshness bound.' }
      case 'VALID':
        return { state: 'valid', basis: 'engine', headline: 'Verified', detail: 'The engine verified these figures.' }
    }
  }

  const trades = input.trades ?? []
  const reentries = countReentriesAfterSettlement(trades)
  if (reentries > 0) {
    return {
      state: 'untrusted',
      basis: 'frontend-check',
      headline: 'Not trustworthy',
      detail:
        `${reentries.toLocaleString()} of the ${trades.length.toLocaleString()} most recent settled trades were opened on a market ` +
        'after that market had already settled, which no legitimate trade can do. Capital, P&L and win rate built on ' +
        'these trades cannot be read as performance. (Checked in this console; the engine does not yet report integrity.)',
    }
  }
  return null
}

/** True when a figure must not carry a gain/loss colour. */
export function suppressesTone(reading: TrustReading | null): boolean {
  return reading !== null && (reading.state === 'untrusted' || reading.state === 'invalid' || reading.state === 'unavailable')
}
