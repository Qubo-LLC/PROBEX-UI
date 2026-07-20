'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ErrorState } from '@/components/ui/ErrorState'
import { ROUTES } from '@/config/constants'

/**
 * Dashboard error boundary — catches render/runtime errors in any dashboard
 * page and offers recovery (reset re-renders the segment; link returns home).
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
 // forward to telemetry/Sentry.
    console.error('[dashboard] route error:', error)
  }, [error])

  return (
    <ErrorState
      title="This page hit a snag"
      description="We couldn't render this view. Try again, or return to your dashboard."
      detail={error.digest ? `Ref: ${error.digest}` : undefined}
      onRetry={reset}
      secondary={
        <Link href={ROUTES.HOME} className="btn-ghost px-5 py-2.5 text-sm no-underline">
          Back to dashboard
        </Link>
      }
    />
  )
}
