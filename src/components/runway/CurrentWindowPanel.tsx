'use client'

// The current window per asset: the P2 rule's working quotes as they would be
// placed now (side, price, size), the market bid/ask, and the time left.
// VISIBILITY ONLY — it reads /api/runway/live and never changes the ledger.
// When the window closes and is simulated, its orders appear in Activity.

import { useEffect, useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import type { LiveWindow } from '@/types/runway'

const REASON: Record<string, string> = {
  outside_time_band: 'outside the time band',
  outside_mid_band: 'mid outside 0.15–0.85',
  no_book: 'no book',
}

function useNow(ms = 1_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

export function CurrentWindowPanel() {
  const slice = useApplicationStore((s) => s.engine.runwayLive)
  const now = useNow()
  const live = slice.status === 'success' ? slice.data : null

  return (
    <section aria-labelledby="runway-live" className="mt-6">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 id="runway-live" className="t-section-title">Current windows</h2>
        <span className="t-description">P2 working quotes · visibility only, not orders</span>
      </div>
      {live === null ? (
        <p className="t-description">{slice.status === 'error' ? 'The engine did not answer /api/runway/live.' : 'Loading…'}</p>
      ) : live.windows.length === 0 ? (
        <p className="t-description">No open window.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {live.windows.map((w) => <WindowCard key={`${w.asset}-${w.durationMinutes}-${w.windowStartMs}`} w={w} now={now} />)}
        </div>
      )}
    </section>
  )
}

function WindowCard({ w, now }: { w: LiveWindow; now: number }) {
  const left = Math.max(0, Math.round((w.windowEndMs - now) / 1000))
  return (
    <div className="rounded px-3 py-2 text-sm" data-testid={`live-${w.asset}-${w.durationMinutes}`}
         style={{ border: '1px solid var(--synatra-border)' }}>
      <div className="flex justify-between">
        <span className="font-semibold">{w.asset} {w.durationMinutes}m</span>
        <span className="t-description">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} left</span>
      </div>
      {w.tokens.map((t) => (
        <div key={t.token} className="flex justify-between mt-1">
          <span>{t.token === 'up' ? 'Up' : 'Down'} {t.bid?.toFixed(2) ?? '—'} / {t.ask?.toFixed(2) ?? '—'}</span>
          {t.quote ? (
            <span style={{ color: 'var(--synatra-primary)' }}>
              {t.quote.side} {t.quote.size} @ {t.quote.price.toFixed(2)}
            </span>
          ) : (
            <span className="t-description">{REASON[t.notQuoting ?? ''] ?? t.notQuoting ?? '—'}</span>
          )}
        </div>
      ))}
    </div>
  )
}
