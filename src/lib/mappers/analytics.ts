// Analytics mappers — typed views over the analytics engine's self-report and
// the settled-trade ledger, for the Analytics page's investigation lens.
//
// ─── Why these exist ─────────────────────────────────────────────────────────
// /api/analytics/signals and /api/analytics/hourly are typed `unknown[]` in the
// DTOs because, until 2026-09-15, the backend had never returned a non-empty
// sample and there was no shape to code against. The first live sample now
// exists and is guarded here, field by field, the same way every other mapper
// guards the wire. The DTO types are deliberately NOT changed: this module
// narrows what it can prove and returns nothing for anything it cannot.
//
// ─── What the first sample showed, and what this module does about it ────────
// The analytics engine's outcome columns are not reconciled with the ledger.
// Live, 2026-09-15: /api/analytics/hourly reported hour 22 as 6 trades, 0 wins,
// 6 losses, total_pnl 0.00; the trade ledger for the same window had real
// negative P&L on those losses and a 33% win rate overall. Six losses with zero
// P&L is not a result, it is an unjoined join. The signal rows carried the same
// signature (correct_predictions 0, accuracy 0 on every signal).
//
// So the occurrence figures — which signals fired, how often, at what average
// edge — are surfaced as evidence, and the outcome figures are flagged as
// unreconciled so a reader never sees "0% accuracy" presented as a finding
// about the engine. `outcomesReconciled` is the one derived judgement here and
// its rule is stated inline.

import type { SettledTrade } from '@/types/engine'

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0

// ─── /api/analytics/signals ──────────────────────────────────────────────────

export interface SignalRow {
  name:             string
  occurrences:      number
  correct:          number
  /** 0–1 */
  accuracy:         number
  avgEdgeCorrect:   number
  avgEdgeIncorrect: number
}

export function parseSignalRows(items: unknown[]): SignalRow[] {
  const out: SignalRow[] = []
  for (const x of items) {
    if (!isRecord(x) || !str(x.signal_name) || !num(x.total_occurrences)) continue
    const acc = num(x.accuracy) ? x.accuracy : 0
    out.push({
      name:             x.signal_name,
      occurrences:      x.total_occurrences,
      correct:          num(x.correct_predictions) ? x.correct_predictions : 0,
      // The backend's percentage convention is 0–100 elsewhere; the first
      // sample was 0.0 so the unit could not be confirmed. Normalise anything
      // above 1 as a percentage, leave fractions alone.
      accuracy:         acc > 1 ? acc / 100 : acc,
      avgEdgeCorrect:   num(x.avg_edge_when_correct) ? x.avg_edge_when_correct : 0,
      avgEdgeIncorrect: num(x.avg_edge_when_incorrect) ? x.avg_edge_when_incorrect : 0,
    })
  }
  return out.sort((a, b) => b.occurrences - a.occurrences)
}

// ─── /api/analytics/hourly ───────────────────────────────────────────────────

export interface HourlyRow {
  hour:        number
  label:       string
  trades:      number
  wins:        number
  losses:      number
  totalPnl:    number
  avgEdgePct:  number
}

export function parseHourlyRows(items: unknown[]): HourlyRow[] {
  const out: HourlyRow[] = []
  for (const x of items) {
    if (!isRecord(x) || !num(x.hour) || !num(x.total_trades)) continue
    out.push({
      hour:       x.hour,
      label:      str(x.hour_label) ? x.hour_label : `${String(x.hour).padStart(2, '0')}:00`,
      trades:     x.total_trades,
      wins:       num(x.wins) ? x.wins : 0,
      losses:     num(x.losses) ? x.losses : 0,
      totalPnl:   num(x.total_pnl) ? x.total_pnl : 0,
      avgEdgePct: num(x.avg_edge_pct) ? x.avg_edge_pct : 0,
    })
  }
  return out.sort((a, b) => a.hour - b.hour)
}

/**
 * Whether the analytics engine's outcome columns can be believed.
 *
 * The rule: if the engine reports losses but zero total P&L across every hour
 * it has analysed, its outcomes are not joined to the ledger — a loss with no
 * P&L is not a settled trade. Anything else is treated as reconciled. This is
 * the narrowest test that catches the live signature without second-guessing
 * a backend that has started reporting real figures.
 */
export function outcomesReconciled(hourly: HourlyRow[]): boolean {
  if (hourly.length === 0) return true
  const losses = hourly.reduce((s, h) => s + h.losses, 0)
  const pnl = hourly.reduce((s, h) => s + Math.abs(h.totalPnl), 0)
  return !(losses > 0 && pnl === 0)
}

// ─── Settled-trade ledger aggregates ─────────────────────────────────────────
//
// The ledger carries, per trade, the asset, the window length, the edge the
// engine saw and whether it won. Grouping those is the most direct evidence
// available of WHERE the engine's results come from. It is computed here, in
// the browser, and every consumer marks it `derived`.

export interface LedgerGroup {
  key:      string
  trades:   number
  wins:     number
  /** 0–1 */
  winRate:  number
  totalPnl: number
  avgEdge:  number
}

function group(trades: SettledTrade[], keyOf: (t: SettledTrade) => string | null): LedgerGroup[] {
  const acc = new Map<string, { trades: number; wins: number; pnl: number; edge: number }>()
  for (const t of trades) {
    const k = keyOf(t)
    if (k === null) continue
    const g = acc.get(k) ?? { trades: 0, wins: 0, pnl: 0, edge: 0 }
    g.trades += 1
    g.wins += t.won ? 1 : 0
    g.pnl += t.pnl
    g.edge += t.edgePct
    acc.set(k, g)
  }
  return [...acc.entries()]
    .map(([key, g]) => ({ key, trades: g.trades, wins: g.wins, winRate: g.wins / g.trades, totalPnl: g.pnl, avgEdge: g.edge / g.trades }))
    .sort((a, b) => b.trades - a.trades)
}

export function groupByAsset(trades: SettledTrade[]): LedgerGroup[] {
  return group(trades, (t) => t.assetSymbol ?? null)
}

export function groupByWindow(trades: SettledTrade[]): LedgerGroup[] {
  return group(trades, (t) => (t.durationMinutes !== null ? `${t.durationMinutes}m` : null))
}

/** Edge-size buckets matching the survival brain's own vocabulary ("10%+"). */
export function groupByEdgeBucket(trades: SettledTrade[]): LedgerGroup[] {
  const bucket = (e: number) => (e >= 10 ? '10%+' : e >= 5 ? '5–10%' : e >= 2 ? '2–5%' : '<2%')
  const order = ['<2%', '2–5%', '5–10%', '10%+']
  return group(trades, (t) => bucket(t.edgePct)).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
}

/** Expectancy: mean P&L per settled trade. The one number that says whether
 *  the edge is paying, independent of how often it wins. */
export function expectancy(trades: SettledTrade[]): number | null {
  if (trades.length === 0) return null
  return trades.reduce((s, t) => s + t.pnl, 0) / trades.length
}
