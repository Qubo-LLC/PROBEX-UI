'use client'

// ChartFrame — the shared state and framing contract for every chart in the
// product, wrapped around the existing rendering libraries rather than
// replacing them.
//
// ─── What this exists to fix ─────────────────────────────────────────────────
// Charts arrived at their states independently. `LiveChart` handled `empty`
// itself and left error/idle/stale to each of its seven consumers; MarketChart
// handled none of them. So "this chart has nothing to show" looked different
// depending on which page you were on, and "the source failed" was frequently
// indistinguishable from "there are no observations" — the same conflation the
// provenance work removed from the rest of the product.
//
// ─── What it owns ────────────────────────────────────────────────────────────
// Title, subtitle, provenance placement, the data-state frame, current-value
// and data-age hierarchy, the responsive viewport container, and the accessible
// summary.
//
// ─── What it deliberately does NOT own ───────────────────────────────────────
// Rendering, series maths, axes, scales, fetching, polling, or interpolation.
// It renders `children` for the plot and never inspects them. That boundary is
// what lets one frame sit over both Recharts and Lightweight Charts without
// knowing which is inside — and what keeps a future library decision cheap.

import type { ReactNode } from 'react'
import { ProvenanceBadge, type Provenance } from './ProvenanceBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { formatAge as formatAgeMs } from '@/lib/display/freshness'
import type { ServiceState } from '@/lib/services/response'

/**
 * Chart data states. Deliberately the SAME vocabulary the rest of the product
 * already uses (see lib/display/systemStatus.ts and ProvenanceBadge) rather
 * than a second, chart-only set of words.
 *
 *   loading      first resolve has not returned
 *   live         confirmed observations, current
 *   stale        confirmed observations, but freshness has degraded — the plot
 *                stays visible; only its currency is qualified
 *   idle         the endpoint answered and reports nothing computed yet
 *   empty        the endpoint answered with zero observations
 *   unavailable  the source could not provide data
 */
export type ChartState = 'loading' | 'live' | 'stale' | 'idle' | 'empty' | 'unavailable'

/**
 * Framing weight. Layout roles, not new visual primitives.
 *
 *   compact   plot only — the caller already supplies a frame (a Panel)
 *   standard  header with title, subtitle and provenance
 *   focal     standard plus the current-value / delta / data-age hierarchy
 */
export type ChartVariant = 'compact' | 'standard' | 'focal'

interface ChartFrameProps {
  title:       string
  subtitle?:   string
  /** Endpoint id shown beside the provenance badge. */
  source?:     string
  provenance?: Provenance
  state?:      ChartState
  variant?:    ChartVariant
  height?:     number

  /** focal only — the chart's headline figure. Stays visually dominant. */
  currentValue?: ReactNode
  /** focal only — pre-formatted change, with its own sign/colour decided by the
   *  caller, which is the only place that knows what "up" means for the series. */
  delta?:      { text: string; positive: boolean }
  /** Epoch ms of the newest CONFIRMED observation. Rendered as an age, and only
   *  when the caller has one — an invented "just now" would be a fabricated fact. */
  lastConfirmedAt?: number

  emptyTitle?:       string
  emptyDescription?: string
  /** Engine's own words when the state is idle or unavailable. */
  message?:          string | null

  /**
   * One sentence describing what the chart shows and its latest confirmed
   * value. REQUIRED: a plot is an image, and an unlabelled image is not
   * accessible just because it is decorative-looking.
   */
  summary:  string
  children: ReactNode
}

/**
 * Derives a chart state from the store slice that feeds it.
 *
 * Six chart consumers were each about to repeat this mapping, and the important
 * part is the ordering: an ERRORED slice is `unavailable` even though its row
 * count is also zero, and a slice whose envelope says `available: false` is
 * `idle` rather than empty. Getting that order wrong is exactly how "the source
 * failed" comes to render as "there is nothing to show", which is the
 * distinction the whole state model exists to keep.
 *
 * `rowCount` is passed separately because only the caller knows which field of
 * its payload is the series.
 */
export function chartStateFromSlice<T extends { available?: boolean; message?: string | null }>(
  slice: ServiceState<T>,
  rowCount: number,
): { state: ChartState; message: string | null } {
  if (slice.status === 'loading') return { state: 'loading', message: null }
  if (slice.status === 'error') return { state: 'unavailable', message: slice.error?.message ?? null }

  const d = slice.data
  // The engine's own "I have not computed this" — not an absence of rows.
  if (d && d.available === false) return { state: 'idle', message: d.message ?? null }
  if (rowCount === 0) return { state: 'empty', message: null }

  // ChartFrame has had a 'stale' state and a StaleStrip since it was written,
  // and nothing ever produced one: this function returned 'live' the moment it
  // had rows, so every chart in the product rendered a LIVE badge over a series
  // that had stopped updating. The plumbing existed; only the signal was
  // missing, and ServiceState now carries it.
  //
  // Deliberately reuses the same `isStale` the panels read rather than
  // introducing a chart-specific notion of freshness — one source of truth, so
  // a chart and the panel beside it can never disagree about the same endpoint.
  if (slice.isStale) {
    return { state: 'stale', message: slice.lastError?.message ?? null }
  }

  return { state: 'live', message: null }
}

/**
 * A series is as fresh as its NEWEST POINT, not as its last successful poll.
 * A poll that succeeds every 30 s over a series whose last snapshot is three
 * days old is not a live chart. Callers derive their state from the slice
 * (`chartStateFromSlice`) and then pass it through here with the newest
 * point's timestamp; a 'live' state older than the threshold becomes 'stale',
 * and the frame's own stale strip carries the age. Same threshold as the
 * consensus reading (lib/display/consensus).
 */
export const SERIES_STALE_AFTER_MS = 15 * 60_000

export function staleBySeriesAge(state: ChartState, newestTs: number | undefined, now: number = Date.now()): ChartState {
  if (state !== 'live' || newestTs === undefined) return state
  return now - newestTs > SERIES_STALE_AFTER_MS ? 'stale' : state
}

/** Compact relative age of a timestamp. Null rather than guessing at a bad input. */
function formatAge(ts: number): string | null {
  if (!Number.isFinite(ts)) return null
  const ageMs = Date.now() - ts
  if (ageMs < 0) return null
  return formatAgeMs(ageMs)
}

export function ChartFrame({
  title,
  subtitle,
  source,
  provenance = 'live',
  state = 'live',
  variant = 'standard',
  height = 200,
  currentValue,
  delta,
  lastConfirmedAt,
  emptyTitle = 'No history yet',
  emptyDescription = 'This chart populates as the session accumulates data.',
  message,
  summary,
  children,
}: ChartFrameProps) {
  const showsPlot = state === 'live' || state === 'stale'
  const age = lastConfirmedAt !== undefined ? formatAge(lastConfirmedAt) : null

  // ─── Lineage must agree with state ─────────────────────────────────────────
  // Callers pass the provenance their series WOULD have, because that is all
  // they know at the point of declaration. If the frame then renders
  // "unavailable" while the badge still reads LIVE, the panel contradicts
  // itself — measured directly: a failing /api/portfolio/history produced
  // "Portfolio Value unavailable · Request failed (404)" beneath a green LIVE
  // badge. Since this component owns both the state and the badge's placement,
  // it is the only place that can keep them consistent, and 'derived' is
  // preserved because it describes how the series was COMPUTED, not whether it
  // arrived.
  const effectiveProvenance: Provenance =
    state === 'unavailable' ? 'unreachable'
    : state === 'idle'      ? 'idle'
    : state === 'stale'     ? 'stale'
    : provenance

  // ─── The plot, or the reason there isn't one ──────────────────────────────
  // Each non-plot state gets its OWN treatment. In particular `unavailable` is
  // never rendered as an empty state: "the source failed" and "the source
  // answered with nothing" are different facts about the engine, and collapsing
  // them is how a broken feed comes to look like a quiet one.
  const body = showsPlot ? (
    // role="img" + a real label: the plot is an image with meaning. Marking it
    // aria-hidden would be simpler and would silently drop the chart from the
    // accessibility tree, which is why `summary` is required rather than
    // optional.
    <div role="img" aria-label={summary} style={{ height }}>
      {children}
    </div>
  ) : state === 'loading' ? (
    <div style={{ height }} className="flex items-center justify-center">
      <span className="t-helper">Loading {title.toLowerCase()}…</span>
    </div>
  ) : state === 'unavailable' ? (
    <div style={{ height }} className="flex items-center justify-center">
      <ErrorState
        title={`${title} unavailable`}
        description={message ?? 'The source did not respond.'}
        fullPage={false}
      />
    </div>
  ) : state === 'idle' ? (
    // Idle keeps the capability's identity visible and withholds the figure —
    // no placeholder line, because a flat series reads as a measurement of zero.
    <div style={{ height }} className="flex flex-col items-center justify-center gap-1 text-center">
      <span className="t-label">Not yet computed</span>
      <span className="t-helper max-w-[42ch]">
        {message ?? 'The engine has not produced this series yet.'}
      </span>
    </div>
  ) : (
    <div style={{ height }} className="flex items-center justify-center">
      <EmptyState size="sm" title={emptyTitle} description={emptyDescription} />
    </div>
  )

  if (variant === 'compact') {
    // The caller owns the frame (typically a Panel), so only the plot and its
    // state belong here. A stale strip still applies — freshness is the
    // chart's own business wherever it is mounted.
    return (
      <div className="flex flex-col gap-1.5">
        {body}
        {state === 'stale' && <StaleStrip age={age} />}
      </div>
    )
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--synatra-surface)', border: '1px solid var(--synatra-border)' }}
    >
      <div
        className="flex items-start justify-between gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--synatra-border)' }}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="t-card-title">{title}</h3>
          {subtitle && <p className="t-helper">{subtitle}</p>}
        </div>
        <span className="flex-shrink-0">
          <ProvenanceBadge provenance={effectiveProvenance} {...(source !== undefined && { detail: source })} />
        </span>
      </div>

      {/* focal: the figure outranks everything around it. Age is metadata and
          is set two steps down the type scale so the header never becomes
          heavier than the plot it introduces. */}
      {variant === 'focal' && currentValue !== undefined && (
        <div className="px-4 pt-3 flex items-baseline gap-2 flex-wrap">
          <span className="t-metric leading-none">{currentValue}</span>
          {delta && (
            <span
              className="text-xs font-semibold tabular-nums"
              style={{ color: delta.positive ? 'var(--synatra-positive)' : 'var(--synatra-negative)' }}
            >
              {delta.text}
            </span>
          )}
          {age && <span className="t-metadata ml-auto">{age}</span>}
        </div>
      )}

      <div className="p-4 pt-3">{body}</div>
      {state === 'stale' && (
        <div className="px-4 pb-3">
          <StaleStrip age={age} />
        </div>
      )}
    </div>
  )
}

/**
 * Stale is NOT empty and NOT unavailable: the plotted points are real confirmed
 * observations, they have simply stopped being refreshed. The line therefore
 * stays exactly as drawn — fabricating points to keep it moving is the failure
 * this states exists to prevent — and only its currency is qualified, in text
 * so the meaning survives greyscale and reduced motion.
 */
function StaleStrip({ age }: { age: string | null }) {
  return (
    <div
      role="status"
      className="flex items-center gap-1.5 px-2 py-1 rounded"
      style={{
        background: 'var(--synatra-warning-dim)',
        border: '1px solid color-mix(in srgb, var(--synatra-warning) 22%, transparent)',
      }}
    >
      <span className="state-dot flex-shrink-0" style={{ background: 'var(--synatra-warning)' }} aria-hidden="true" />
      <span className="text-2xs font-medium" style={{ color: 'var(--synatra-warning)' }}>
        {age ? `Last confirmed ${age}` : 'Last confirmed data — not currently refreshing'}
      </span>
    </div>
  )
}
