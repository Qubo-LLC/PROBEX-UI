// Event presentation helpers — what an engine event SAYS, read from the fields
// it actually carries.
//
// ─── The problem this solves ─────────────────────────────────────────────────
// A trade event's wire message is "Recorded paper trade PAPER_20260914_0010
// for 0xa2152dfb…1591b15a" — sixty-four hex characters as the second line of
// every trade row, on a feed meant to be scanned. The same event's metadata
// carries the identical facts structured: trade_id, market_id, direction,
// edge_pct. So the row can say what the operator needs (side, market, edge)
// and keep the raw identifiers one click away, without a single field being
// invented: every value below is either on the wire or a lookup of a wire id
// against another wire record.
//
// Nothing here assigns meaning the engine did not declare. An unknown type
// gets the wire title and message, unchanged.

import type { EventRow } from '@/lib/mappers/events'
import { formatEdgePct } from './engine'
import { formatAge } from './freshness'
import { clockOrDate } from './time'

// ─── Typed reading of the metadata record ────────────────────────────────────

export interface EventContext {
  /** "yes" | "no" when the wire carries a direction; any other string is
   *  passed through lowercased rather than dropped. */
  direction:     string | null
  edgePct:       number | null
  marketId:      string | null
  tradeId:       string | null
  edgesDetected: number | null
  resolvedCount: number | null
  errorText:     string | null
}

const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)

/** Every field optional and absent-safe: metadata differs per type and this
 *  reads only what is there. */
export function eventContext(row: EventRow): EventContext {
  const m = row.metadata ?? {}
  const direction = strOrNull(m.direction) ?? strOrNull(m.top_edge_direction)
  return {
    direction:     direction === null ? null : direction.toLowerCase(),
    edgePct:       numOrNull(m.edge_pct) ?? numOrNull(m.top_edge_pct),
    marketId:      row.marketId,
    tradeId:       strOrNull(m.trade_id),
    edgesDetected: numOrNull(m.edges_detected),
    resolvedCount: numOrNull(m.resolved_count),
    errorText:     strOrNull(m.error),
  }
}

// ─── Market identity by lookup ───────────────────────────────────────────────

/** What another wire record knows about a market id. `label` is built from
 *  that record's own fields ("BTC 15m", "Bitcoin · 3:00–3:15PM ET"), never
 *  from the id. */
export interface MarketIdentity {
  label:  string
  /** Which record supplied it — so a consumer can say "derived" truthfully. */
  source: 'ledger' | 'positions' | 'markets' | 'archive'
}

export type MarketLookup = (marketId: string) => MarketIdentity | null

/** The id's first ten characters. Enough to tell two markets apart on
 *  screen; the full id stays in the details disclosure. */
export function shortMarketId(marketId: string): string {
  return `${marketId.slice(0, 10)}…`
}

// ─── What the row says beneath its title ─────────────────────────────────────

/** One fragment of the context line. Fragments are plain text except
 *  `market` marks the fragment that names the market so the row can link it. */
export interface ContextFragment {
  text:    string
  kind?:   'direction' | 'market' | 'edge' | 'count'
  /** Only on `market` fragments: the id the label stands for. */
  marketId?: string
  /** Set when the market label came from a lookup rather than the event —
   *  which record supplied it, so the row can say so precisely. */
  derivedFrom?: MarketIdentity['source']
}

/**
 * The B-line: asset / market / position context, from the event's own
 * metadata plus an optional lookup of its market id.
 *
 * Returns [] when the event carries nothing beyond its title and message, in
 * which case the row shows the message instead — no fragment is fabricated
 * to fill the line.
 *
 * `omitMarket` drops the market fragment: on a page that IS the market, naming
 * it on every row is the repeated-label pattern, and the link would be to the
 * page already open.
 */
export function eventContextLine(row: EventRow, lookup?: MarketLookup, opts: { omitMarket?: boolean } = {}): ContextFragment[] {
  const c = eventContext(row)
  const out: ContextFragment[] = []
  const type = row.type.toLowerCase()

  const marketFragment = (): ContextFragment | null => {
    if (c.marketId === null || opts.omitMarket === true) return null
    const found = lookup?.(c.marketId) ?? null
    return found
      ? { text: found.label, kind: 'market', marketId: c.marketId, derivedFrom: found.source }
      : { text: `market ${shortMarketId(c.marketId)}`, kind: 'market', marketId: c.marketId }
  }

  if (type === 'trade') {
    if (c.direction !== null) out.push({ text: c.direction.toUpperCase(), kind: 'direction' })
    const mk = marketFragment(); if (mk) out.push(mk)
    if (c.edgePct !== null) out.push({ text: `${formatEdgePct(c.edgePct)} edge at entry`, kind: 'edge' })
    return out
  }

  if (type === 'edge') {
    if (c.edgesDetected !== null) {
      out.push({ text: `${c.edgesDetected} edge${c.edgesDetected === 1 ? '' : 's'}`, kind: 'count' })
    }
    // The wire names only the strongest one; say so rather than implying the
    // count and the direction describe the same thing.
    const top: string[] = []
    if (c.direction !== null) top.push(c.direction.toUpperCase())
    if (c.edgePct !== null) top.push(formatEdgePct(c.edgePct))
    if (top.length > 0) out.push({ text: `top ${top.join(' ')}`, kind: 'edge' })
    const mk = marketFragment(); if (mk) out.push(mk)
    return out
  }

  if (type === 'resolution') {
    if (c.resolvedCount !== null) {
      out.push({ text: `${c.resolvedCount} paper trade${c.resolvedCount === 1 ? '' : 's'} settled`, kind: 'count' })
    }
    return out
  }

  // Unknown or system-side types (error, health, survival …): the message is
  // the context, and the row renders it as such.
  return out
}

/**
 * Whether the wire message adds anything the title and context line do not.
 *
 * A trade message restates trade_id + market_id (both in the details); an
 * edge message restates edges_detected; a resolution message restates
 * resolved_count. Printing them again under a context line built from the
 * same fields would be the repeated-label pattern the row is meant to avoid.
 * Everything else — errors, health, unknown types — keeps its message, which
 * is the only place its content lives.
 */
export function messageIsRedundant(row: EventRow, contextLine: readonly ContextFragment[]): boolean {
  if (contextLine.length === 0) return false
  if (row.title !== null && row.description === row.title) return true
  const type = row.type.toLowerCase()
  return type === 'trade' || type === 'edge' || type === 'resolution'
}

// ─── Severity ─────────────────────────────────────────────────────────────────

/** Severities the engine uses for "something is wrong". Shared with System's
 *  incident filter so the two never disagree about what counts. */
export const ALERTING_SEVERITIES: ReadonlySet<string> = new Set(['warning', 'warn', 'error', 'critical', 'fatal'])

export function isAlerting(severity: string | null): boolean {
  return severity !== null && ALERTING_SEVERITIES.has(severity.toLowerCase())
}

// ─── Time ─────────────────────────────────────────────────────────────────────

/**
 * The clock reading for a row: "02:31:45" on the day it happened, and with
 * the date in front once it is not today — a feed that has been quiet since
 * yesterday must not read as if yesterday's rows happened this morning.
 */
export function formatEventTime(ts: number, now: number = Date.now()): string {
  return clockOrDate(ts, now, { seconds: true })
}

/** The full reading for a tooltip: absolute local time plus age. */
export function describeEventTime(ts: number, now: number = Date.now()): string {
  const abs = new Date(ts).toLocaleString()
  const age = now - ts
  // A row from the future is a clock disagreement, not an age; say the time only.
  return age >= 0 ? `${abs} · ${formatAge(age)}` : abs
}

/**
 * How long ago the newest event was recorded — the feed's own "is anything
 * happening" reading. Null when there are no timed rows.
 */
export function latestActivity(rows: readonly EventRow[], now: number = Date.now()): { at: number; ageMs: number } | null {
  let newest: number | null = null
  for (const r of rows) {
    if (r.timestamp !== null && (newest === null || r.timestamp > newest)) newest = r.timestamp
  }
  return newest === null ? null : { at: newest, ageMs: Math.max(0, now - newest) }
}
