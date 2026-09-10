'use client'

// Figure — a number, its label, and how well it is KNOWN, without a container.
//
// ─── Why this exists ─────────────────────────────────────────────────────────
// StatCard did this job and did it well, but it could only do it inside a card,
// because the provenance claim lived in the card's header (StatCard.tsx:116,
// Panel.tsx:221, ChartFrame). So "make this figure truthful" and "put this
// figure in a box" were the same operation, and the card grid followed
// mechanically. Roughly 110 badges were rendered across the product, the large
// majority of them saying "Live" — an affirmation a reader establishes once per
// page, restated a hundred times until it stopped meaning anything.
//
// Figure separates the two. The epistemic state becomes a property of the
// number (the .c-* certainty scale in globals.css); the container becomes a
// separate decision, made only where a causal or semantic boundary justifies
// one. StatCard is NOT retired — it stays correct wherever a card is genuinely
// warranted. What changes is that it is no longer the only way to be honest.
//
// ─── The asymmetry ───────────────────────────────────────────────────────────
// Quiet the affirmations, keep the warnings loud.
//
//   confirmed  the default. Full contrast, no ornament, no badge.
//   derived    recessed, with a hairline mark and "Derived" in its label.
//   stale      recessed, and REQUIRED to render a visible age beside it.
//   absent     the slot at its real size, with the engine's own reason.
//
// 'synthetic' and 'unreachable' are deliberately NOT certainty states here.
// Those are warnings — the number was fabricated locally, or no number exists —
// and they keep the full ProvenanceBadge treatment at their call site. A reader
// must never have to notice a contrast step to learn that a figure is fake.
//
// ─── Accessibility ───────────────────────────────────────────────────────────
// Contrast is never the sole carrier (WCAG 1.4.1). Every non-confirmed state
// pairs its contrast shift with something textual:
//
//   derived  the word "Derived" in the accessible name and the title tooltip,
//            plus a non-colour hairline rule (a background on an empty
//            pseudo-element, so no string enters the accessibility tree)
//   stale    a visible age string — `staleFor` is REQUIRED by the types when
//            certainty is 'stale', so the pairing cannot be forgotten
//   absent   the reason rendered as visible text
//
// The dimming is always the second signal. A certainty state with no textual
// carrier is a bug, not a style choice.

import type { ReactNode } from 'react'
import { ValueFlash } from './ValueFlash'
import { deriveFreshness } from '@/lib/display/freshness'
import type { ServiceState } from '@/lib/services/response'

/** How well this number is known. See the header for why 'synthetic' and
 *  'unreachable' are absent — they are warnings, not certainty levels. */
export type Certainty = 'confirmed' | 'derived' | 'stale' | 'absent'

/** Which numeric register the value renders at. Maps to the type scale in
 *  globals.css rather than to a pixel size, so the page's hierarchy stays a
 *  scale decision rather than a per-call-site one.
 *
 *  `display` is the page's single hero figure. One per page — a second one
 *  does not create emphasis, it removes it. */
export type FigureSize = 'display' | 'lg' | 'md' | 'sm'

const SIZE_CLASS: Record<FigureSize, string> = {
  display: 't-metric-display',
  lg:      't-metric-lg',
  md:      't-metric-md',
  sm:      't-metric-sm',
}

/** Placeholder width, so an absent figure holds the space its value will
 *  occupy and the layout does not reflow when the number lands. */
const ABSENT_GLYPH: Record<FigureSize, string> = {
  display: '——',
  lg:      '——',
  md:      '—',
  sm:      '—',
}

type FigureProps = {
  /** What this number is. Rendered as a quiet uppercase label above the value. */
  label?: string
  /** The register this figure occupies in the page's hierarchy. */
  size?: FigureSize
  /** Pre-formatted value. Formatting belongs to the caller — only it knows
   *  whether this is currency, a percentage, or a duration. */
  children?: ReactNode
  /** Colour override for the value (P&L sign, a tone). Applied only when the
   *  figure is `confirmed`: tinting a stale or derived number would undo the
   *  contrast step that marks it. */
  tone?: string | undefined
  /** Change indicator rendered beside the value, sign and colour already
   *  decided by the caller — only it knows what "up" means for this series. */
  delta?: { text: string; positive: boolean } | undefined
  /** Watch this for change and flash the value when it moves. Pass the raw
   *  number, not the formatted string. Cadence-gated by the caller: only
   *  fast-tier figures should flash. */
  flashOn?: number | string | undefined
  /** Extra context under the value — a comparison, a window, a caveat. */
  footnote?: ReactNode
  className?: string
  /** Tooltip on the label. The endpoint path belongs here on intelligence
   *  surfaces; System states it in the open instead. */
  title?: string | undefined
} & (
  | { certainty?: 'confirmed' | 'derived'; staleFor?: never; absentReason?: never }
  // The type system enforces the accessibility pairing: a stale figure cannot
  // be rendered without the age string that carries its meaning textually.
  | { certainty: 'stale'; staleFor: string; absentReason?: never }
  // Likewise for absent — the engine's own words, or a caller-supplied reason.
  | { certainty: 'absent'; absentReason: string; staleFor?: never }
)

// ─── Deriving certainty from a slice ─────────────────────────────────────────

/**
 * What `certaintyFromSlice` hands back — spread straight onto <Figure>.
 *
 * Deliberately excludes 'absent'. Absence is a question about the VALUE ("is
 * there a number?"), which only the call site can answer and can explain far
 * better than a generic message; staleness is a question about the SLICE ("did
 * the last refresh fail?"), which is exactly what this reads. Keeping them
 * apart means a call site's own absent reason is never overwritten by a
 * generic one.
 */
export type FigureCertaintyProps =
  | { certainty: 'confirmed' }
  | { certainty: 'stale'; staleFor: string }

/**
 * Turns a polled slice's real timing state into the certainty of a figure
 * drawn from it.
 *
 * ─── Why this helper exists ──────────────────────────────────────────────────
 * The first build of this scale shipped `confirmed` and `absent` and nothing
 * else, which was a REGRESSION rather than a simplification. `ProvenanceBadge`
 * already downgraded a 'live' claim to 'Stale' whenever the slice behind it had
 * stopped refreshing (see its `state` prop). Removing ~110 of those badges and
 * replacing them with figures that had no stale path meant a figure whose
 * endpoint had died kept rendering at full confidence, with only a page-level
 * line changing. That is strictly less honest than what it replaced.
 *
 * Page freshness and figure certainty are different claims and neither
 * substitutes for the other:
 *
 *   PAGE FRESHNESS   overall temporal context — "this screen is current"
 *   FIGURE CERTAINTY truth about THIS value  — "this number is retained"
 *
 * A page can be broadly current while one endpoint behind one figure is dead.
 *
 * ─── Nothing is invented ─────────────────────────────────────────────────────
 * Every branch reads facts the slice already carries. `deriveFreshness` returns
 * 'stale' only when `state.isStale` — i.e. the last refresh actually FAILED —
 * and 'never' only when nothing has ever arrived. 'aging' is deliberately
 * treated as confirmed: nothing failed, the endpoint is merely behind, and
 * marking the value itself as qualified would cry wolf on ordinary tab
 * switching. That distinction is the whole point of lib/display/freshness and
 * is not re-litigated here.
 *
 * @param state              the slice the figure's value came from
 * @param expectedIntervalMs its poll cadence, when the caller knows it
 */
export function certaintyFromSlice(
  state: ServiceState<unknown>,
  expectedIntervalMs?: number,
): FigureCertaintyProps {
  const f = expectedIntervalMs === undefined
    ? deriveFreshness(state)
    : deriveFreshness(state, expectedIntervalMs)

  if (f.level === 'stale') {
    // ageLabel is non-null whenever level is 'stale' (both derive from a
    // non-null age), but the type does not say so — fall back rather than
    // assert, so a future change to that module cannot crash a figure.
    return { certainty: 'stale', staleFor: f.ageLabel ?? 'unknown age' }
  }
  // 'never' also lands here: with nothing ever received, the call site's value
  // is null and its own absent branch takes over with a specific reason.
  return { certainty: 'confirmed' }
}

export function Figure(props: FigureProps) {
  const {
    label,
    size = 'md',
    children,
    tone,
    delta,
    flashOn,
    footnote,
    className = '',
    title,
    certainty = 'confirmed',
  } = props

  const sizeClass = SIZE_CLASS[size]

  // ─── The accessible name ───────────────────────────────────────────────────
  // Carries the certainty as a WORD in every non-confirmed state, which is what
  // makes the visual treatment legal rather than colour-only.
  const certaintyWord =
    certainty === 'derived' ? 'Derived value'
    : certainty === 'stale' ? `Stale — last updated ${props.staleFor}`
    : certainty === 'absent' ? `Not available — ${props.absentReason}`
    : null

  const valueNode: ReactNode =
    certainty === 'absent'
      ? <span className={`${sizeClass} c-absent`} aria-hidden="true">{ABSENT_GLYPH[size]}</span>
      : (
        <span
          className={[
            sizeClass,
            certainty === 'derived' ? 'c-derived' : '',
            certainty === 'stale' ? 'c-stale' : '',
          ].filter(Boolean).join(' ')}
          // A tone would compete with the contrast step that marks a figure as
          // derived or stale, so it applies to confirmed figures only.
          {...(tone !== undefined && certainty === 'confirmed' ? { style: { color: tone } } : {})}
        >
          {children}
        </span>
      )

  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      {label !== undefined && (
        // `truncate` was on the whole line, which clipped the stale age at
        // narrow widths — measured at 538px: "DETECTED · 39s a…". That age is
        // the TEXTUAL CARRIER for the stale state, the thing that keeps the
        // treatment from being contrast-only, so it is the one part of this
        // line that must never be cut. The label itself may still truncate;
        // the age wraps instead.
        <span className="t-label flex flex-wrap items-baseline gap-x-1 min-w-0" {...(title !== undefined && { title })}>
          <span className="truncate">{label}</span>
          {/* The certainty word, visible rather than tooltip-only for the two
              states a reader must be able to ACT on. 'derived' stays in the
              accessible name and tooltip: it qualifies a number, it does not
              warn about one. */}
          {/* The textual carriers. Both states name themselves in the label
              rather than relying on the contrast step, which is what keeps the
              treatment out of WCAG 1.4.1 territory. Stale is warning-coloured
              because it is a fault the operator may need to act on; derived is
              muted because it qualifies a number rather than warning about it. */}
          {certainty === 'stale' && (
            <span className="normal-case tracking-normal whitespace-nowrap" style={{ color: 'var(--probex-warning)' }}>
              · {props.staleFor}
            </span>
          )}
          {certainty === 'derived' && (
            <span className="normal-case tracking-normal whitespace-nowrap" style={{ color: 'var(--probex-text-disabled)' }}>
              · derived
            </span>
          )}
        </span>
      )}

      <span
        className="flex items-baseline gap-2 flex-wrap min-w-0"
        {...(certaintyWord !== null && { title: certaintyWord })}
      >
        {/* One accessible reading of value + certainty, so a screen reader is
            never handed a bare number whose status is carried only by pixels. */}
        {certaintyWord !== null && <span className="sr-only">{certaintyWord}. </span>}

        {flashOn !== undefined && certainty === 'confirmed'
          ? <ValueFlash value={flashOn}>{valueNode}</ValueFlash>
          : valueNode}

        {delta !== undefined && certainty !== 'absent' && (
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: delta.positive ? 'var(--probex-positive)' : 'var(--probex-negative)' }}
          >
            {delta.text}
          </span>
        )}
      </span>

      {/* An absent figure states the engine's own reason in the open. This is
          the whole of "absence is drawn": the slot keeps its size, and the
          space carries why it is empty rather than reading as a gap. */}
      {certainty === 'absent' && (
        <span className="t-helper">{props.absentReason}</span>
      )}

      {footnote !== undefined && certainty !== 'absent' && (
        <span className="t-helper">{footnote}</span>
      )}
    </div>
  )
}
