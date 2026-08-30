'use client'

// Composition primitives for dense instrument panels — the product's standard
// unit for "one question, answered with numbers".
//
// ─── The problem these solve ─────────────────────────────────────────────────
// Probex expressed nearly every metric as a StatCard: one label, one number,
// one optional delta, 104px tall minimum. That component is right for a KPI
// strip, but it was doing whole pages' work and it measured badly — Overview's
// Capital card rendered 20 characters into 670×104px, and Portfolio still
// stacks ELEVEN StatCards to say what four panels say in less height.
//
// A trading surface is not a KPI strip. Its unit is an *instrument*: one focal
// figure that answers the panel's question, with the three or four supporting
// numbers that qualify it packed underneath at metadata weight. That shape is
// what these primitives encode, so every panel on the page composes the same
// way and the density is a property of the system rather than of each author's
// patience.
//
// Everything here is layout over existing tokens — no new colours, no new
// radii, no new shadows. Type comes from the t-* scale, surfaces from .card.
//
// Lives in components/ui rather than components/overview because it is the
// shared grammar, not one page's furniture: Overview, Portfolio, Positions,
// Execution and System all compose from it, so a density or spacing decision
// gets made once for the product instead of five times.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Card } from './Card'
import { ProvenanceBadge, type Provenance } from '@/components/shared/ProvenanceBadge'

// ─── Panel shell ──────────────────────────────────────────────────────────────

interface PanelProps {
  /** The question this panel answers, in one or two words. */
  title: string
  /**
   * One line explaining what the panel measures, when the title alone is not
   * self-evident. Sits under the title at metadata weight so it never competes
   * with the figure. Omit it when the title already says everything.
   */
  subtitle?: ReactNode
  /** Data lineage for the panel as a whole. */
  provenance?: Provenance
  /** Endpoint id shown beside the badge. */
  source?: string
  /** Optional status chip / control in the header's right slot. */
  action?: ReactNode
  children: ReactNode
  className?: string
  /**
   * Internal padding, by the panel's role rather than by its author's taste.
   *
   *   standard  16px — the default instrument panel
   *   dense     12px — compact tables and telemetry rows, where a page carries
   *                    many panels and the padding is competing with the figures
   *   focal     20px — the one surface on a page that deserves breathing room
   *
   * Layout roles, not new visual primitives: same surface, same border, same
   * radius, same type. Only the gutter changes.
   */
  density?: 'standard' | 'dense' | 'focal'
  /**
   * Dashed recessed frame — the product's existing material for "this
   * capability exists but cannot yet produce a value". Delegates to Card's
   * `recessed` variant rather than inventing a second dashed surface.
   */
  recessed?: boolean
  /**
   * What is true of this panel right now. ONE semantic value, not a pile of
   * booleans — a panel cannot be simultaneously live and unavailable, and
   * independent flags would let a caller express that.
   *
   *   live         reading current data. THE NORMAL CASE, AND IT IS QUIET.
   *   idle         endpoint answered but the engine has computed nothing yet
   *   attention    a condition the operator must notice
   *   unavailable  no current data; the source did not answer
   *
   * ─── Why `live` has no illumination ────────────────────────────────────
   * Nearly every panel in this product is live. If live glowed, the whole
   * dashboard would glow and the glow would carry no information. Light is
   * spent on the exception, never the rule. A panel that is merely polling
   * successfully is exactly the state the operator does NOT need pointed out.
   *
   * `degraded` and `changed` are deliberately absent. Nothing renders a
   * degraded Panel today — SystemStatePanel expresses degradation in its
   * content — and "changed" is a transient event rather than a condition, so it
   * is `updateKey` below instead of a state a panel can be stuck in.
   */
  state?: PanelState
  /**
   * Change any value to fire one restrained ring around the panel. Pass the
   * figure the panel is about (`updateKey={balance}`), not a counter.
   *
   * Orthogonal to `state` on purpose: state is a condition that persists,
   * this is an event that happened once. A live panel whose number just moved
   * is both, and one prop could not say so.
   */
  updateKey?: string | number
}

export type PanelState = 'live' | 'idle' | 'attention' | 'unavailable'

const DENSITY_PADDING = {
  standard: 'p-4',
  dense:    'p-3',
  focal:    'p-5',
} as const

/**
 * Frame treatment per state. Border and surface do the work; illumination is
 * added only for `attention`, and every state also carries a non-colour
 * signifier (see STATE_MARKER) so none depends on hue or light alone.
 */
const STATE_CLASS: Record<PanelState, string> = {
  live:        '',
  idle:        '',
  attention:   'glow-attention',
  unavailable: '',
}

/** Left rail — a shape cue that survives greyscale, colour-blindness and
 *  reduced motion. Attention is the only state loud enough to earn one. */
const STATE_RAIL: Record<PanelState, string | null> = {
  live:        null,
  idle:        null,
  attention:   'var(--probex-warning)',
  unavailable: 'var(--probex-text-disabled)',
}

/** Spoken state, appended to the accessible name. `live` is omitted: it is the
 *  default condition and announcing it on every panel would be noise. */
const STATE_LABEL: Record<PanelState, string> = {
  live:        'live',
  idle:        'not yet computed',
  attention:   'needs attention',
  unavailable: 'no data available',
}

export function Panel({
  title,
  subtitle,
  provenance,
  source,
  action,
  children,
  className = '',
  density = 'standard',
  recessed = false,
  state = 'live',
  updateKey,
}: PanelProps) {
  // One-shot ring when the watched value actually changes. Skipped on the first
  // render: a panel appearing is not a value changing, and flashing every panel
  // on mount is the fastest way to make the signal meaningless.
  const [pulseN, setPulseN] = useState(0)
  const prevKey = useRef(updateKey)
  useEffect(() => {
    if (updateKey === undefined) return
    if (prevKey.current !== undefined && prevKey.current !== updateKey) setPulseN((n) => n + 1)
    prevKey.current = updateKey
  }, [updateKey])

  const rail = STATE_RAIL[state]

  return (
    // p-4 rather than Card's p-5 default: at four panels across a 1352px grid
    // the extra 8px of gutter per side came straight out of the figures.
    <Card
      noPadding
      {...(recessed ? { variant: 'recessed' as const } : {})}
      className={`relative ${DENSITY_PADDING[density]} flex flex-col gap-3 ${STATE_CLASS[state]} ${className}`}
      // A panel answers one question, which makes it a landmark worth naming.
      // Without this a screen-reader user meets an unlabelled group and has to
      // read into it to find out what it is. The state joins the accessible
      // name so it is never carried by colour or light alone.
      role="region"
      aria-label={state === 'live' ? title : `${title} — ${STATE_LABEL[state]}`}
      {...(rail !== null ? { style: { borderLeft: `2px solid ${rail}` } } : {})}
    >
      {pulseN > 0 && <span key={pulseN} className="pulse-ring" aria-hidden="true" />}
      <div className="flex items-start justify-between gap-2 min-h-[16px]">
        <div className="flex flex-col gap-0.5 min-w-0">
          {/* Wraps rather than truncates. Truncation was clipping real panel
              titles at 1280px (three measured), and a half-read diagnostic
              label is worse than a two-line one — the title is how the operator
              knows what they are looking at. */}
          <h3 className="t-card-title">{title}</h3>
          {subtitle && <p className="t-helper">{subtitle}</p>}
        </div>
        <span className="flex items-center gap-2 flex-shrink-0">
          {action}
          {provenance && (
            <ProvenanceBadge provenance={provenance} {...(source !== undefined && { detail: source })} />
          )}
        </span>
      </div>
      {children}
    </Card>
  )
}

// ─── Focal figure ─────────────────────────────────────────────────────────────

interface FocalProps {
  value: ReactNode
  /** Qualifier that rides alongside the figure at reduced weight ("of $100", "/ 3"). */
  unit?: ReactNode
  color?: string | undefined
  /** Small caption under the figure — a state word, not a sentence. */
  caption?: ReactNode
}

export function Focal({ value, unit, color, caption }: FocalProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="t-metric leading-none" style={color ? { color } : undefined}>
          {value}
        </span>
        {unit && <span className="t-unit leading-none">{unit}</span>}
      </div>
      {caption && <div className="flex items-center gap-1.5">{caption}</div>}
    </div>
  )
}

// ─── Supporting rows ──────────────────────────────────────────────────────────

/**
 * A label/value pair at metadata weight. Deliberately a single line with the
 * value right-aligned in tabular figures: stacked in a column these form a
 * readable numeric gutter, which is what lets four of them occupy the space one
 * StatCard used to.
 */
export function Row({
  label,
  value,
  color,
  title,
}: {
  label: string
  value: ReactNode
  color?: string | undefined
  title?: string
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-2"
      {...(title !== undefined ? { title } : {})}
    >
      <span className="text-2xs whitespace-nowrap" style={{ color: 'var(--probex-text-muted)' }}>
        {label}
      </span>
      <span
        className="text-2xs font-semibold font-mono tabular-nums truncate"
        style={{ color: color ?? 'var(--probex-text-secondary)' }}
      >
        {value}
      </span>
    </div>
  )
}

export function RowGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1.5 mt-auto">{children}</div>
}

// ─── Progress ─────────────────────────────────────────────────────────────────

/**
 * A 3px meter. The old profit-target bars were 6px tall and as wide as the
 * viewport, which gave a 0% value the same visual footprint as a met target —
 * the bar was reading as a decorative rule. At this size, inside a panel
 * column, the fill is the only thing the eye picks up.
 */
export function Meter({
  value,
  color,
  label,
  ariaLabel,
}: {
  /** 0..1, clamped by the caller's own semantics. */
  value: number
  color: string
  /** Optional caption row rendered above the track. */
  label?: ReactNode
  ariaLabel: string
}) {
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className="flex flex-col gap-1">
      {label}
      <div
        className="h-[3px] rounded-full overflow-hidden"
        style={{ background: 'var(--probex-border-default)' }}
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ─── Empty panel state ────────────────────────────────────────────────────────

/**
 * What a panel shows when its endpoint has not answered.
 *
 * Renders the panel's real frame at full weight with the figures withheld,
 * rather than hiding the panel. A cockpit whose layout changes shape depending
 * on which endpoints replied is one an operator cannot learn — and a missing
 * panel is indistinguishable from a panel reporting zero.
 */
export function PanelPending({ note }: { note: string }) {
  return (
    <div className="flex flex-col gap-2 flex-1 justify-center">
      <div className="skeleton h-7 w-24 rounded" />
      <p className="t-helper">{note}</p>
    </div>
  )
}
