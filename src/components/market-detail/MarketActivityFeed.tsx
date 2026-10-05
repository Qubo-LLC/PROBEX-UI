'use client'

// MarketActivityFeed — the engine's events that name this market, on the
// shared EventStream row.
//
// ─── Why it now uses the shared row ──────────────────────────────────────────
// This was the last bespoke event row in the product: a dot, the wire message
// (which for a trade is "Recorded paper trade … for 0xa2152dfb…" — the raw
// id), a relative age, and two fields (`amount`, `probability`) the wire has
// never carried. Live Feed, System and Portfolio had already moved to one row
// grammar; a market's activity rendered a fourth way. The shared row also
// brings the consecutive-repeat fold, the record disclosure and the UTC clock.
//
// ─── What "this market's activity" means, precisely ──────────────────────────
// Events whose metadata names this id: a trade's `market_id`, or an edge
// event's `top_edge_market_id`. An edge event names only its STRONGEST edge,
// so a cycle that found two edges and led with another market is not listed
// here even if this market was the second — the wire does not say. Resolution
// events name no market at all. Stated in the section's qualifier rather than
// left for the reader to infer.
//
// The one variant asked of the shared row: `hideMarket`, because every row
// here is about the market the page is already showing.

import { useMemo } from 'react'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEventRows, collapseConsecutiveRepeats } from '@/lib/mappers/events'
import { deriveFreshness } from '@/lib/display/freshness'
import { EventStream } from '@/components/shared/EventStream'
import { ROUTES } from '@/config/constants'

/** Events poll at MEDIUM cadence (ApplicationStateLoader). */
const EVENTS_POLL_MS = 5_000

export function MarketActivityFeed({ marketId }: { marketId: string }) {
  const slice = useApplicationStore((s) => s.engine.events)

  const rows = useMemo(() => {
    if (!slice.data) return null
    const parsed = parseEventRows(slice.data)
    if (parsed.kind === 'unrecognized') return 'unrecognized' as const
    if (parsed.kind === 'empty') return []
    // Newest-first from the mapper; only consecutive repeats fold.
    return collapseConsecutiveRepeats(parsed.rows.filter((r) => r.marketId === marketId))
  }, [slice.data, marketId])

  const freshness = deriveFreshness(slice, EVENTS_POLL_MS)

  return (
    <section aria-labelledby="md-activity" className="flex flex-col gap-3 pt-6" style={{ borderTop: '1px solid var(--synatra-border)' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-baseline gap-2 flex-wrap">
          <h2 id="md-activity" className="t-section-title">Activity</h2>
          <span className="t-description">events that name this market, newest first</span>
        </span>
        <span className="flex items-baseline gap-3">
          <span className="t-metadata">/api/events · retained window{slice.data ? ` of ${slice.data.limit}` : ''}</span>
          <Link href={`${ROUTES.SYSTEM}?view=events`} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>
            Full log →
          </Link>
        </span>
      </div>

      {slice.status === 'error' ? (
        // No data has ever arrived. Whether this market had activity is
        // unknown — not "none".
        <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>
          The event log did not answer, so whether the engine recorded anything on this market is unknown.
        </p>
      ) : rows === null ? (
        <p className="t-description">Waiting for the event log.</p>
      ) : rows === 'unrecognized' ? (
        <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>
          The engine returned events whose shape doesn’t match the agreed schema — they are withheld rather than shown with guessed fields.
        </p>
      ) : rows.length === 0 ? (
        <p className="t-description">
          No event in the engine’s retained log names this market. Edge events name only their strongest market, and the log keeps the most recent {slice.data?.limit ?? '—'} events — older activity is no longer visible here.
        </p>
      ) : (
        <>
          {freshness.level === 'stale' && (
            <p className="t-helper" style={{ color: 'var(--synatra-warning)' }}>
              Retained from the last successful refresh {freshness.ageLabel ?? ''} — the latest poll of /api/events failed.
            </p>
          )}
          <EventStream rows={rows} compact hideMarket />
        </>
      )}
    </section>
  )
}
