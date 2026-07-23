// Engine markets mapper. Item schema from a real /api/markets capture. Fields
// the wire doesn't send (segment/liquidity/sentiment/tags/…) stay null/[] and
// degrade gracefully in the UI — never fabricated.

import type { EngineMarkets }  from '@/types/engine'
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
  volume:                 string  // numeric string, e.g. "9.80392" — parse before use
  duration_minutes:       number
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

export function parseMarketRows(m: EngineMarkets): ParseResult<MarketRow> {
  return parseItems(m.markets, isMarketItem, (dto) => ({
    id:            dto.id as string,
    title:         str(dto.title) ? dto.title : (dto.question as string),
    description:   str(dto.description) ? dto.description : null,
    segment:       str(dto.segment) ? dto.segment : null,
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
