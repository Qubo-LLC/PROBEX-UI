'use client'

// EdgeBadge — the shared live-edge chip (extracted from Phase 1's
// FeaturedMarketCard inline JSX so Markets/Live/Market Detail all use one
// component instead of duplicating it). Replaces V1's fabricated
// ConsensusBadge + SentimentIndicator + ConfidenceMeter trio with ONE honest
// atom driven by the engine's real /api/edges signal — the central V3 move:
// repoint the premium visual vocabulary at real reasoning, not invented
// consensus.

import { formatPercent } from '@/lib/utils'
import type { EdgeRow } from '@/lib/mappers/edges'

interface EdgeBadgeProps {
  edge:       EdgeRow | undefined
  size?:      'sm' | 'md'
  /** Render a muted "No active edge" chip when absent. Default true; pass
   *  false in dense contexts (table cells) where an absent edge should
   *  simply take no space. */
  showEmpty?: boolean
  className?: string
}

export function EdgeBadge({ edge, size = 'md', showEmpty = true, className = '' }: EdgeBadgeProps) {
  if (!edge) {
    if (!showEmpty) return null
    return (
      <span
        className={`text-2xs font-medium rounded px-1.5 py-0.5 ${className}`}
        style={{ color: 'var(--probex-text-disabled)', background: 'var(--probex-surface-2)' }}
      >
        No active edge
      </span>
    )
  }

  const color = edge.direction === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)'
  const fontSize = size === 'sm' ? 'text-2xs' : 'text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1 ${fontSize} font-bold rounded px-1.5 py-0.5 ${className}`}
      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}
      title={edge.confidence !== null ? `${formatPercent(edge.confidence)} confidence${edge.signal ? ` · ${edge.signal}` : ''}` : undefined}
    >
      Edge {edge.edgePct.toFixed(1)}% · {edge.direction.toUpperCase()}
    </span>
  )
}
