import type { ReactNode, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Page title (h1) */
  title:      string
  /** Optional subtitle line */
  subtitle?:  string
  /** Optional badge/chip next to title (e.g. role badge, live indicator) */
  badge?:     ReactNode
  /** Right-side actions slot (buttons, filters) */
  actions?:   ReactNode
  /** Whether to show the bottom divider */
  divider?:   boolean
}

/**
 * PageHeader
 * ──────────
 * Consistent header for all dashboard pages.
 *
 * Usage:
 *   <PageHeader
 *     title="Markets"
 *     subtitle="840 active Bitcoin prediction markets"
 *     actions={<Button>Create Alert</Button>}
 *   />
 */
export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  divider = false,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 mb-5',
        divider && 'pb-4 border-b border-border-subtle',
        className,
      )}
      {...props}
    >
      {/* Left: title block.
          `.t-page-title` / `.t-page-subtitle` were defined in the type scale but
          had zero consumers anywhere in the product — every page header
          hand-rolled its own Tailwind instead. Adopting them here activates both
          classes across every route that uses PageHeader, and moves the title
          from 18px to the scale's own 20px/tracking-tight definition. Colour now
          comes from the class rather than an inline style. */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="t-page-title">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="t-page-subtitle">{subtitle}</p>}
      </div>

      {/* Right: actions */}
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
