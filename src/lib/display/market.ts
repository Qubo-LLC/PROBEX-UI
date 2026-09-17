// Shared market display helpers — mirrors lib/display/engine.ts. Segment codes
// arrive as unconfirmed backend strings (parse-or-report, not a typed enum),
// so lookups are lenient: unknown codes fall back to the raw string rather
// than throwing or guessing a label. Known codes resolve through the richer
// SEGMENT_META (types/market.ts) — the single source of truth for segment
// metadata, restored from V1's config/marketSegments.ts (deleted in M5;
// its label/description data already lived in SEGMENT_META too).

import { SEGMENT_META, type BitcoinSegment } from '@/types/market'

function isKnownSegment(segment: string): segment is BitcoinSegment {
  return segment in SEGMENT_META
}

/** Human-readable label for a (possibly unrecognized) segment code. */
export function segmentLabel(segment: string | null): string | null {
  if (segment === null) return null
  return isKnownSegment(segment) ? SEGMENT_META[segment].label : segment
}

const KNOWN_SENTIMENTS = new Set(['bullish', 'bearish', 'neutral'])

/** CSS color token for a (possibly unrecognized) sentiment string. Unknown
 *  values render neutrally rather than guessing a direction. */
export function sentimentTone(sentiment: string | null): string {
  if (sentiment === 'bullish') return 'var(--probex-positive)'
  if (sentiment === 'bearish') return 'var(--probex-negative)'
  return 'var(--probex-text-muted)'
}

export function isKnownSentiment(sentiment: string | null): boolean {
  return sentiment !== null && KNOWN_SENTIMENTS.has(sentiment)
}

/**
 * A 15-minute window's title, compacted for a narrow column: the asset and
 * the time window, which are the two things that distinguish one row from
 * the next. "Bitcoin Up or Down - September 13, 3:00AM-3:15AM ET" becomes
 * "Bitcoin · 3:00–3:15AM ET". Read from the title string only; when the
 * title does not follow that shape the full title is returned unchanged, so
 * nothing is ever invented for a market this pattern does not fit.
 */
export function compactWindowTitle(title: string): string {
  const m = /^(.+?)\s+Up or Down\b.*?(\d{1,2}:\d{2}\s?[AP]M)\s*[-\u2013]\s*(\d{1,2}:\d{2}\s?[AP]M)\s*(ET|UTC|[A-Z]{2,4})?/i.exec(title)
  if (!m) return title
  const asset = m[1]!.trim()
  const zone = m[4] ? ` ${m[4]}` : ''
  return `${asset} · ${m[2]}–${m[3]}${zone}`
}
