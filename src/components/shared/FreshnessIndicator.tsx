'use client'

// FreshnessIndicator — the one place the cockpit says how current a reading is.
//
// Pairs with ProvenanceBadge: that badge answers "where did this number come
// from", this one answers "and is it still true". Both were needed — a panel
// labelled LIVE showing a figure the engine stopped sending twenty minutes ago
// is the specific way this product could mislead an operator, because every
// number on screen is real. It is simply no longer current, and nothing said so.
//
// Rendering rules, in order of how much attention each deserves:
//   stale  — a fault. Coloured, always shows the age and the cause.
//   aging  — muted note. Nothing failed; the endpoint is just behind.
//   fresh  — the quietest possible confirmation, or nothing at all.
//   never  — no reading; the panel's own empty/error state already says so, so
//            this renders nothing rather than adding a second voice.

import type { ServiceState } from '@/lib/services/response'
import { deriveFreshness, type FreshnessLevel } from '@/lib/display/freshness'

interface FreshnessIndicatorProps {
  /** The slice whose currency is being described. */
  state: ServiceState<unknown>
  /** The endpoint's poll cadence, when known — enables the 'aging' level. */
  expectedIntervalMs?: number
  /**
   * Show the age even when everything is fine. Off by default: on a healthy
   * cockpit an "Updated just now" on every panel is noise that trains the
   * operator to stop reading the row where the real warning will appear.
   */
  showWhenFresh?: boolean
  className?: string
}

const LEVEL_COLOR: Record<FreshnessLevel, string> = {
  fresh: 'var(--probex-text-disabled)',
  aging: 'var(--probex-text-muted)',
  stale: 'var(--probex-warning)',
  never: 'var(--probex-text-disabled)',
}

export function FreshnessIndicator({
  state,
  expectedIntervalMs,
  showWhenFresh = false,
  className = '',
}: FreshnessIndicatorProps) {
  const f = deriveFreshness(state, expectedIntervalMs)

  if (f.level === 'never') return null
  if (f.level === 'fresh' && !showWhenFresh) return null

  const color = LEVEL_COLOR[f.level]

  return (
    <span
      className={`inline-flex items-center gap-1 text-2xs font-medium ${className}`}
      style={{ color }}
      title={f.message}
      // The full sentence goes to assistive tech; sighted users get the terse
      // label plus the same sentence on hover. role="status" (not "alert")
      // because staleness is a condition to notice, not an interruption.
      role="status"
      aria-label={f.message}
    >
      {f.level === 'stale' && (
        <span
          className="w-1.5 h-1.5 rounded-full inline-block"
          style={{ background: color }}
          aria-hidden="true"
        />
      )}
      <span className="tabular-nums">
        {f.level === 'stale' ? `Stale · ${f.ageLabel}` : `Updated ${f.ageLabel}`}
      </span>
    </span>
  )
}

/**
 * The stale banner for a whole panel or page region.
 *
 * Used where a single inline label is too easy to miss — a page whose primary
 * figures have all stopped updating. Renders nothing unless the slice is
 * actually stale, so it can be dropped in unconditionally.
 */
export function StaleNotice({
  state,
  className = '',
}: {
  state: ServiceState<unknown>
  className?: string
}) {
  const f = deriveFreshness(state)
  if (f.level !== 'stale') return null

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded text-2xs ${className}`}
      style={{
        background: 'var(--probex-warning-dim)',
        color:      'var(--probex-warning)',
        border:     '1px solid var(--probex-warning)',
      }}
      role="status"
    >
      <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: 'currentColor' }} aria-hidden="true" />
      <span>
        <strong className="font-semibold">Not live.</strong>{' '}
        {f.message}{' '}
        Values below are the last successfully received readings.
      </span>
    </div>
  )
}
