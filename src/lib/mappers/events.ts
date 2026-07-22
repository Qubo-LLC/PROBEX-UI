// ─── Engine events mapper ─────────────────────────────────────────────────────
//
// ✅ COVERAGE (2026-07-22): /api/events now returns real, non-empty items —
// schema corrected below from a real capture (types observed so far: "trade",
// "edge"). It differs from the speculative contract this file previously
// documented in several load-bearing ways:
//   • no `market_title`/`segment`/`amount`/`probability` fields on the wire
//     → these stay null forever; EventLog already guards every one of them
//   • `description` doesn't exist   → real fields are `title` + `message`
//   • real payload adds `severity` ("warning"/"info" observed) and a
//     `metadata` object whose shape varies per event `type` — exposed
//     as new EventRow fields, additive only, no discriminated union
//     invented from 2 samples

import type { EngineEvents } from '@/types/engine'
import { parseItems, isRecord, str, num, type ParseResult } from './parse'

// ─── Confirmed wire schema (DTO) ──────────────────────────────────────────────
// Matches a real GET /api/events capture, 2026-07-22.

export interface EngineEventItemDTO {
  id:        string
  type:      string   // e.g. "trade", "edge" observed so far
  severity:  string   // e.g. "warning", "info" observed so far
  title:     string
  message:   string
  timestamp: string   // ISO 8601
  /** Shape varies by `type` — kept untyped rather than inventing a
   *  discriminated union from 2 samples. */
  metadata:  Record<string, unknown>
}

/**
 * Full envelope returned by GET /api/events.
 */
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

// ─── Cockpit row parsing (M4) ─────────────────────────────────────────────────

export interface EventRow {
  id:          string
  type:        string
  description: string
  /** V3 Phase 2: join key so Market Detail can filter the global event log
   *  down to one market — an extension of the existing row, not a new
   *  mechanism (mirrors EdgeRow.marketId from Phase 1). 2026-07-22: the
   *  wire has no top-level market_id, but trade/edge events carry one
   *  inside metadata — read from there rather than left permanently null. */
  marketId:    string | null
  marketTitle: string | null   // not sent anywhere on the wire today, stays null
  amount:      number | null   // not sent on the wire today, stays null
  probability: number | null   // not sent on the wire today, stays null
  timestamp:   number | null   // epoch ms
  // 2026-07-22: real fields the backend sends, additive.
  title:       string | null
  severity:    string | null   // e.g. "warning", "info" observed so far
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

export function parseEventRows(e: EngineEvents): ParseResult<EventRow> {
  return parseItems(e.events, isEventItem, (dto) => ({
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
    timestamp:   str(dto.timestamp) ? new Date(dto.timestamp).getTime() : null,
    title:       str(dto.title) ? dto.title : null,
    severity:    str(dto.severity) ? dto.severity : null,
    metadata:    isRecord(dto.metadata) ? dto.metadata : null,
  }))
}
