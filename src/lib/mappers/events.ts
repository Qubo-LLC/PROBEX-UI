// ─── Engine events mapper ─────────────────────────────────────────────────────
//
// 🟡 COVERAGE: /api/events envelope works; items[] are currently unknown[].
//
// This file serves two purposes:
//   1. Documents the REQUIRED wire shape (EngineEventItemDTO) that Jake needs to
//      implement so the frontend can populate ActivityFeed with zero component
//      changes.
//   2. Provides toActivityItem() / toActivityItems() functions ready to activate
//      once the backend begins returning populated items.
//
// When items arrive, wire into:
//   LiveEngineService.getEvents() → adapt with toActivityItems()
//   useActivity() will pick up automatically

import type { EngineEvents } from '@/types/engine'
import { parseItems, isRecord, str, num, type ParseResult } from './parse'

// ─── Required wire schema (DTO) ───────────────────────────────────────────────
// THIS IS THE BACKEND CONTRACT.
// Jake must return this exact shape inside the events[] array.

/**
 * Single event item as returned by GET /api/events items[].
 *
 * @required Jake — the backend must produce this shape.
 */
export interface EngineEventItemDTO {
  /** Unique event identifier. Used as React key. */
  id:           string

  /** Event classification for icon + colour routing.
   *  Must be one of:
   *   'new-position-yes'  — bot opened a YES position
   *   'new-position-no'   — bot opened a NO position
   *   'market-resolved'   — a market reached its resolution date
   *   'consensus-shift'   — global consensus direction changed significantly
   *   'probability-spike' — a market's probability moved ≥ 10pp rapidly
   *   'large-position'    — a "whale" trade (size ≥ $1k) was detected
   *   'edge-detected'     — an actionable edge signal was found by the engine */
  type:         string

  /** Market this event relates to. Matches EngineMarketItemDTO.id. */
  market_id:    string

  /** Market title for display (denormalised). */
  market_title: string

  /** Bitcoin market segment. */
  segment:      string

  /** Human-readable event description shown in the feed. */
  description:  string

  /** USD amount if this is a financial event (position size, trade amount).
   *  null for non-financial events (consensus shifts, resolutions). */
  amount:       number | null

  /** Current market probability [0.0, 1.0] at the time of the event.
   *  null for events that don't have a probability reference. */
  probability:  number | null

  /** ISO 8601 — when the event occurred. */
  timestamp:    string
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
  marketTitle: string | null
  amount:      number | null   // USD, when the event is financial
  probability: number | null   // 0–1, when the event carries one
  timestamp:   number | null   // epoch ms
}

function isEventItem(x: unknown): x is Record<string, unknown> {
  return isRecord(x) && str(x.id) && str(x.type)
}

export function parseEventRows(e: EngineEvents): ParseResult<EventRow> {
  return parseItems(e.events, isEventItem, (dto) => ({
    id:          dto.id as string,
    type:        dto.type as string,
    description: str(dto.description) ? dto.description : (dto.type as string),
    marketTitle: str(dto.market_title) ? dto.market_title : null,
    amount:      num(dto.amount) ? dto.amount : null,
    probability: num(dto.probability) ? dto.probability : null,
    timestamp:   str(dto.timestamp) ? new Date(dto.timestamp).getTime() : null,
  }))
}
