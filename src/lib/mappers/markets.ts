// ─── Engine markets mapper ────────────────────────────────────────────────────
//
// ❌ COVERAGE: /api/markets currently times out (15 s) and returns unknown[] items.
//
// This file serves two purposes:
//   1. Documents the REQUIRED wire shape (EngineMarketItemDTO) that Jake needs to
//      implement so the frontend can map it to the existing Market type with zero
//      component changes.
//   2. Provides toMarket() / toMarkets() functions ready to activate once the
//      backend begins returning populated items.
//
// When items arrive, wire into:
//   LiveEngineService.getMarkets() → adapt with toMarkets()
//   useMarkets() / useMarketStream() will pick up automatically

import type { EngineMarkets }  from '@/types/engine'
import { parseItems, isRecord, str, num, type ParseResult } from './parse'

// ─── Required wire schema (DTO) ───────────────────────────────────────────────
// THIS IS THE BACKEND CONTRACT.
// Jake must return this exact shape inside the markets[] array.
// All dates are ISO 8601 strings (UTC with Z suffix recommended).
// All monetary values are USD floats unless noted.

/**
 * Single market item as returned by GET /api/markets items[].
 *
 * @required Jake — the backend must produce this shape.
 */
export interface EngineMarketItemDTO {
  /** Stable unique identifier (UUID or slug). Used as React key + route param. */
  id:                  string

  /** Prediction question text — displayed as the market title. */
  title:               string

  /** Extended description / thesis for the prediction. */
  description:         string

  /** Bitcoin market segment.
   *  Must be one of: 'price-targets' | 'volatility' | 'etf-flows' |
   *  'on-chain-metrics' | 'network-health' | 'institutional-activity' |
   *  'macro-signals' | 'market-structure' */
  segment:             string

  /** Asset class. MVP value: 'bitcoin'. */
  asset_class:         string

  /** Current YES probability [0.0, 1.0]. */
  probability:         number

  /** YES price in cents [0, 100]. */
  yes_price:           number

  /** NO price in cents [0, 100]. Always 100 − yes_price. */
  no_price:            number

  /** 24-hour trading volume (USD). */
  volume_24h:          number

  /** All-time cumulative volume (USD). */
  volume_total:        number

  /** Available liquidity depth (USD). */
  liquidity:           number

  /** Total open interest (USD). */
  open_interest:       number

  /** Market lifecycle state.
   *  Must be one of: 'live' | 'paused' | 'settling' | 'resolved' | 'cancelled' */
  status:              string

  /** Directional bias inferred from consensus signals.
   *  Must be one of: 'bullish' | 'bearish' | 'neutral' */
  sentiment:           string

  /** Categorical tags for filtering/search (e.g. ['price', 'q3']). */
  tags:                string[]

  /** Plain-English resolution criteria. */
  resolution_criteria: string

  /** ISO 8601 — market closes / resolves at this time. */
  closes_at:           string

  /** ISO 8601 or null if not yet resolved. */
  resolved_at:         string | null

  /** ISO 8601 — when this market was created. */
  created_at:          string

  /** ISO 8601 — last metadata update. */
  updated_at:          string
}

/**
 * Full envelope returned by GET /api/markets.
 */
export interface EngineMarketsResponseDTO {
  markets:   EngineMarketItemDTO[]
  count:     number
  total:     number          // total available (may exceed count if paginated)
  has_more:  boolean
  cursor:    string | null   // opaque cursor for next page; null = end
  timestamp: string          // ISO 8601
}

// ─── Envelope-only helpers (available today) ─────────────────────────────────

/** Returns the raw market count from the envelope (works even when items are []). */
export function engineMarketsCount(m: EngineMarkets): number {
  return m.count
}

// ─── Cockpit row parsing (M4, extended in V3 Phase 1) ─────────────────────────
// Minimal guard: the Polymarket 5-minute market serialization is unconfirmed;
// require only an id and a title-like field, degrade everything else.
//
// V3 Phase 1 extends the optional field set (segment/volume/liquidity/
// openInterest/sentiment/description/tags) so the restored HeroCarousel and
// FeaturedGrid can render V1-grade richness the moment P0-01 lands — this is
// an extension of the existing parse-or-report row, not a new mechanism.
// Every added field degrades to null/[] independently; none is required.

export interface MarketRow {
  id:                 string
  title:              string
  description:        string | null
  segment:            string | null
  probability:        number | null   // 0–1 YES probability
  yesPrice:           number | null   // cents
  noPrice:            number | null   // cents
  volume24h:          number | null   // USD
  liquidity:          number | null   // USD
  openInterest:       number | null   // USD
  sentiment:          string | null   // 'bullish' | 'bearish' | 'neutral' (as reported)
  tags:               string[]
  /** V3 Phase 2: plain-English resolution criteria for Market Detail's
   *  Resolution section. Additive — degrades to null like every other field. */
  resolutionCriteria: string | null
  closesAt:           number | null   // epoch ms
  status:             string | null
}

function isMarketItem(x: unknown): x is Record<string, unknown> {
  return isRecord(x) && str(x.id) && (str(x.title) || str(x.question))
}

export function parseMarketRows(m: EngineMarkets): ParseResult<MarketRow> {
  return parseItems(m.markets, isMarketItem, (dto) => ({
    id:            dto.id as string,
    title:         str(dto.title) ? dto.title : (dto.question as string),
    description:   str(dto.description) ? dto.description : null,
    segment:       str(dto.segment) ? dto.segment : null,
    probability:   num(dto.probability) ? dto.probability : null,
    yesPrice:      num(dto.yes_price) ? dto.yes_price : null,
    noPrice:       num(dto.no_price) ? dto.no_price : null,
    volume24h:     num(dto.volume_24h) ? dto.volume_24h : null,
    liquidity:     num(dto.liquidity) ? dto.liquidity : null,
    openInterest:  num(dto.open_interest) ? dto.open_interest : null,
    sentiment:     str(dto.sentiment) ? dto.sentiment : null,
    tags:               Array.isArray(dto.tags) ? dto.tags.filter(str) : [],
    resolutionCriteria: str(dto.resolution_criteria) ? dto.resolution_criteria : null,
    closesAt:           str(dto.closes_at) ? new Date(dto.closes_at).getTime() : null,
    status:             str(dto.status) ? dto.status : null,
  }))
}
