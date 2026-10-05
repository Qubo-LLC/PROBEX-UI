'use client'

// SectionHeading — one treatment for "this is a group of related things".
//
// ─── Why this exists ─────────────────────────────────────────────────────────
// Synatra had four dialects for the same idea, and which one a section spoke
// depended entirely on which week it was written:
//
//   .t-section-title                              Overview
//   text-sm font-bold + inline colour             Live Feed, Positions,
//                                                 Portfolio, Strategy,
//                                                 Analytics (×14 in total)
//   text-xs font-semibold uppercase tracking-...  Portfolio's local ChartCard
//   Overview-only <SectionHeader>                 Featured / Trending
//
// A reader cannot learn a hierarchy that changes shape per page. Worse, three
// of the four were hand-written strings, so each new section was a fresh chance
// to pick a fifth. Routing them all through one component makes the heading
// level a decision the design system owns.
//
// The count slot matters more than it looks: "Active Edges (3)" was being
// concatenated into the heading string at four separate call sites, each with
// its own singular/plural logic. Here it is a separate, quieter element — the
// number is data, not part of the title.

import type { ReactNode } from 'react'

interface SectionHeadingProps {
  title: string
  /** One line of context. Skip it when the title is self-evident. */
  subtitle?: string
  /**
   * A count of what the section contains. Rendered as a distinct muted figure
   * rather than folded into the title, and omitted entirely when null — an
   * unknown count must not render as "(0)".
   */
  count?: number | null
  /** Right-side slot: sort controls, filters, links. */
  actions?: ReactNode
  /** Heading level. Defaults to h2; pass h3 for a subsection. */
  as?: 'h2' | 'h3'
  className?: string
}

export function SectionHeading({
  title,
  subtitle,
  count,
  actions,
  as: Tag = 'h2',
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={`flex items-end justify-between gap-3 flex-wrap ${className}`}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-baseline gap-2">
          <Tag className="t-section-title">{title}</Tag>
          {count !== undefined && count !== null && (
            <span className="text-2xs font-mono tabular-nums" style={{ color: 'var(--synatra-text-muted)' }}>
              {count}
            </span>
          )}
        </div>
        {subtitle && <p className="t-description">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}
