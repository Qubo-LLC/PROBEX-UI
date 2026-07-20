import type { ReactNode, HTMLAttributes } from 'react'
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

  const valueNode = (
    <div
      className={`${valueSize === 'lg' ? 'text-3xl' : 'text-2xl'} font-bold leading-none tabular-nums`}
      style={valueColor ? { color: valueColor } : undefined}
    >
      {flashKey !== undefined ? <ValueFlash value={flashKey}>{value}</ValueFlash> : value}
    </div>
  )

  return (
    <Card
      className={cn('flex flex-col gap-1.5 min-h-[88px]', className)}
      {...props}
    >
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
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

      {/* Delta */}
      {isLoading ? (
        <div className="skeleton h-3.5 w-16 rounded" />
      ) : deltaDisplay ? (
        <p
          className={cn(
            'text-xs font-medium',
            hasDelta
              ? isPositive
                ? 'text-positive'
                : 'text-negative'
              : 'text-text-muted',
          )}
          style={
            hasDelta
              ? { color: isPositive ? 'var(--probex-positive)' : 'var(--probex-negative)' }
              : { color: 'var(--probex-text-muted)' }
          }
        >
          {deltaDisplay}
        </p>
      ) : null}
    </Card>
  )
}
