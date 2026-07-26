// ─── Engine positions mapper ──────────────────────────────────────────────────
//
// ✅ COVERAGE: item schema CONFIRMED from a live /api/positions capture
// (2026-07-25). An earlier revision of this file guarded on a *proposed* shape
// (`id` + `side`) that the backend never implemented — the wire actually keys on
// `market_id` + `direction`, so every real row was being rejected as
// 'unrecognized' and the Positions/Portfolio consoles rendered nothing while
// live data was arriving. The guard below matches the real contract.
//
// Unit conversions applied here (the wire and the UI disagree):
//   entry_price / current_price   wire 0–1 fraction  → row cents (0–100)
//   pnl_percent                   wire 0–100 percent → row signed fraction
//   size                          wire is the USD cost basis, NOT a contract
//                                 count (confirmed: ledger rows show
//                                 pnl ≈ −size at pnl_percent −100)

import type { EnginePositions } from '@/types/engine'
import { parseItems, isRecord, str, num, type ParseResult } from './parse'

// ─── Confirmed wire schema (DTO) ──────────────────────────────────────────────
// Captured live 2026-07-25. No invented fields.

/** Single position item as returned by GET /api/positions positions[]. */
export interface EnginePositionItemDTO {
  /** Market condition ID. Doubles as the row identity — the engine holds at most
   *  one position per market, and no separate position id is on the wire. */
  market_id:         string

  /** Market question, e.g. "Bitcoin Up or Down - July 25, 2:30AM-2:45AM ET". */
  question:          string

  /** 'YES' | 'NO' (uppercase on the wire). */
  direction:         string

  /** Position stake in USD — this is the cost basis, not a contract count. */
  size:              number

  /** Entry price as a 0–1 probability. */
  entry_price:       number

  /** Current mark price as a 0–1 probability; null until the engine marks it. */
  current_price:     number | null

  /** BTC spot at entry. */
  entry_btc_price:   number

  /** BTC spot now. */
  current_btc_price: number

  /** Detected edge at entry, as a percentage. */
  edge_pct:          number

  /** Seconds the position has been open. */
  time_held_seconds: number

  /** Unrealized P&L in USD (signed). */
  pnl:               number

  /** Unrealized P&L as a percentage of size (signed, 0–100 scale). */
  pnl_percent:       number

  /** ISO 8601 — when the position was opened. */
  opened_at:         string
}

/** Full envelope returned by GET /api/positions. */
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
  /** V3 Phase 4: join keys so Portfolio/Positions can link back to the
   *  market and its live edge (e.g. Edge Alignment, click-through to Market
   *  Detail) — extends the existing row, mirrors EdgeRow/EventRow.marketId. */
  marketId:         string | null
  segment:          string | null
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

  // ── Fields the confirmed wire carries that the original proposal lacked ────
  /** Detected edge at entry, as a percentage (e.g. 11.5). */
  edgePct:          number | null
  /** Seconds the position has been open. */
  timeHeldSeconds:  number | null
  /** BTC spot at entry. */
  entryBtcPrice:    number | null
  /** BTC spot now — lets the UI show which way the underlying has moved. */
  currentBtcPrice:  number | null
}

/** Matches the confirmed wire contract: market_id + direction, no `id`/`side`. */
function isPositionItem(x: unknown): x is Record<string, unknown> {
  return isRecord(x) && str(x.market_id) && str(x.direction) && num(x.size)
}

/** Wire prices are 0–1 probabilities; the UI renders cents. */
const toCents = (x: unknown): number | null => (num(x) ? x * 100 : null)

export function parsePositionRows(p: EnginePositions): ParseResult<PositionRow> {
  return parseItems(p.positions, isPositionItem, (dto) => {
    const size       = dto.size as number
    const entryPrice = num(dto.entry_price) ? dto.entry_price : null
    const pnl        = num(dto.pnl) ? dto.pnl : null

    return {
      // No dedicated position id on the wire — the engine holds at most one
      // position per market, so market_id is a stable row identity.
      id:               dto.market_id as string,
      marketId:         dto.market_id as string,
      segment:          null,                                  // not on the wire
      marketTitle:      str(dto.question) ? dto.question : null,
      side:             (dto.direction as string).toLowerCase(),
      // `size` is USD stake, so contract count is stake ÷ entry probability.
      contracts:        entryPrice !== null && entryPrice > 0 ? size / entryPrice : null,
      entryPrice:       toCents(dto.entry_price),
      currentPrice:     toCents(dto.current_price),
      costBasis:        size,
      currentValue:     pnl !== null ? size + pnl : null,
      unrealizedPnl:    pnl,
      unrealizedPnlPct: num(dto.pnl_percent) ? dto.pnl_percent / 100 : null,
      openedAt:         str(dto.opened_at) ? new Date(dto.opened_at).getTime() : null,
      edgePct:          num(dto.edge_pct) ? dto.edge_pct : null,
      timeHeldSeconds:  num(dto.time_held_seconds) ? dto.time_held_seconds : null,
      entryBtcPrice:    num(dto.entry_btc_price) ? dto.entry_btc_price : null,
      currentBtcPrice:  num(dto.current_btc_price) ? dto.current_btc_price : null,
    }
  })
}
