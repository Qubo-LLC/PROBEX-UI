'use client'

// IncidentsSection — the other tier the System page never had.
//
// ─── Why this belongs here ───────────────────────────────────────────────────
// "What has recently gone wrong" is the most operationally useful thing on a
// health page, and it was one click away behind a tab (SystemDomain's "Event
// Log"). The events endpoint is already polled at 5s for the whole app, every
// row already carries a `severity`, and the row treatment already exists and is
// already shared between two surfaces. So this section costs one filter and no
// new requests.
//
// ─── Why it reuses EventRowItem rather than inventing a row ──────────────────
// The severity rail, the category glyph, the title/context split and the
// record disclosure were built for Live Feed and adopted by Event Log. A third
// bespoke incident row would mean the same engine event rendered three ways
// depending on which page you were on — which is the exact conflation the
// provenance work removed from the rest of the product. One grammar.
//
// ─── What "incident" means here, precisely ───────────────────────────────────
// A row whose severity the engine itself marked warning-or-worse. The engine
// publishes no incident lifecycle — no acknowledged, no resolved, no current
// versus recovered — so none is implied. This is "recent events the engine
// flagged", stated as exactly that, and the full log stays one click away.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEventRows, collapseConsecutiveRepeats } from '@/lib/mappers/events'
import { isAlerting } from '@/lib/display/eventDisplay'
import { useMarketLookup } from '@/config/hooks/useMarketLookup'
import { EventRowItem } from '@/components/shared/EventStream'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'
import { ROUTES } from '@/config/constants'
import Link from 'next/link'

// "Something is wrong" = a severity the engine itself marked warning or worse
// (isAlerting, shared with the row so the rail and this filter agree).
// Anything else — info, debug, an unrecognised value — is activity, not an
// incident, and belongs in the full log rather than here.

/** Enough to see a pattern, few enough that the section stays subordinate to
 *  the health evidence above it. */
const SHOWN = 6

export function IncidentsSection() {
  const slice = useApplicationStore((s) => s.engine.events)
  const lookup = useMarketLookup()

  const { rows, unrecognized } = useMemo(() => {
    if (!slice.data) return { rows: null, unrecognized: 0 }
    const parsed = parseEventRows(slice.data)
    if (parsed.kind !== 'rows') {
      return { rows: null, unrecognized: parsed.kind === 'unrecognized' ? parsed.count : 0 }
    }
    // Rows arrive newest-first from the mapper; only consecutive repeats fold.
    const alerting = parsed.rows.filter((r) => isAlerting(r.severity))
    return { rows: collapseConsecutiveRepeats(alerting).slice(0, SHOWN), unrecognized: 0 }
  }, [slice.data])

  return (
    <section aria-label="Recent incidents" className="flex flex-col gap-4">
      {/* ─── Why this cannot be read against the health counters above ───────
          Measured on the live engine: Service health reported "3,263 of 3,270
          checks raised a warning — 100% of them", and this section, 100px
          below, reported no warnings at all. Both were true and the two
          statements are about different things, but adjacent and unqualified
          they read as the product contradicting itself.

          They come from two independent subsystems that the engine does not
          reconcile, so the UI must not imply that it does. The DISTINCTION is
          stated inline, in the heading's qualifier: this is the engine's event
          log. The EXPLANATION of how that differs from the monitor ran to three
          lines at the technical register beneath the heading — longer than the
          section's usual content, too faint to read comfortably, and in the
          way on every visit. It is now a Level-2 disclosure: one click, in
          the explanatory register, exactly where the question arises. */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2 className="t-section-title">Recent incidents</h2>
          <span className="t-description">the engine&rsquo;s event log</span>
          <Popover
            label="About recent incidents"
            trigger={(p) => <InfoButton what="recent incidents" {...p} />}
          >
            <PopoverTitle>Event log, not the health monitor</PopoverTitle>
            <PopoverText>
              These are events the engine chose to record with severity warning or
              worse. The health monitor&rsquo;s counters above tally every failed probe
              cycle — a different subsystem the engine does not reconcile with this one.
            </PopoverText>
            <PopoverText>
              A busy monitor with an empty incident list is a normal combination, not a
              contradiction. The engine publishes no incident lifecycle, so nothing here
              is marked resolved or current.
            </PopoverText>
          </Popover>
        </div>
        <span className="flex items-baseline gap-3">
          <span className="t-metadata">/api/events · severity ≥ warning</span>
          <Link href={ROUTES.EVENTS} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>
            Full log →
          </Link>
        </span>
      </div>

      {slice.status === 'error' ? (
        <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>
          The events endpoint is not answering, so whether anything has gone wrong
          recently is unknown — this states nothing rather than showing an empty
          list that would read as “all clear”.
        </p>
      ) : unrecognized > 0 ? (
        <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>
          The engine returned {unrecognized} event{unrecognized === 1 ? '' : 's'} whose shape
          doesn’t match the agreed schema — they are withheld rather than shown with
          guessed fields.
        </p>
      ) : rows === null ? (
        <p className="text-xs" style={{ color: 'var(--synatra-text-disabled)' }}>
          Waiting for the event log.
        </p>
      ) : rows.length === 0 ? (
        // A genuine all-clear, and it is only claimable because the endpoint
        // actually answered. This is the distinction the error branch above
        // exists to protect.
        <p className="text-xs" style={{ color: 'var(--synatra-text-muted)' }}>
          No warnings or errors in the engine’s recent event history.
        </p>
      ) : (
        <div className="flex flex-col" style={{ borderBottom: '1px solid var(--synatra-border)' }}>
          {rows.map((row) => (
            <EventRowItem key={row.id} row={row} compact lookup={lookup} />
          ))}
        </div>
      )}
    </section>
  )
}
