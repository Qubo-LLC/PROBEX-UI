'use client'

import { useEffect } from 'react'

/**
 * Global error boundary — last resort when the root layout itself throws.
 * Must render its own <html>/<body>; uses inline styles since the app's
 * stylesheet may not be applied at this level.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global] fatal error:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#03050D',
          color: '#e6e8ee',
          // Literal stack, not var(--font-sans): global-error replaces the root
          // layout when it fires, so globals.css may not have applied. Named
          // Inter until now, which the app never shipped.
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Application error</h1>
          <p style={{ fontSize: 14, color: '#8b90a0', marginBottom: 20 }}>
            A critical error occurred and the app could not recover.
            {error.digest ? ` (Ref: ${error.digest})` : ''}
          </p>
          <button
            onClick={reset}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(135deg, #00d4ff, #6d5ef7)',
              cursor: 'pointer',
            }}
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  )
}
