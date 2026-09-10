'use client'

// EventStream — the engine's activity, rendered as a scannable stream.
//
// ─── Why this was extracted ──────────────────────────────────────────────────
// The row treatment here (severity accent rail, type badge, headline + detail,
// metadata chips, repeat collapsing, timestamp) was the best component in the
// product — and it existed only inside EventLog, reachable only through
// System › Event Log. Live Feed, whose entire purpose is "what is the engine
// observing and doing right now", had no event stream at all: it showed a
// scrolling marquee of the same data with the reasoning stripped out.
//
// Extracting the row means both surfaces render engine activity identically,
// and the marquee could be deleted rather than restyled.
//
// ─── Category, not just severity ─────────────────────────────────────────────
// EventLog coloured rows by severity alone, so an edge detection and a trade
// execution looked the same when both were 'info'. On a stream the operator
// scans by *what happened* first and *how bad* second, so type now carries a
// stable colour and icon while severity keeps the accent rail. Both come from
// the wire — no event is assigned a category it did not declare.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { DedupedEventRow } from '@/lib/mappers/events'

// ─── Severity (the accent rail) ───────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  info:     'var(--probex-primary)',
  warning:  'var(--probex-warning)',
  error:    'var(--probex-negative)',
  critical: 'var(--probex-negative)',
  success:  'var(--probex-positive)',
}

export function severityColor(s: string | null): string {
  return (s && SEVERITY_COLOR[s.toLowerCase()]) || 'var(--probex-text-muted)'
}

// ─── Category (the type badge) ────────────────────────────────────────────────
// The eight types /api/events documents. An unknown type still renders — it
// just falls back to neutral rather than being hidden or recoloured as
// something it isn't.

interface CategoryStyle { label: string; color: string; glyph: ReactNode }

const G = (d: string) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const CATEGORY: Record<string, CategoryStyle> = {
  edge:          { label: 'Edge',       color: 'var(--probex-primary)',   glyph: G('m13 2-10 12h9l-1 8 10-12h-9z') },
  // Was --probex-positive. A trade is not a GAIN; execution and financial
  // direction are different bands, and green-because-something-happened is
  // exactly the pattern the token architecture exists to prevent. Valence is
  // carried by the severity rail, which reads the engine's own severity.
  trade:         { label: 'Trade',      color: 'var(--probex-secondary)', glyph: G('M3 17 9 11l4 4 8-8M21 7v6M21 7h-6') },
  position:      { label: 'Position',   color: 'var(--probex-secondary)', glyph: G('M4 6h16M4 12h16M4 18h10') },
  // Was --probex-yes — the MARKET-SIDE colour, on an event category that has
  // nothing to do with which side of a market was taken. A resolution row and
  // a YES position were the same cyan.
  resolution:    { label: 'Resolution', color: 'var(--probex-text-secondary)', glyph: G('M20 6 9 17l-5-5') },
  survival:      { label: 'Survival',   color: 'var(--probex-warning)',   glyph: G('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10') },
  // Was --probex-positive. A health event is as often a probe FAILING as
  // recovering; a permanently green badge told the operator the opposite half
  // the time. Neutral identity, valence from the severity rail.
  health:        { label: 'Health',     color: 'var(--probex-text-secondary)', glyph: G('M22 12h-4l-3 9L9 3l-3 9H2') },
  error:         { label: 'Error',      color: 'var(--probex-negative)',  glyph: G('M12 8v5M12 17h.01') },
  paper_trading: { label: 'Paper',      color: 'var(--probex-text-muted)', glyph: G('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z') },
}

export function categoryFor(type: string): CategoryStyle {
  return (
    CATEGORY[type.toLowerCase()] ?? {
      label: type,
      color: 'var(--probex-text-muted)',
      glyph: G('M12 12h.01'),
    }
  )
}

/** The documented type vocabulary, for filter controls. */
export const EVENT_TYPES = Object.keys(CATEGORY)

// ─── Metadata chips ───────────────────────────────────────────────────────────

/** Human-readable chips from an event's metadata; every field is optional and
 *  skipped when absent — never fabricated. */
export function metaChips(row: DedupedEventRow): Array<{ label: string; tone?: 'yes' | 'no' | 'muted' }> {
  const m = row.metadata
  if (!m) return []
  const chips: Array<{ label: string; tone?: 'yes' | 'no' | 'muted' }> = []

  const dir = m.direction ?? m.top_edge_direction
  if (typeof dir === 'string') chips.push({ label: dir.toUpperCase(), tone: dir.toLowerCase() === 'yes' ? 'yes' : 'no' })

  const edge = m.edge_pct ?? m.top_edge_pct
  if (typeof edge === 'number') chips.push({ label: `${edge.toFixed(1)}% edge` })

  if (typeof m.edges_detected === 'number') chips.push({ label: `${m.edges_detected} edge${m.edges_detected === 1 ? '' : 's'}`, tone: 'muted' })
  if (typeof m.reason === 'string') chips.push({ label: m.reason, tone: 'muted' })

  return chips
}

// ─── Row ──────────────────────────────────────────────────────────────────────

export function EventRowItem({
  row,
  compact = false,
  arriving = false,
}: {
  row: DedupedEventRow
  compact?: boolean
  /** True only for a row that was not in the previous render. */
  arriving?: boolean
}) {
  const accent = severityColor(row.severity)
  const cat = categoryFor(row.type)
  const chips = metaChips(row)
  const headline = row.title ?? row.type

  return (
    <div
      className={`flex items-start gap-3 rounded-lg text-xs ${compact ? 'px-3 py-2' : 'px-3 py-2.5'}${arriving ? ' event-arrive' : ''}`}
      style={{
        background: 'var(--probex-surface)',
        border: '1px solid var(--probex-border)',
        borderLeft: `2.5px solid ${accent}`,
      }}
    >
      {/* Category: colour + glyph + label. Reads before the text does, which is
          what lets an operator scan the stream by kind of activity. */}
      <span
        className="inline-flex items-center gap-1 flex-shrink-0 mt-px rounded px-1.5 py-0.5 font-semibold uppercase tracking-wide text-2xs"
        style={{
          color: cat.color,
          background: `color-mix(in srgb, ${cat.color} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${cat.color} 24%, transparent)`,
          minWidth: compact ? undefined : 74,
        }}
        title={row.severity ? `${cat.label} · ${row.severity}` : cat.label}
      >
        {cat.glyph}
        {cat.label}
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate" style={{ color: 'var(--probex-text-primary)' }}>{headline}</span>
          {row.repeatCount > 1 && (
            <span
              className="text-2xs font-bold rounded px-1.5 py-0.5 flex-shrink-0 tabular-nums"
              style={{ color: 'var(--probex-warning)', background: 'var(--probex-warning-dim)' }}
              title={`Repeated ${row.repeatCount} times — collapsed to reduce noise`}
            >
              ×{row.repeatCount}
            </span>
          )}
        </div>

        {row.description && row.description !== headline && (
          <span className="truncate" style={{ color: 'var(--probex-text-muted)' }} title={row.description}>
            {row.description}
          </span>
        )}

        {chips.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {chips.map((c, i) => (
              <span
                key={i}
                className="text-2xs font-medium rounded px-1.5 py-0.5"
                style={
                  c.tone === 'yes' ? { color: 'var(--probex-yes)', background: 'var(--probex-yes-dim)' }
                  : c.tone === 'no' ? { color: 'var(--probex-no)', background: 'var(--probex-no-dim)' }
                  : c.tone === 'muted' ? { color: 'var(--probex-text-muted)', background: 'var(--probex-surface-2)' }
                  : { color: 'var(--probex-text-secondary)', background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }
                }
              >
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {row.timestamp !== null && (
        <span
          className="tabular-nums flex-shrink-0 mt-px text-2xs font-mono"
          style={{ color: 'var(--probex-text-disabled)' }}
          title={
            row.firstTimestamp !== null && row.repeatCount > 1
              ? `First seen ${new Date(row.firstTimestamp).toLocaleTimeString()}`
              : new Date(row.timestamp).toLocaleString()
          }
        >
          {new Date(row.timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}

// ─── Stream ───────────────────────────────────────────────────────────────────

export function EventStream({ rows, compact = false }: { rows: DedupedEventRow[]; compact?: boolean }) {
  // Which rows are genuinely NEW. Seeded on the first render with everything
  // already on screen, so a page load does not animate fourteen rows at once —
  // an entrance that fires for history is decoration, not information.
  //
  // The set is the source of truth for "has this been seen", and it only ever
  // grows within a mounted stream; rows that scroll out of the window are not
  // re-animated if the engine repeats them, because their id is already in it.
  const seen = useRef<Set<string> | null>(null)
  const [arriving, setArriving] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(rows.map((r) => r.id))
      return
    }
    const fresh = rows.filter((r) => !seen.current!.has(r.id)).map((r) => r.id)
    if (fresh.length === 0) return
    for (const id of fresh) seen.current.add(id)
    setArriving(new Set(fresh))
  }, [rows])

  return (
    // A list, so a screen reader can report how many activity groups there are
    // and step through them. It was a div of divs, which announces as a run-on
    // block with no structure and no count.
    <ul className="flex flex-col gap-1.5 list-none m-0 p-0">
      {rows.map((row) => (
        <li key={row.id}>
          <EventRowItem row={row} compact={compact} arriving={arriving.has(row.id)} />
        </li>
      ))}
    </ul>
  )
}
