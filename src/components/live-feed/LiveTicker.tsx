'use client'

// LiveTicker — restored from V1 (git 0e3833a4), rebuilt on real /api/events
// data instead of the simulated WebSocket stream (RealtimeProvider/liveStore,
// removed in M5 and never restored — PROBEX_V3 explicitly forbids it).
// EventRow already denormalizes marketTitle, so — unlike V1 — no separate
// market-lookup map is needed to label each entry.

import { useMemo, useRef, useEffect } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEventRows } from '@/lib/mappers/events'

export function LiveTicker() {
  const eventsSlice = useApplicationStore((s) => s.engine.events)
  const trackRef = useRef<HTMLDivElement>(null)

  const rows = useMemo(() => {
    if (!eventsSlice.data) return []
    const parsed = parseEventRows(eventsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows.slice(0, 20) : []
  }, [eventsSlice.data])

  useEffect(() => {
    const track = trackRef.current
    if (!track || rows.length === 0) return

    let frame: number
    let offset = 0
    const scroll = () => {
      offset += 0.5
      if (offset >= track.scrollWidth / 2) offset = 0
      track.style.transform = `translateX(-${offset}px)`
      frame = requestAnimationFrame(scroll)
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!prefersReduced) frame = requestAnimationFrame(scroll)
    return () => cancelAnimationFrame(frame)
  }, [rows.length])

  if (rows.length === 0) return null

  return (
    <div
      role="marquee"
      aria-label="Live engine activity"
      aria-live="off"
      className="overflow-hidden flex items-center"
      style={{ borderTop: '1px solid var(--probex-border)', borderBottom: '1px solid var(--probex-border)', background: 'var(--probex-surface)', height: 32 }}
    >
      <div ref={trackRef} className="flex whitespace-nowrap" style={{ gap: 48, willChange: 'transform' }}>
        {[...rows, ...rows].map((row, i) => (
          <span key={`${row.id}-${i}`} className="text-2xs font-medium" style={{ color: row.amount !== null ? 'var(--probex-yes)' : 'var(--probex-text-secondary)' }}>
            ● {row.marketTitle ? `${row.marketTitle.slice(0, 40)}${row.marketTitle.length > 40 ? '…' : ''}` : row.type} · {row.description}
          </span>
        ))}
      </div>
    </div>
  )
}
