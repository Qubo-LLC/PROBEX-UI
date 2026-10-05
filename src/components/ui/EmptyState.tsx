import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Icon or illustration (ReactNode — typically a Lucide icon) */
  icon?:        ReactNode
  /** Primary message */
  title:        string
  /** Supporting description */
  description?: string
  /** CTA button / action */
  action?:      ReactNode
  /** Additional className */
  className?:   string
  /** Size variant */
  size?:        'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: { wrapper: 'py-8',  icon: 'text-3xl', title: 'text-sm',  desc: 'text-xs' },
  md: { wrapper: 'py-12', icon: 'text-4xl', title: 'text-base', desc: 'text-sm' },
  lg: { wrapper: 'py-20', icon: 'text-5xl', title: 'text-lg',  desc: 'text-sm' },
} as const

/**
 * EmptyState
 * ──────────
 * Displayed when a list or data view has no items to show.
 *
 * Usage:
 *   <EmptyState
 *     icon={<Star />}
 *     title="No markets saved"
 *     description="Save markets to your watchlist to track them here."
 *     action={<Button>Browse Markets</Button>}
 *   />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const styles = sizeStyles[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-3',
        styles.wrapper,
        className,
      )}
      role="status"
      aria-label={title}
    >
      {icon && (
        <div
          className={cn(styles.icon, 'opacity-30')}
          style={{ color: 'var(--synatra-text-muted)' }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-w-xs">
        <p
          className={cn(styles.title, 'font-semibold')}
          style={{ color: 'var(--synatra-text-secondary)' }}
        >
          {title}
        </p>
        {description && (
          <p
            className={cn(styles.desc)}
            style={{ color: 'var(--synatra-text-muted)' }}
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="mt-1">
          {action}
        </div>
      )}
    </div>
  )
}
