'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  /** Heading */
  title?:       string | undefined
  /** Supporting description */
  description?: string | undefined
  /** Optional technical detail (e.g. error.digest) shown in a muted mono line */
  detail?:      string | undefined
  /** Primary recovery action (e.g. "Try again") */
  onRetry?:     (() => void) | undefined
  retryLabel?:  string | undefined
  /** Secondary action slot (e.g. a Link back home) */
  secondary?:   ReactNode | undefined
  className?:   string | undefined
  /** Fill the viewport vertically (route-level boundary) vs inline */
  fullPage?:    boolean | undefined
}

/**
 * ErrorState
 * ──────────
 * Shared error surface used by route error boundaries and inline failures.
 * Matches the design system: surface card, muted iconography, brand CTA.
 */
export function ErrorState({
  title       = 'Something went wrong',
  description = 'An unexpected error occurred while loading this view. You can try again or head back.',
  detail,
  onRetry,
  retryLabel  = 'Try again',
  secondary,
  className,
  fullPage    = true,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-5',
        fullPage ? 'min-h-[60vh] page-container' : 'py-12',
        className,
      )}
      role="alert"
    >
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--probex-negative-dim)', border: '1px solid var(--probex-negative-border)' }}
        aria-hidden="true"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--probex-negative)' }}>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        <h1 className="text-xl font-bold" style={{ color: 'var(--probex-text-primary)' }}>{title}</h1>
        <p className="text-sm" style={{ color: 'var(--probex-text-muted)' }}>{description}</p>
        {detail && (
          <p className="text-2xs font-data mt-1 px-2 py-1 rounded inline-block mx-auto" style={{ background: 'var(--probex-surface-2)', color: 'var(--probex-text-disabled)' }}>
            {detail}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onRetry && (
          <button onClick={onRetry} className="btn-primary px-5 py-2.5 text-sm">
            {retryLabel}
          </button>
        )}
        {secondary}
      </div>
    </div>
  )
}
