// Consensus presentation helpers — what the engine's signal snapshot can
// honestly be read as.
//
// ─── What /api/consensus is (re-captured 2026-09-16 08:40Z) ──────────────────
// One reading: `score` (signed), `confidence` (0–1), `interpretation` (the
// engine's own word, e.g. "MODERATE NO"), `signal_count`, and `signals` — a
// record of eight named numbers. Both the composite and its interpretation
// are the ENGINE's: nothing on this screen weights or combines the signals.
//
// The reading carries its own `timestamp` — the moment it was computed — and
// the envelope carries another, the moment the request was served. They must
// not be confused: at the audit the envelope said "now" and the reading said
// 33 hours earlier. That reading's timestamp coincides, to the millisecond,
// with the last edge-detection event in the log, which is the concrete basis
// for saying the composite is computed per edge-detection cycle and has had
// no cycle to refresh in since.
//
// ─── What is NOT known ───────────────────────────────────────────────────────
// The scale of any signal. The observed values suggest signed [−1, 1] for the
// direction-like keys and [0, 1] for the *_confidence keys, but the contract
// documents neither, so values are printed as reported and only their SIGN —
// a property of the number itself — is drawn. No signal is called "bullish",
// "strong" or "weak" here; the only interpretation shown is the engine's.

import type { ConsensusReading } from '@/types/engine'
import type { EventRow } from '@/lib/mappers/events'
import { formatAge } from './freshness'

// ─── Freshness of the READING (not of the poll) ──────────────────────────────

/** Past this, a reading is old enough that "current" would overstate it. The
 *  composite is recomputed per edge-detection cycle, and the engine trades
 *  5- and 15-minute windows — a quarter hour without a cycle is a real gap. */
export const READING_STALE_AFTER_MS = 15 * 60_000

export interface ReadingFreshness {
  ageMs: number
  /** "33h 11m ago" — the textual carrier for the stale state. */
  ageLabel: string
  stale: boolean
}

export function readingFreshness(reading: Pick<ConsensusReading, 'scoreTimestamp'>, now: number = Date.now()): ReadingFreshness {
  const ageMs = Math.max(0, now - reading.scoreTimestamp)
  return { ageMs, ageLabel: formatAge(ageMs), stale: ageMs > READING_STALE_AFTER_MS }
}

// ─── The signal ledger ────────────────────────────────────────────────────────

export interface SignalRow {
  /** The engine's own key, e.g. "kalman_direction". */
  key: string
  /** The key with underscores opened and initials capitalised — a label, not a
   *  renaming: "Kalman direction". */
  label: string
  value: number
  /** Sign of the value: a fact of the number, the only reading drawn. */
  sign: 'positive' | 'negative' | 'zero'
}

const ACRONYMS: Record<string, string> = { rsi: 'RSI', macd: 'MACD' }

export function signalLabel(key: string): string {
  return key
    .split('_')
    .map((w, i) => ACRONYMS[w] ?? (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function signalRows(reading: Pick<ConsensusReading, 'allSignals'>): SignalRow[] {
  return reading.allSignals.map(({ key, value }) => ({
    key,
    label: signalLabel(key),
    value,
    sign: value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero',
  }))
}

// ─── Tying the reading to the event log ──────────────────────────────────────

/** Two records written in the same engine cycle land within this of each
 *  other (measured: 400 µs between the reading and the edge event). */
const SAME_CYCLE_MS = 2_000

/**
 * Whether the reading's timestamp coincides with the NEWEST edge-detection
 * event in the retained log. True is a checked fact about two records; it is
 * what lets the page say "computed on the last detection cycle" rather than
 * asserting it. Null when the log has not answered. `events` is newest-first
 * (what parseEventRows returns).
 */
export function readingMatchesEdgeEvent(
  reading: Pick<ConsensusReading, 'scoreTimestamp'>,
  events: readonly Pick<EventRow, 'type' | 'timestamp'>[] | null,
): boolean | null {
  if (events === null) return null
  const newestEdge = events.find((e) => e.type.toLowerCase() === 'edge' && e.timestamp !== null)
  return newestEdge !== undefined && Math.abs(newestEdge.timestamp! - reading.scoreTimestamp) <= SAME_CYCLE_MS
}
