'use client'

import { useEffect, useRef, useState, type ReactNode, type HTMLAttributes } from 'react'
import { cn, formatDelta } from '@/lib/utils'
import { Card } from './Card'
import { ProvenanceBadge, type Provenance } from '@/components/shared/ProvenanceBadge'
import { ValueFlash } from '@/components/shared/ValueFlash'

// ─── Types ────────────────────────────────────────────────────────────────

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Metric label (e.g. "Total Volume") */
  label:       string
  /** Primary value to display (string or ReactNode for styled values) */
  value:       string | ReactNode
  /** Numeric delta (e.g. 0.124 = +12.4%) — optional */
  delta?:      number
  /** Override delta display text (e.g. "23 new today") */
  deltaLabel?: string
  /** Icon rendered in the card corner */
  icon?:       ReactNode
  /** Accent color for the value text (CSS variable string) */
  valueColor?: string | undefined
  /** Loading state — shows skeleton */
  isLoading?:  boolean
  // ── V3 additions (realizes the blueprint's "MetricStat" via extension) ──
  /** Data-lineage badge shown in the label row (live/derived/awaiting/stale). */
  provenance?: Provenance
  /** Optional endpoint id shown alongside the provenance badge. */
  provenanceDetail?: string
  /** When set, the value flashes on change (liveness). Pass the raw driving
   *  number so directional inference is correct even if `value` is formatted. */
  flashKey?:   number | string
  /** Phase 6A: 'lg' bumps this card's value to the page's focal-metric scale
   *  — use on the one stat that should read as the hero of a multi-stat row.
   *  Defaults to 'md' (unchanged) everywhere else. */
  valueSize?:  'md' | 'lg'
}

/**
 * StatCard
 * ────────
 * Displays a single KPI metric with an optional delta indicator.
 * Used in the hero stats row on the dashboard, portfolio header, etc.
 *
 * Usage:
 *   <StatCard label="Total Volume" value="$284M" delta={0.124} />
 *   <StatCard label="Consensus Avg" value="99.4%" valueColor="var(--probex-primary)" />
 */
export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  valueColor,
  isLoading = false,
  provenance,
  provenanceDetail,
  flashKey,
  valueSize = 'md',
  className,
  ...props
}: StatCardProps) {
  const hasDelta     = delta !== undefined
  const deltaDisplay = deltaLabel ?? (hasDelta ? formatDelta(delta) : undefined)
  const isPositive   = delta !== undefined && delta >= 0

  // Live-update pulse (UX polish): when the driving value (flashKey) changes,
  // remount a one-shot .pulse-ring overlay — a very subtle theme-tinted light
  // around the card, complementing the existing in-text ValueFlash.
  const [pulseN, setPulseN] = useState(0)
  const prevFlash = useRef(flashKey)
  useEffect(() => {
    if (flashKey !== undefined && prevFlash.current !== undefined && flashKey !== prevFlash.current) {
      setPulseN((n) => n + 1)
    }
    prevFlash.current = flashKey
  }, [flashKey])

  // The metric is the loudest element on the card by design — see the
  // typography scale in globals.css. t-metric* carries size, weight, tabular
  // figures and negative tracking together; tightening the tracking is what
  // makes large numerals read as a considered figure rather than as big text.
  const valueNode = (
    <div
      className={cn(valueSize === 'lg' ? 't-metric-lg' : 't-metric', 'leading-none')}
      style={valueColor ? { color: valueColor } : undefined}
    >
      {flashKey !== undefined ? <ValueFlash value={flashKey}>{value}</ValueFlash> : value}
    </div>
  )

  return (
    <Card
      // gap-3 and a taller floor: the metric needs air above and below to read
      // as the focal point. At gap-1.5/88px the label, value and delta formed
      // one undifferentiated block.
      //
      // Top-aligned, NOT centred. Centring looked fine in isolation but broke
      // alignment across a row: a card with a delta line has three children and
      // one without has two, so centring pushed their labels and values to
      // different baselines. In a row of KPIs that misalignment is the first
      // thing the eye catches. The min-height still supplies the floor.
      className={cn('relative flex flex-col gap-3 min-h-[104px]', className)}
      {...props}
    >
      {pulseN > 0 && <span key={pulseN} className="pulse-ring" aria-hidden="true" />}
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <span className="t-label">
          {label}
        </span>
        <span className="flex items-center gap-2">
          {provenance && (
            <ProvenanceBadge provenance={provenance} {...(provenanceDetail !== undefined && { detail: provenanceDetail })} />
          )}
          {icon && (
            <span className="text-text-muted opacity-60 text-sm">
              {icon}
            </span>
          )}
        </span>
      </div>

      {/* Value */}
      {isLoading ? (
        <div className="skeleton h-7 w-24 rounded" />
      ) : (
        valueNode
      )}

      {/* Delta / supporting line — the third tier. A signed delta keeps its
          semantic colour because the direction is the point; a plain
          descriptive string recedes to metadata so it never competes. */}
      {isLoading ? (
        <div className="skeleton h-3.5 w-16 rounded" />
      ) : deltaDisplay ? (
        <p
          className={hasDelta ? 'text-xs font-semibold tabular-nums' : 't-metadata'}
          style={
            hasDelta
              ? { color: isPositive ? 'var(--probex-positive)' : 'var(--probex-negative)' }
              : undefined
          }
        >
          {deltaDisplay}
        </p>
      ) : null}
    </Card>
  )
}
