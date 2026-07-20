'use client'

// LiveHeartbeat — Phase 6A liveness primitive. The engine already polls
// every 2-30s depending on endpoint; this makes that cadence *felt* without
// inventing anything — it reads the store's own `lastRefreshed` timestamp
// and ticks a relative "Xs ago" label once a second. One instance lives in
// the persistent top nav (EngineStatusStrip) rather than being repeated on
// every page — a single confident, always-visible pulse reads calmer than
// fifteen independent ones.

import { useEffect, useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'

export function LiveHeartbeat() {
  const lastRefreshed = useApplicationStore((s) => s.lastRefreshed)
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (lastRefreshed === null) return null

  const seconds = Math.max(0, Math.floor((Date.now() - lastRefreshed) / 1000))
  const label = seconds < 2 ? 'just now' : `${seconds}s ago`
  const fresh = seconds < 3

  return (
    <span
      className="flex items-center gap-1.5 text-2xs tabular-nums hidden lg:flex"
      style={{ color: 'var(--probex-text-muted)' }}
      title="Time since the engine's last successful poll"
    >
      <span
        className={fresh ? 'live-dot w-1.5 h-1.5' : 'w-1.5 h-1.5 rounded-full inline-block'}
        style={{ background: fresh ? 'var(--probex-positive)' : 'var(--probex-text-disabled)' }}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
