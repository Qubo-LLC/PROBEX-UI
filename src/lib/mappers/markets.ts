// Engine markets mapper. Item schema from a real /api/markets capture. Fields
// the wire doesn't send (segment/liquidity/sentiment/tags/…) stay null/[] and
// degrade gracefully in the UI — never fabricated.

import type { EngineMarkets, MarketDetailItem }  from '@/types/engine'
import { parseItems, isRecord, str, num, type ParseResult } from './parse'

export interface EngineMarketItemDTO {
  id:                     string
  question:               string
  baseline_price:         number
  baseline_price_source:  string  // e.g. "feed"
  yes_token_id:           string
  no_token_id:            string
  yes_price:              number  // 0–1 decimal probability, e.g. 0.725
  no_price:               number  // 0–1 decimal, = 1 − yes_price
  created_at:             string  // ISO 8601 with Z
  closes_at:              string  // ISO 8601 with Z
  /** 2026-09-07: the wire now sends a NUMBER (744.598421); it sent a numeric
   *  string when this was captured. parseVolume() accepts both, so no consumer
   *  change was needed — the annotation is corrected rather than the code. */
  volume:                 number | string
  duration_minutes:       number
  /** Engine's tier ranking. Confirmed present 2026-09-07, previously undeclared. */
  market_tier:            number
  /** 'crypto' | 'macro' | 'politics' | 'sports' | 'entertainment' |
   *  'science_tech' — the engine's own category vocabulary. Confirmed present
   *  2026-09-07 and mapped to MarketRow.segment below. */
  asset_category:         string
}

/**
 * Full envelope returned by GET /api/markets.
 */
export interface EngineMarketsResponseDTO {
  markets:   EngineMarketItemDTO[]
  count:     number
  timestamp: string          // ISO 8601
}

// ─── Envelope-only helpers (available today) ─────────────────────────────────

/** Returns the raw market count from the envelope (works even when items are []). */
export function engineMarketsCount(m: EngineMarkets): number {
  return m.count
}

// Parse-or-report row. Guard requires only id + a title-like field; every other
// field degrades to null/[] when the wire omits it.

export interface MarketRow {
  id:                 string
  title:              string
  description:        string | null
  segment:            string | null
  probability:        number | null   // 0–1 YES — from yes_price
  yesPrice:           number | null   // cents [0,100] — yes_price × 100
  noPrice:            number | null   // cents [0,100] — no_price × 100
  volume24h:          number | null   // USD — parsed from the string `volume`
  liquidity:          number | null   // not on the wire; null
  openInterest:       number | null   // not on the wire; null
  sentiment:          string | null   // not on the wire; null
  tags:               string[]       // not on the wire; []
  resolutionCriteria: string | null   // not on the wire; null
  closesAt:           number | null   // epoch ms
  status:             string | null   // not on the wire; null
  baselinePrice:      number | null
  yesTokenId:         string | null
  noTokenId:          string | null
  durationMinutes:    number | null
}

function isMarketItem(x: unknown): x is Record<string, unknown> {
  return isRecord(x) && str(x.id) && (str(x.title) || str(x.question))
}

/** The wire's `volume` is a numeric string (e.g. "9.80392") — parse it, never guess. */
function parseVolume(x: unknown): number | null {
  if (num(x)) return x
  if (str(x)) {
    const n = Number(x)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Projects the confirmed /api/markets/:market_id payload onto the same MarketRow
 * the list surface uses, so MarketHeader / MarketEngineView / RelatedMarkets
 * work unchanged against a single-market fetch.
 *
 * Deliberately a projection rather than a second row type: the detail endpoint
 * carries a strict SUPERSET of the list item's fields, and giving the detail
 * page its own row shape would fork every component that renders a market.
 *
 * `segment` maps from `asset_category`, which the list mapper cannot do — see
 * the note there. It is the engine's own category vocabulary ('crypto',
 * 'macro', 'politics', 'sports', 'entertainment', 'science_tech' — confirmed
 * via /api/performance/by-category), not a label invented here.
 */
export function marketDetailToRow(m: MarketDetailItem): MarketRow {
  return {
    id:            m.id,
    title:         m.question,
    description:   null,
    segment:       m.assetCategory,
    probability:   m.yesPrice,
    yesPrice:      m.yesPrice * 100,
    noPrice:       m.noPrice * 100,
    volume24h:     m.volume,
    // Genuinely not on this endpoint either — kept null rather than derived.
    liquidity:     null,
    openInterest:  null,
    sentiment:     null,
    tags:               [],
    resolutionCriteria: null,
    closesAt:           Number.isFinite(m.closesAt) ? m.closesAt : null,
    // The wire has no `status` field, but `closes_at` makes expiry a fact
    // rather than a guess — see MarketDetailItem.hasClosed.
    status:             m.hasClosed ? 'closed' : 'open',
    baselinePrice:      m.baselinePrice,
    yesTokenId:         m.yesTokenId,
    noTokenId:          m.noTokenId,
    durationMinutes:    m.durationMinutes,
  }
}

export function parseMarketRows(m: EngineMarkets): ParseResult<MarketRow> {
  return parseItems(m.markets, isMarketItem, (dto) => ({
    id:            dto.id as string,
    title:         str(dto.title) ? dto.title : (dto.question as string),
    description:   str(dto.description) ? dto.description : null,
    // `segment` has never existed on this wire; `asset_category` does, and was
    // being dropped — so every market row carried segment: null while the
    // engine was sending 'crypto' on each one. That mattered more than it
    // looks: RelatedMarkets groups by segment, so it had nothing to group on,
    // and the engine is now genuinely multi-asset (BTC/ETH/SOL markets and
    // positions were all live on 2026-09-07). `segment` is kept as a fallback
    // in case a future payload uses that name.
    segment:       str(dto.asset_category) ? dto.asset_category : (str(dto.segment) ? dto.segment : null),
    // yes_price on the real wire IS the 0–1 probability already.
    probability:   num(dto.yes_price) ? dto.yes_price : (num(dto.probability) ? dto.probability : null),
    yesPrice:      num(dto.yes_price) ? dto.yes_price * 100 : null,
    noPrice:       num(dto.no_price) ? dto.no_price * 100 : null,
    volume24h:     parseVolume(dto.volume) ?? (num(dto.volume_24h) ? dto.volume_24h : null),
    liquidity:     num(dto.liquidity) ? dto.liquidity : null,
    openInterest:  num(dto.open_interest) ? dto.open_interest : null,
    sentiment:     str(dto.sentiment) ? dto.sentiment : null,
    tags:               Array.isArray(dto.tags) ? dto.tags.filter(str) : [],
    resolutionCriteria: str(dto.resolution_criteria) ? dto.resolution_criteria : null,
    closesAt:           str(dto.closes_at) ? new Date(dto.closes_at).getTime() : null,
    status:             str(dto.status) ? dto.status : null,
    baselinePrice:      num(dto.baseline_price) ? dto.baseline_price : null,
    yesTokenId:         str(dto.yes_token_id) ? dto.yes_token_id : null,
    noTokenId:          str(dto.no_token_id) ? dto.no_token_id : null,
    durationMinutes:    num(dto.duration_minutes) ? dto.duration_minutes : null,
  }))
}
