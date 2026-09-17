// Engine events mapper. Item schema from a real /api/events capture; metadata
// shape varies per type, so it stays an untyped record.
//
// ─── What the wire carries (re-captured 2026-09-15, 25 events) ───────────────
// Every item: id (32 hex) · type · severity · title · message · timestamp ·
// metadata. Four types were live — trade, edge, resolution, error — and the
// metadata differs per type:
//
//   trade       trade_id, market_id, direction, edge_pct
//   edge        edges_detected, top_edge_market_id, top_edge_pct, top_edge_direction
//   resolution  resolved_count
//   error       error
//
// No item carries a market title, a position id, a P&L figure, or any link
// between an edge, the trade it produced and the resolution that closed it.
// The trade `message` embeds the same trade_id and market_id the metadata
// carries — nothing in it is unique to the message.
//
// ─── Three normalisations that belong HERE, not in each consumer ─────────────
//   1. ORDER   the endpoint returns newest-first; parseEventRows guarantees it
//              (stable sort by timestamp), so no consumer sorts again.
//   2. TIME    `timestamp` is a naive ISO string that is in fact UTC — proven
//              the same way `checked_at` was: /api/runtime `initialized_at`
//              (same naive form) equals now − /api/stats `uptime_seconds` to
//              the second, and trade events interleave with the ledger's
//              `opened_at`/`closed_at` within milliseconds. Parsed as UTC, so
//              a row's clock time and its age are right in every zone.
//   3. REPEATS collapsed only when CONSECUTIVE (see collapseConsecutiveRepeats).

import type { EngineEvents } from '@/types/engine'
import { naiveUtcToMs } from '@/lib/services/dto'
import { parseItems, isRecord, str, num, type ParseResult } from './parse'

export interface EngineEventItemDTO {
  id:        string
  type:      string   // e.g. "trade", "edge"
  severity:  string   // e.g. "warning", "info"
  title:     string
  message:   string
  timestamp: string   // ISO 8601, naive (UTC)
  metadata:  Record<string, unknown>
}

export interface EngineEventsResponseDTO {
  events:    EngineEventItemDTO[]
  count:     number
  limit:     number
  /** Which event types are present in this response. null = all types. */
  types:     string[] | null
  timestamp: string          // ISO 8601
}

// ─── Envelope-only helpers (available today) ─────────────────────────────────

/** Summary available from the events envelope even when items are []. */
export interface EventsSummary {
  count: number
  types: string[] | null
  limit: number
}

export function toEventsSummary(e: EngineEvents): EventsSummary {
  return { count: e.count, types: e.types, limit: e.limit }
}

export interface EventRow {
  id:          string
  type:        string
  description: string
  /** Join key for Market Detail filtering; recovered from metadata (no
   *  top-level market_id on the wire). */
  marketId:    string | null
  marketTitle: string | null   // not on the wire; stays null
  amount:      number | null   // not on the wire; stays null
  probability: number | null   // not on the wire; stays null
  timestamp:   number | null   // epoch ms
  title:       string | null
  severity:    string | null
  metadata:    Record<string, unknown> | null
}

function isEventItem(x: unknown): x is Record<string, unknown> {
  return isRecord(x) && str(x.id) && str(x.type)
}

function metadataMarketId(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null
  if (str(metadata.market_id)) return metadata.market_id
  if (str(metadata.top_edge_market_id)) return metadata.top_edge_market_id
  return null
}

/** Newest first. Rows without a timestamp sink to the end; ties keep wire
 *  order (Array.prototype.sort is stable), which is the engine's own order
 *  for events written in the same millisecond. */
function byNewest(a: EventRow, b: EventRow): number {
  return (b.timestamp ?? -Infinity) - (a.timestamp ?? -Infinity)
}

/** An unparseable timestamp string yields NaN from Date; a row with no usable
 *  time must sort and render as "no time", not as an Invalid Date. */
function finiteOrNull(ms: number): number | null {
  return Number.isFinite(ms) ? ms : null
}

export function parseEventRows(e: EngineEvents): ParseResult<EventRow> {
  const parsed = parseItems(e.events, isEventItem, (dto) => ({
    id:          dto.id as string,
    type:        dto.type as string,
    description: str(dto.description) ? dto.description
                : str(dto.message)     ? dto.message
                : str(dto.title)       ? dto.title
                : (dto.type as string),
    marketId:    str(dto.market_id) ? dto.market_id : metadataMarketId(dto.metadata),
    marketTitle: str(dto.market_title) ? dto.market_title : null,
    amount:      num(dto.amount) ? dto.amount : null,
    probability: num(dto.probability) ? dto.probability : null,
    timestamp:   str(dto.timestamp) ? finiteOrNull(naiveUtcToMs(dto.timestamp)) : null,
    title:       str(dto.title) ? dto.title : null,
    severity:    str(dto.severity) ? dto.severity : null,
    metadata:    isRecord(dto.metadata) ? dto.metadata : null,
  }))
  if (parsed.kind !== 'rows') return parsed
  return { kind: 'rows', rows: [...parsed.rows].sort(byNewest) }
}

// ─── Collapsing repeats ───────────────────────────────────────────────────────
//
// The engine can emit the same event many times in a burst — measured once as
// 34 consecutive "Paper trade rejected … DEAD state" rows — and a live tail
// full of one sentence tells the operator nothing the first row didn't.
//
// The previous version grouped by content across the WHOLE window, whatever
// the gap between occurrences. On the live log that folded four separate
// resolutions spread over fifty minutes into one "×4" row stamped with the
// newest time: the timeline lost three book-changing actions and the count
// beneath it called the four "1 activity group". A feed that is chronological
// cannot merge events that had other events between them.
//
// So a repeat is only collapsed into its predecessor when nothing else was
// recorded between the two. A collapsed run therefore occupies a contiguous
// span of the timeline, its newest and oldest times are both real, and every
// event with a different neighbour keeps its own row.

export interface DedupedEventRow extends EventRow {
  /** Number of consecutive events sharing this type+description+marketId,
   *  including this one. 1 = no repeat. */
  repeatCount:    number
  /** Oldest timestamp in the run (meaningful when repeatCount > 1). */
  firstTimestamp: number | null
}

function fingerprint(row: EventRow): string {
  return `${row.type}\u001f${row.description}\u001f${row.marketId ?? ''}`
}

/** Folds CONSECUTIVE same-content rows into one, keeping the newest occurrence
 *  with a run count. Expects `rows` newest-first (what parseEventRows returns);
 *  output order is unchanged. */
export function collapseConsecutiveRepeats(rows: EventRow[]): DedupedEventRow[] {
  const out: DedupedEventRow[] = []
  let lastKey: string | null = null
  for (const row of rows) {
    const key = fingerprint(row)
    const prev = out[out.length - 1]
    if (prev !== undefined && key === lastKey) {
      prev.repeatCount += 1
      prev.firstTimestamp = row.timestamp
    } else {
      out.push({ ...row, repeatCount: 1, firstTimestamp: row.timestamp })
      lastKey = key
    }
  }
  return out
}

/** Per-type tally of a window of rows, for a summary line. Insertion order is
 *  first-seen, so the most recent kind of activity leads. */
export function countByType(rows: readonly EventRow[]): Array<{ type: string; count: number }> {
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.type, (counts.get(r.type) ?? 0) + 1)
  return [...counts].map(([type, count]) => ({ type, count }))
}
