// ─── Engine edges mapper ──────────────────────────────────────────────────────
//
// 🟡 COVERAGE: /api/edges envelope works; items[] are currently unknown[].
//
// Edges are the engine's primary trading signal output — each edge represents
// a market where the bot has detected a probability mispricing worth trading.
//
// The frontend LiveMarketsView displays:
//   - edge magnitude (sortable column)
//   - recommendation level ('strong_buy_yes' → 'strong_buy_no')
//   - consensus score (from global consensus, not from this endpoint)
//
// The MergedMarketView type (src/lib/realtime/) merges REST market data with
// live WebSocket updates. Edge items slot into that merge layer.
//
// When items arrive, wire into:
//   LiveEngineService.getEdges() → adapt with toEdgeMap()
//   useMarketStream() merges edge data into MergedMarketView per market

import type { EngineEdges } from '@/types/engine'
import { parseItems, isRecord, str, num, type ParseResult } from './parse'

// ─── Required wire schema (DTO) ───────────────────────────────────────────────
// THIS IS THE BACKEND CONTRACT.
// Jake must return this exact shape inside the edges[] array.

/**
 * Single edge signal as returned by GET /api/edges items[].
 *
 * @required Jake — the backend must produce this shape.
 */
export interface EngineEdgeItemDTO {
  /** Unique edge identifier. */
  id:             string

  /** Market this edge applies to. Matches EngineMarketItemDTO.id. */
  market_id:      string

  /** Market title for display (denormalised). */
  market_title:   string

  /** Bitcoin market segment. */
  segment:        string

  /** Directional edge: 'yes' = bet YES, 'no' = bet NO. */
  direction:      string

  /** Raw edge magnitude [0.0, 1.0]. e.g. 0.08 = 8% edge over market price. */
  edge:           number

  /** Kelly-criterion-adjusted recommended position size [0.0, 1.0].
   *  Fraction of bankroll to deploy. */
  kelly_size:     number

  /** Engine confidence in this edge [0.0, 1.0]. */
  confidence:     number

  /** Source signal that generated this edge (e.g. 'consensus_divergence',
   *  'price_momentum', 'on_chain_signal'). */
  signal:         string

  /** Composite recommendation for display in LiveMarketRow signal column.
   *  Must be one of:
   *   'strong_buy_yes' | 'buy_yes' | 'hold' | 'buy_no' | 'strong_buy_no' */
  recommendation: string

  /** ISO 8601 or null — when this signal expires (null = persists until resolved). */
  expires_at:     string | null

  /** ISO 8601 — when the edge was detected. */
  detected_at:    string
}

/**
 * Full envelope returned by GET /api/edges.
 */
export interface EngineEdgesResponseDTO {
  edges:     EngineEdgeItemDTO[]
  count:     number
  limit:     number
  timestamp: string   // ISO 8601
}

// ─── Envelope-only helpers (available today) ─────────────────────────────────

export interface EdgesSummary {
  count: number
  limit: number
}

export function toEdgesSummary(e: EngineEdges): EdgesSummary {
  return { count: e.count, limit: e.limit }
}

// ─── Cockpit row parsing (M4) ─────────────────────────────────────────────────
// Guards the minimal fields the Strategy / Live Feed edge tables render.
// Optional fields degrade gracefully; a non-matching shape yields
// { kind: 'unrecognized' } and the console says so (never guesses).

export interface EdgeRow {
  id:              string
  marketTitle:     string | null
  direction:       string
  edgePct:         number          // edge as % (0.08 → 8.0)
  kellySize:       number | null   // fraction of bankroll
  confidence:      number | null   // 0–1
  signal:          string | null
  recommendation:  string | null
  detectedAt:      number | null   // epoch ms
}

function isEdgeItem(x: unknown): x is Record<string, unknown> {
  return isRecord(x) && str(x.id) && str(x.direction) && num(x.edge)
}

export function parseEdgeRows(e: EngineEdges): ParseResult<EdgeRow> {
  return parseItems(e.edges, isEdgeItem, (dto) => ({
    id:             dto.id as string,
    marketTitle:    str(dto.market_title) ? dto.market_title : null,
    direction:      dto.direction as string,
    edgePct:        (dto.edge as number) * 100,
    kellySize:      num(dto.kelly_size) ? dto.kelly_size : null,
    confidence:     num(dto.confidence) ? dto.confidence : null,
    signal:         str(dto.signal) ? dto.signal : null,
    recommendation: str(dto.recommendation) ? dto.recommendation : null,
    detectedAt:     str(dto.detected_at) ? new Date(dto.detected_at).getTime() : null,
  }))
}
