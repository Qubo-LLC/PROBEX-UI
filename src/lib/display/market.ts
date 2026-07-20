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
