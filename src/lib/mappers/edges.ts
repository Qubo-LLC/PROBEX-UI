// ─── Engine edges mapper ──────────────────────────────────────────────────────
//
// ✅ COVERAGE (2026-07-22): /api/edges now returns real, non-empty items —
// schema corrected below from a real capture. It differs from the speculative
// contract this file previously documented in several load-bearing ways:
//   • no `id` field at all               → id derives from market_id
//   • `market_title` doesn't exist        → real field is `market_question`
//   • `direction` arrives as "YES"/"NO"   → normalized to lowercase here, once,
//                                           so every existing `=== 'yes'` /
//                                           `.toLowerCase() === 'yes'` check
//                                           across the app keeps working
//   • `edge` (0–1 fraction) doesn't exist → real field is `edge_pct`, already
//                                           a percentage (5.48, not 0.0548)
//   • `kelly_size`, `signal`, `recommendation`, `expires_at` don't exist on
//     the wire → these stay null forever (never fabricated); components
//     already degrade gracefully wherever they're read
//   • real payload adds `indicators` (rsi, rsi_signal, macd_trend,
//     alignment_score) — exposed as new EdgeRow fields, additive only

import type { EngineEdges } from '@/types/engine'
import { parseItems, isRecord, str, num, type ParseResult } from './parse'

// ─── Confirmed wire schema (DTO) ──────────────────────────────────────────────
// Matches a real GET /api/edges capture, 2026-07-22.

export interface EngineEdgeIndicatorsDTO {
  rsi:             number
  rsi_signal:      string   // e.g. "overbought" — only value observed so far
  macd_trend:      string   // e.g. "bearish" — only value observed so far
  alignment_score: number   // signed
}

export interface EngineEdgeItemDTO {
  market_id:        string
  market_question:  string
  direction:        string  // "YES" | "NO" observed
  edge_pct:         number  // already a percentage, e.g. 5.48
  confidence:       number  // 0–1
  current_price:    number
  market_yes_price: number
  market_no_price:  number
  yes_token_id:     string
  no_token_id:      string
  detected_at:      string  // ISO 8601
  indicators:       EngineEdgeIndicatorsDTO
}

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

// ─── Cockpit row parsing ──────────────────────────────────────────────────────
// Guards the fields that are actually present on the wire. Optional fields
// (kellySize/signal/recommendation) degrade to null — components already
// handle that gracefully; a non-matching shape yields { kind: 'unrecognized' }.

export interface EdgeRow {
  id:              string  // = marketId (edges have no id of their own)
  marketId:        string | null
  marketTitle:     string | null
  direction:       string  // normalized lowercase: 'yes' | 'no'
  edgePct:         number          // already a % (5.48 = 5.48%)
  kellySize:       number | null   // fraction of bankroll — not sent by backend today
  confidence:      number | null   // 0–1
  signal:          string | null   // not sent by backend today
  recommendation:  string | null   // not sent by backend today
  detectedAt:      number | null   // epoch ms
  // 2026-07-22: real technical indicators the backend sends per edge.
  rsi:             number | null
  rsiSignal:       string | null
  macdTrend:       string | null
  alignmentScore:  number | null
}

function isEdgeItem(x: unknown): x is Record<string, unknown> {
  return isRecord(x) && str(x.market_id) && str(x.direction) && num(x.edge_pct)
}

export function parseEdgeRows(e: EngineEdges): ParseResult<EdgeRow> {
  return parseItems(e.edges, isEdgeItem, (dto) => {
    const indicators = isRecord(dto.indicators) ? dto.indicators : null
    return {
      id:             dto.market_id as string,
      marketId:       dto.market_id as string,
      marketTitle:    str(dto.market_title) ? dto.market_title : (str(dto.market_question) ? dto.market_question : null),
      direction:      (dto.direction as string).toLowerCase(),
      edgePct:        dto.edge_pct as number,
      kellySize:      num(dto.kelly_size) ? dto.kelly_size : null,
      confidence:     num(dto.confidence) ? dto.confidence : null,
      signal:         str(dto.signal) ? dto.signal : null,
      recommendation: str(dto.recommendation) ? dto.recommendation : null,
      detectedAt:     str(dto.detected_at) ? new Date(dto.detected_at).getTime() : null,
      rsi:            indicators && num(indicators.rsi) ? indicators.rsi : null,
      rsiSignal:      indicators && str(indicators.rsi_signal) ? indicators.rsi_signal : null,
      macdTrend:      indicators && str(indicators.macd_trend) ? indicators.macd_trend : null,
      alignmentScore: indicators && num(indicators.alignment_score) ? indicators.alignment_score : null,
    }
  })
}

/** Build a marketId → EdgeRow lookup for O(1) joins (cards, tables). Markets
 *  without a live edge simply have no entry — never fabricated. */
export function toEdgeRowMap(result: ParseResult<EdgeRow>): Map<string, EdgeRow> {
  const map = new Map<string, EdgeRow>()
  if (result.kind !== 'rows') return map
  for (const row of result.rows) {
    if (row.marketId) map.set(row.marketId, row)
  }
  return map
}
