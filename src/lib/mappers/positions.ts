// ─── Engine positions mapper ──────────────────────────────────────────────────
//
// 🟡 COVERAGE: /api/positions envelope works; items[] are currently unknown[].
//
// This file serves two purposes:
//   1. Documents the REQUIRED wire shape (EnginePositionItemDTO) that Jake needs
//      to implement so the frontend can populate the existing Position type with
//      zero component changes.
//   2. Provides toPosition() / toPositions() functions ready to activate once
//      the backend begins returning populated items.
//
// When items arrive, wire into:
//   LiveEngineService.getPositions() → adapt with toPositions()
//   usePositions() will pick up automatically

import type { EnginePositions } from '@/types/engine'
import { parseItems, isRecord, str, num, type ParseResult } from './parse'

// ─── Required wire schema (DTO) ───────────────────────────────────────────────
// THIS IS THE BACKEND CONTRACT.
// Jake must return this exact shape inside the positions[] array.

/**
 * Single position item as returned by GET /api/positions items[].
 *
 * @required Jake — the backend must produce this shape.
 */
export interface EnginePositionItemDTO {
  /** Unique position identifier. Used as React key. */
  id:                 string

  /** Market this position belongs to. Matches EngineMarketItemDTO.id. */
  market_id:          string

  /** Market question / title for display (denormalised — avoids a join). */
  market_title:       string

  /** Bitcoin market segment (matches EngineMarketItemDTO.segment). */
  segment:            string

  /** Position direction.
   *  Must be one of: 'yes' | 'no' */
  side:               string

  /** Number of contracts held. */
  contracts:          number

  /** Average entry price in cents [0, 100]. */
  entry_price:        number

  /** Current mark-to-market price in cents [0, 100]. Updated live. */
  current_price:      number

  /** Total cost paid to open this position (USD). */
  cost_basis:         number

  /** Current mark-to-market value (USD). */
  current_value:      number

  /** Unrealized P&L: current_value − cost_basis (USD, signed). */
  unrealized_pnl:     number

  /** Unrealized P&L as a decimal fraction of cost_basis (signed). */
  unrealized_pnl_pct: number

  /** Position lifecycle state.
   *  Must be one of: 'open' | 'settled-win' | 'settled-loss' | 'sold' */
  status:             string

  /** ISO 8601 — when the position was opened. */
  opened_at:          string

  /** ISO 8601 or null if position is still open. */
  closed_at:          string | null

  /** Order ID that created this position. */
  order_id:           string
}

/**
 * Full envelope returned by GET /api/positions.
 */
export interface EnginePositionsResponseDTO {
  positions:            EnginePositionItemDTO[]
  count:                number
  total_unrealized_pnl: number   // aggregate unrealized P&L across all positions (USD)
  timestamp:            string   // ISO 8601
}

// ─── Envelope-only helpers (available today) ─────────────────────────────────

/** Aggregate summary available from the positions envelope even when items are []. */
export interface PositionsSummary {
  count:              number
  totalUnrealizedPnl: number
}

export function toPositionsSummary(p: EnginePositions): PositionsSummary {
  return {
    count:              p.count,
    totalUnrealizedPnl: p.totalUnrealizedPnl,
  }
}

// ─── Cockpit row parsing (M4) ─────────────────────────────────────────────────

export interface PositionRow {
  id:               string
  marketTitle:      string | null
  side:             string
  contracts:        number | null
  entryPrice:       number | null   // cents
  currentPrice:     number | null   // cents
  costBasis:        number | null   // USD
  currentValue:     number | null   // USD
  unrealizedPnl:    number | null   // USD, signed
  unrealizedPnlPct: number | null   // signed fraction
  openedAt:         number | null   // epoch ms
}

function isPositionItem(x: unknown): x is Record<string, unknown> {
  return isRecord(x) && str(x.id) && str(x.side)
}

export function parsePositionRows(p: EnginePositions): ParseResult<PositionRow> {
  return parseItems(p.positions, isPositionItem, (dto) => ({
    id:               dto.id as string,
    marketTitle:      str(dto.market_title) ? dto.market_title : null,
    side:             dto.side as string,
    contracts:        num(dto.contracts) ? dto.contracts : null,
    entryPrice:       num(dto.entry_price) ? dto.entry_price : null,
    currentPrice:     num(dto.current_price) ? dto.current_price : null,
    costBasis:        num(dto.cost_basis) ? dto.cost_basis : null,
    currentValue:     num(dto.current_value) ? dto.current_value : null,
    unrealizedPnl:    num(dto.unrealized_pnl) ? dto.unrealized_pnl : null,
    unrealizedPnlPct: num(dto.unrealized_pnl_pct) ? dto.unrealized_pnl_pct : null,
    openedAt:         str(dto.opened_at) ? new Date(dto.opened_at).getTime() : null,
  }))
}
