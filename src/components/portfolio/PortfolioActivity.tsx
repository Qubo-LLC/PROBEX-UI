'use client'

// PortfolioActivity — where the engine's record of what it did to the book
// lives, in one line.
//
// This section used to render its own trade/resolution EventStream — the
// same filter, the same rows, as Execution › Paper Trading's "Recorded
// activity" and a subset of Live Feed's stream (audit 2026-09-17: three
// surfaces, one log). Portfolio's question is what the account is worth and
// how it got there; the settlements that moved it are the ledger on Capital
// & Ledger, and the event record is canonical on the paper console and the
// full log. So this states what the log holds and points there, rather than
// rendering the stream a fourth time.

import { useMemo } from 'react'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEventRows } from '@/lib/mappers/events'
import { latestActivity } from '@/lib/display/eventDisplay'
import { formatAge } from '@/lib/display/freshness'
import { stamp } from '@/lib/display/time'
import { ROUTES } from '@/config/constants'

/** The event types that describe an action on the book. */
const BOOK_EVENT_TYPES = new Set(['trade', 'resolution'])

export function PortfolioActivity() {
  const eventsSlice = useApplicationStore((s) => s.engine.events)

  const summary = useMemo(() => {
    if (!eventsSlice.data) return null
    const parsed = parseEventRows(eventsSlice.data)
    if (parsed.kind !== 'rows') return { count: 0, latest: null }
    const rows = parsed.rows.filter((r) => BOOK_EVENT_TYPES.has(r.type.toLowerCase()))
    return { count: rows.length, latest: latestActivity(rows) }
  }, [eventsSlice.data])

  return (
    <section aria-labelledby="pf-activity" className="flex flex-col gap-2 pt-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-baseline gap-2">
          <h2 id="pf-activity" className="t-section-title">What the engine did</h2>
          <span className="t-description">the event record behind the ledger</span>
        </span>
        <span className="t-metadata">/api/events</span>
      </div>
      <p className="t-description m-0">
        {eventsSlice.status === 'error' && !eventsSlice.data
          ? 'The event log did not answer.'
          : summary === null
            ? 'Waiting for the event log.'
            : summary.count === 0
              ? 'No trade or resolution event in the engine’s retained log.'
              : <>
                  {summary.count} trade and resolution event{summary.count === 1 ? '' : 's'} in the retained log
                  {summary.latest && <>, the newest {formatAge(summary.latest.ageMs)} ({stamp(summary.latest.at)})</>}.
                </>}
        {' '}
        <Link href={`${ROUTES.EXECUTION}?view=paper`} className="focus-ring font-semibold" style={{ color: 'var(--probex-primary)' }}>Recorded activity on Paper Trading →</Link>
        {' · '}
        <Link href={`${ROUTES.SYSTEM}?view=events&type=trade`} className="focus-ring font-semibold" style={{ color: 'var(--probex-primary)' }}>Full log →</Link>
      </p>
    </section>
  )
}
