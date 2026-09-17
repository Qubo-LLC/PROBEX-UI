'use client'

// EventStream — the engine's activity, rendered as a scannable stream.
//
// ─── Why this was extracted ──────────────────────────────────────────────────
// The row treatment here was the best component in the product — and it
// existed only inside EventLog, reachable only through System › Event Log.
// Live Feed, whose entire purpose is "what is the engine observing and doing
// right now", had no event stream at all. Extracting the row means every
// surface renders engine activity identically: Live Feed, System › Event Log,
// System's incident list and Portfolio's activity all use this one row.
//
// ─── What a row says, in order (the A/B/C/D rule from globals.css) ────────────
//   A  WHAT HAPPENED   the engine's own title ("Paper trade recorded")
//   B  TO WHAT         side · market · edge, from the event's metadata, with
//                      the market named by lookup when another wire record
//                      holds its id ("YES · BTC 15m · 80.0% edge at entry")
//   C  WHEN / HOW BAD  the clock time at the right; the severity word and a
//                      coloured rail only when the engine flagged the event
//   D  THE RECORD      event id, trade id, the full market id, the raw
//                      metadata — behind one Details disclosure per row
//
// The previous row put the wire MESSAGE on line two, which for a trade is
// "Recorded paper trade PAPER_20260914_0010 for 0xa2152dfb…" — the raw
// sixty-four-hex id as the most prominent text on the feed. The same event's
// metadata carries the identical facts structured, so line two is now built
// from those and the id moved to D. Nothing was removed; it was re-tiered.
//
// ─── Category, not just severity ─────────────────────────────────────────────
// The operator scans by *what happened* first and *how bad* second. Type
// carries a stable colour and glyph (the disc at the left); severity keeps the
// accent rail — but only when it is warning or worse. Every row used to draw a
// blue rail for `info`, which made the rail decoration rather than a signal.
// Quiet the affirmations, keep the warnings loud.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import type { DedupedEventRow } from '@/lib/mappers/events'
import {
  eventContextLine, messageIsRedundant, isAlerting, formatEventTime, describeEventTime,
  type MarketLookup, type ContextFragment,
} from '@/lib/display/eventDisplay'
import { Popover, PopoverTitle, type PopoverTriggerProps } from '@/components/ui/Popover'
import { MARKET_DETAIL_PATH } from '@/config/constants'

// ─── Severity (the accent rail) ───────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  info:     'var(--probex-primary)',
  warning:  'var(--probex-warning)',
  warn:     'var(--probex-warning)',
  error:    'var(--probex-negative)',
  critical: 'var(--probex-negative)',
  fatal:    'var(--probex-negative)',
  success:  'var(--probex-positive)',
}

export function severityColor(s: string | null): string {
  return (s && SEVERITY_COLOR[s.toLowerCase()]) || 'var(--probex-text-muted)'
}

// ─── Category (the glyph) ─────────────────────────────────────────────────────
// The eight types /api/events documents. An unknown type still renders — it
// just falls back to neutral rather than being hidden or recoloured as
// something it isn't.

interface CategoryStyle { label: string; color: string; glyph: ReactNode }

const G = (d: string) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const CATEGORY: Record<string, CategoryStyle> = {
  edge:          { label: 'Edge',       color: 'var(--probex-primary)',   glyph: G('m13 2-10 12h9l-1 8 10-12h-9z') },
  // Not --probex-positive: a trade is not a GAIN. Execution and financial
  // direction are different bands; valence is carried by the severity rail.
  trade:         { label: 'Trade',      color: 'var(--probex-secondary)', glyph: G('M3 17 9 11l4 4 8-8M21 7v6M21 7h-6') },
  position:      { label: 'Position',   color: 'var(--probex-secondary)', glyph: G('M4 6h16M4 12h16M4 18h10') },
  // Not --probex-yes — the MARKET-SIDE colour has nothing to do with resolution.
  resolution:    { label: 'Resolution', color: 'var(--probex-text-secondary)', glyph: G('M20 6 9 17l-5-5') },
  survival:      { label: 'Survival',   color: 'var(--probex-warning)',   glyph: G('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10') },
  // A health event is as often a probe FAILING as recovering: neutral identity.
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

// ─── D · the record ───────────────────────────────────────────────────────────

/** Metadata keys the context line already states, so the record lists them
 *  once under their own name rather than twice. */
const SHOWN_IN_CONTEXT = new Set(['direction', 'edge_pct', 'edges_detected', 'top_edge_direction', 'top_edge_pct', 'resolved_count'])

function DetailsButton({ className = '', ...props }: { className?: string } & PopoverTriggerProps) {
  return (
    <button
      type="button"
      aria-label="Event record — identifiers and raw metadata"
      title="Event record"
      className={`focus-ring inline-flex items-center justify-center w-6 h-6 rounded-full cursor-pointer flex-shrink-0 ${className}`}
      style={{ color: 'var(--probex-text-disabled)' }}
      {...props}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
      </svg>
    </button>
  )
}

function RecordLine({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="t-label">{label}</span>
      <span className={`text-2xs break-all ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--probex-text-secondary)' }}>{value}</span>
    </div>
  )
}

function EventRecord({ row, messageHidden }: { row: DedupedEventRow; messageHidden: boolean }) {
  const m = row.metadata ?? {}
  const tradeId  = typeof m.trade_id === 'string' ? m.trade_id : null
  const rest = Object.entries(m).filter(([k]) => k !== 'trade_id' && k !== 'market_id' && k !== 'top_edge_market_id' && !SHOWN_IN_CONTEXT.has(k))
  return (
    <div className="flex flex-col gap-2.5">
      <PopoverTitle>Event record</PopoverTitle>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <RecordLine label="Type" value={row.type} mono={false} />
        <RecordLine label="Severity" value={row.severity ?? '—'} mono={false} />
      </div>
      {row.timestamp !== null && (
        <RecordLine label="Recorded" value={`${new Date(row.timestamp).toISOString()} · ${new Date(row.timestamp).toLocaleString()}`} />
      )}
      {row.repeatCount > 1 && row.firstTimestamp !== null && (
        <RecordLine label="Consecutive repeats" value={`${row.repeatCount} · first at ${new Date(row.firstTimestamp).toLocaleTimeString()}`} mono={false} />
      )}
      <RecordLine label="Event id" value={row.id} />
      {tradeId !== null && <RecordLine label="Trade id" value={tradeId} />}
      {row.marketId !== null && <RecordLine label="Market id" value={row.marketId} />}
      {messageHidden && <RecordLine label="Message" value={row.description} mono={false} />}
      {rest.map(([k, v]) => (
        <RecordLine key={k} label={k} value={typeof v === 'string' ? v : JSON.stringify(v)} mono={typeof v !== 'string'} />
      ))}
      <span className="t-metadata">/api/events</span>
    </div>
  )
}

// ─── B · the context line ─────────────────────────────────────────────────────

/** Where a derived market name came from, in the operator's words. */
const SOURCE_NAME: Record<NonNullable<ContextFragment['derivedFrom']>, string> = {
  ledger:    'the settled-trade ledger',
  positions: 'the open-positions record',
  markets:   'the scanned-markets list',
  archive:   'the market archive',
}

function ContextPiece({ f }: { f: ContextFragment }) {
  if (f.kind === 'direction') {
    const yes = f.text === 'YES'
    return (
      <span className="font-black tracking-widest" style={{ color: yes ? 'var(--probex-yes)' : f.text === 'NO' ? 'var(--probex-no)' : undefined }}>
        {f.text}
      </span>
    )
  }
  if (f.kind === 'market' && f.marketId !== undefined) {
    return (
      <Link
        href={MARKET_DETAIL_PATH(f.marketId)}
        className="focus-ring rounded-sm font-medium"
        style={{ color: 'var(--probex-text-secondary)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
        title={
          f.derivedFrom !== undefined
            ? `${f.text} — named from ${SOURCE_NAME[f.derivedFrom]}; the event itself carries only the id. Opens the market's recorded history.`
            : 'The engine holds no record naming this market yet — opens whatever history it has for the id.'
        }
      >
        {f.text}
      </Link>
    )
  }
  return <span>{f.text}</span>
}

// ─── Row ──────────────────────────────────────────────────────────────────────

export function EventRowItem({
  row,
  compact = false,
  arriving = false,
  lookup,
  hideMarket = false,
}: {
  row: DedupedEventRow
  compact?: boolean
  /** True only for a row that was not in the previous render. */
  arriving?: boolean
  /** Names a market id from other wire records; see useMarketLookup. */
  lookup?: MarketLookup | undefined
  /** For a surface that IS one market (Market Detail): the context line
   *  omits the market, which every row would otherwise repeat and link to
   *  the page already open. The id stays in the record disclosure. */
  hideMarket?: boolean
}) {
  const cat = categoryFor(row.type)
  const alerting = isAlerting(row.severity)
  const headline = row.title ?? cat.label
  const context = eventContextLine(row, lookup, { omitMarket: hideMarket })
  const messageHidden = messageIsRedundant(row, context)
  const showMessage = !messageHidden && row.description !== headline

  return (
    <div
      className={`flex items-start gap-2.5 text-xs ${compact ? 'py-2 pr-1' : 'py-2.5 pr-1'} pl-2.5${arriving ? ' event-arrive' : ''}`}
      style={{
        borderTop: '1px solid var(--probex-border)',
        // The rail is the row's ONE state carrier and it speaks only when the
        // engine flagged the event. Transparent otherwise, so alerting rows
        // stand out from the stream instead of every row wearing a colour.
        borderLeft: `2.5px solid ${alerting ? severityColor(row.severity) : 'transparent'}`,
      }}
    >
      {/* Category disc: colour + glyph. Reads before the text does, which is
          what lets an operator scan the stream by kind of activity. The word
          is in the tooltip; the title beside it already says it in prose. */}
      <span
        className="inline-flex items-center justify-center flex-shrink-0 rounded-full mt-px"
        style={{ width: 20, height: 20, color: cat.color, background: `color-mix(in srgb, ${cat.color} 12%, transparent)` }}
        title={cat.label}
        role="img"
        aria-label={cat.label}
      >
        {cat.glyph}
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-semibold truncate" style={{ color: 'var(--probex-text-primary)' }}>{headline}</span>
          {alerting && row.severity !== null && (
            <span className="t-label flex-shrink-0" style={{ color: severityColor(row.severity) }}>{row.severity}</span>
          )}
          {row.repeatCount > 1 && (
            <span
              className="t-metadata flex-shrink-0"
              title={`${row.repeatCount} consecutive identical events${row.firstTimestamp !== null ? ` — first at ${new Date(row.firstTimestamp).toLocaleTimeString()}` : ''}`}
            >
              ×{row.repeatCount}
            </span>
          )}
          {row.timestamp !== null && (
            <span
              className="t-metadata font-mono whitespace-nowrap ml-auto"
              title={describeEventTime(row.timestamp)}
            >
              {formatEventTime(row.timestamp)}
            </span>
          )}
        </div>

        {context.length > 0 && (
          <span className="t-helper flex items-baseline gap-x-1.5 flex-wrap min-w-0">
            {context.map((f, i) => (
              <span key={i} className="inline-flex items-baseline gap-x-1.5 min-w-0">
                {i > 0 && <span aria-hidden="true" style={{ color: 'var(--probex-text-disabled)' }}>·</span>}
                <ContextPiece f={f} />
              </span>
            ))}
          </span>
        )}

        {showMessage && (
          <span className="t-helper line-clamp-2 break-words" title={row.description}>
            {row.description}
          </span>
        )}
      </div>

      <Popover
        label="Event record"
        align="end"
        width={340}
        trigger={(p) => <DetailsButton {...p} />}
      >
        <EventRecord row={row} messageHidden={messageHidden} />
      </Popover>
    </div>
  )
}

// ─── Stream ───────────────────────────────────────────────────────────────────

export function EventStream({
  rows, compact = false, lookup, hideMarket = false,
}: { rows: DedupedEventRow[]; compact?: boolean; lookup?: MarketLookup | undefined; hideMarket?: boolean }) {
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
    // A list, so a screen reader can report how many rows there are and step
    // through them. Rows separate with hairlines (the ledger rule) rather than
    // each sitting in its own bordered card.
    <ul className="flex flex-col list-none m-0 p-0" style={{ borderBottom: '1px solid var(--probex-border)' }}>
      {rows.map((row) => (
        <li key={row.id}>
          <EventRowItem row={row} compact={compact} arriving={arriving.has(row.id)} lookup={lookup} hideMarket={hideMarket} />
        </li>
      ))}
    </ul>
  )
}
