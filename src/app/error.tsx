'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ErrorState } from '@/components/ui/ErrorState'

/**
 * App-level error boundary — catches errors outside the dashboard segment
 * (e.g. auth pages, landing). Rendered inside the root layout.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] route error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--synatra-bg)' }}>
      <ErrorState
        fullPage={false}
        title="Something went wrong"
        description="An unexpected error occurred. Please try again."
        detail={error.digest ? `Ref: ${error.digest}` : undefined}
        onRetry={reset}
        secondary={
          <Link href="/" className="btn-ghost px-5 py-2.5 text-sm no-underline">
            Go home
          </Link>
        }
      />
    </div>
  )
}
