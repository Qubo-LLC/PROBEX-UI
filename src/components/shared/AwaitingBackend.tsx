'use client'

// AwaitingBackend — the V3 fifth data-state (PROBEX_V3_RESTORATION_PLAN §2).
//
// The four-state contract is loading · error · empty · data. V3 adds a fifth:
// AWAITING BACKEND, for widgets whose backing capability does not exist yet.
// Instead of hiding the widget (V2) or faking data (V1), we render its real
// frame — title, honest description of what it *will* show — with a provenance
// notice naming the required endpoint. When Jake ships the endpoint, the widget
// flips to live with zero structural change (registry flip only).
//
// Truth-first: this never renders numbers. It renders intent + provenance, plus
// an optional non-interactive layout skeleton so the operator can see the shape
// of what is coming without mistaking it for real data.

import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { ProvenanceBadge } from './ProvenanceBadge'

interface AwaitingBackendProps {
  /** What this widget will show once its endpoint exists. */
  title:       string
  /** Honest one-liner: what the data is and why it isn't here yet. */
  description: string
  /** Endpoint id / feature label for the provenance badge (e.g. "CE-2"). */
  endpoint?:   string
  /**
   * Optional non-interactive layout preview (a dimmed skeleton of the eventual
   * widget). Rendered with pointer-events disabled and reduced opacity so it
   * reads as "coming soon", never as live content.
   */
  children?:   ReactNode
  /** Render inside a Card (default) or bare, when the caller supplies framing. */
  bare?:       boolean
  /**
   * 'stack' (default) — title above description, for section/card-sized slots.
   * 'inline' — title + badge on one line, description as trailing muted text;
   * for slim horizontal contexts (status bars, table cells) where the stacked
   * layout would be too tall.
   */
  layout?:     'stack' | 'inline'
  className?:  string
}

export function AwaitingBackend({
  title,
  description,
  endpoint,
  children,
  bare = false,
  layout = 'stack',
  className = '',
}: AwaitingBackendProps) {
  const badge = <ProvenanceBadge provenance="awaiting" {...(endpoint !== undefined && { detail: endpoint })} />

  const body =
    layout === 'inline' ? (
      <div
        className={`flex items-center gap-2.5 flex-wrap ${className}`}
        role="status"
        aria-label={`${title} — awaiting backend`}
      >
        <h3 className="t-label whitespace-nowrap">
          {title}
        </h3>
        {badge}
        <p className="text-2xs leading-relaxed min-w-0" style={{ color: 'var(--probex-text-disabled)' }}>
          {description}
        </p>
      </div>
    ) : (
      <div className={`flex flex-col gap-3 ${className}`} role="status" aria-label={`${title} — awaiting backend`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="t-label">
              {title}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
              {description}
            </p>
          </div>
          {badge}
        </div>

        {children && (
          <div
            className="opacity-40 pointer-events-none select-none"
            aria-hidden="true"
          >
            {children}
          </div>
        )}
      </div>
    )

  if (bare) return body

  return (
    // Recessed surface tier (Phase 1 · T5) — the canonical pending/awaiting
    // material (more opaque, less blur, dashed border).
    <Card variant="recessed" className="flex flex-col gap-3">
      {body}
    </Card>
  )
}
