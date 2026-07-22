// ─── Engine markets mapper ────────────────────────────────────────────────────
//
// ✅ COVERAGE (2026-07-22): /api/markets now returns real, non-empty items —
// schema corrected below from a real capture. It differs from the speculative
// contract this file previously documented in several load-bearing ways:
//   • no `probability`/`volume_24h`/`liquidity`/`open_interest`/`sentiment`/
//     `tags`/`resolution_criteria`/`status`/`segment`/`asset_class` fields
//     exist on the wire → all stay null/[] (never fabricated); UI already
//     degrades every one of these gracefully
//   • `title` doesn't exist              → real field is `question`
//     (the guard already fell back to it — no change needed there)
//   • `probability` is derived from the real `yes_price` (0–1 decimal,
//     e.g. 0.725 = 72.5% YES) — this is not invented, it's the same value
//     under its real wire name
//   • `volume` exists but as a numeric STRING (e.g. "9.80392"), not a number
//     — parsed here, exposed as volume24h for the existing UI slot
//   • real payload adds baseline_price, baseline_price_source, yes_token_id,
//     no_token_id, duration_minutes — not yet consumed by any component;
//     available on MarketRow for future use, not fabricated

import type { EngineMarkets }  from '@/types/engine'
import { parseItems, isRecord, str, num, type ParseResult } from './parse'

// ─── Confirmed wire schema (DTO) ──────────────────────────────────────────────
// Matches a real GET /api/markets capture, 2026-07-22.

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
  probability:        number | null   // 0–1 YES probability — derived from real yes_price
  yesPrice:           number | null   // cents [0,100] — derived from yes_price × 100
  noPrice:            number | null   // cents [0,100] — derived from no_price × 100
  volume24h:          number | null   // USD — parsed from the wire's numeric-string `volume`
  liquidity:          number | null   // USD — not sent by backend today, stays null
  openInterest:       number | null   // USD — not sent by backend today, stays null
  sentiment:          string | null   // not sent by backend today, stays null
  tags:               string[]       // not sent by backend today, stays []
  /** V3 Phase 2: plain-English resolution criteria for Market Detail's
   *  Resolution section. Additive — degrades to null like every other field. */
  resolutionCriteria: string | null
  closesAt:           number | null   // epoch ms
  status:             string | null   // not sent by backend today, stays null
  // 2026-07-22: real fields the backend sends, not yet consumed by any
  // component — available for future use, never fabricated.
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
