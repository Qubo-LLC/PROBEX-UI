'use client'

// EventLog — the full engine event log (/api/events) with type and severity
// filters. The LIVE TAIL of the same stream is on Live Feed; both render rows
// through the shared EventStream component so engine activity looks identical
// wherever it appears. This surface owns filtering and depth; Live Feed owns
// immediacy.
//
// Type filtering is SERVER-side (the endpoint takes `type`), so selecting a
// type narrows the request rather than fetching the whole log and throwing most
// of it away. Severity has no server parameter and stays client-side.

import { useEffect, useMemo, useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { services } from '@/lib/services'
import { parseEventRows, dedupeEventRows } from '@/lib/mappers/events'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card }       from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'
import { EventStream, severityColor, EVENT_TYPES } from '@/components/shared/EventStream'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import type { EngineEvents } from '@/types/engine'

const EVENT_LIMIT = 200

export function EventLog({ embedded = false }: EmbeddableProps = {}) {
  const slice = useApplicationStore((s) => s.engine.events)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string | null>(null)

  // Type filtering happens SERVER-side (the endpoint supports `type`), so a
  // filtered view fetches its own narrowed result rather than pulling the full
  // log and discarding most of it. With no filter we read the already-polled
  // store slice instead — no reason to duplicate a request that's already
  // happening every few seconds.
  const [filtered, setFiltered]       = useState<EngineEvents | null>(null)
  const [filterLoading, setLoading]   = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)

  useEffect(() => {
    if (typeFilter === null) { setFiltered(null); setFilterError(null); return }
    let active = true
    setLoading(true)
    setFilterError(null)
    services.engine
      .getEvents(EVENT_LIMIT, [typeFilter])
      .then((r) => { if (active) setFiltered(r.data) })
      .catch((e: unknown) => { if (active) setFilterError(e instanceof Error ? e.message : 'Request failed') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [typeFilter])

  const source = typeFilter === null ? slice.data : filtered

  const parsed = useMemo(
    () => (source ? parseEventRows(source) : null),
    [source],
  )

  // Severity has no server-side parameter on this endpoint, so it stays a
  // client-side narrowing of whatever the (possibly type-filtered) result holds.
  const presentSeverities = useMemo(() => {
    if (parsed?.kind !== 'rows') return []
    return [...new Set(parsed.rows.map((r) => r.severity).filter((s): s is string => !!s))].sort()
  }, [parsed])

  const visibleRows = useMemo(() => {
    if (parsed?.kind !== 'rows') return []
    let rows = parsed.rows
    if (severityFilter) rows = rows.filter((r) => r.severity === severityFilter)
    const sorted = [...rows].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    return dedupeEventRows(sorted)
  }, [parsed, severityFilter])

  /** True when a server-side type filter came back genuinely empty. */
  const emptyForType = typeFilter !== null && !filterLoading && filterError === null && visibleRows.length === 0

  return (
    <div className={pageShell(embedded, 'gap-4')}>
      {!embedded && (
        <PageHeader
          title="Events"
          subtitle="Engine event log — edges, trades, resolutions, and system activity, with the reasoning behind each"
          actions={
            <span className="flex items-center gap-3">
              {slice.data && slice.data.count > 0 && (
                <span className="text-xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                  {slice.data.count} event{slice.data.count === 1 ? '' : 's'} · limit {slice.data.limit}
                </span>
              )}
              <ProvenanceBadge provenance="live" detail="/api/events" />
            </span>
          }
        />
      )}

      {/* Filters render unconditionally. They used to sit inside the `rows`
          branch, which meant a filter returning nothing removed the controls —
          leaving no way back to "All" without a page reload. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter events by type">
          <span className="text-2xs uppercase tracking-wider font-semibold mr-1" style={{ color: 'var(--probex-text-disabled)' }}>Type</span>
          <FilterChip label="All" active={typeFilter === null} onClick={() => setTypeFilter(null)} />
          {EVENT_TYPES.map((t) => (
            <FilterChip key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
          ))}
        </div>
        {presentSeverities.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter events by severity">
            <span className="text-2xs uppercase tracking-wider font-semibold mr-1" style={{ color: 'var(--probex-text-disabled)' }}>Severity</span>
            <FilterChip label="All" active={severityFilter === null} onClick={() => setSeverityFilter(null)} />
            {presentSeverities.map((s) => (
              <FilterChip key={s} label={s} active={severityFilter === s} onClick={() => setSeverityFilter(s)} dotColor={severityColor(s)} />
            ))}
          </div>
        )}
        {typeFilter !== null && (
          <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
            Filtered server-side via <span className="mono">/api/events?type={typeFilter}</span>
          </p>
        )}
      </div>

      {filterLoading && (
        <p className="text-xs py-2" style={{ color: 'var(--probex-text-disabled)' }}>Loading {typeFilter} events…</p>
      )}

      {filterError !== null && (
        <ErrorState title="Filtered event query failed" description={filterError} fullPage={false} />
      )}

      {typeFilter === null && slice.status === 'error' && (
        <ErrorState
          title="Event log unavailable"
          description={slice.error?.message ?? 'The /api/events endpoint did not respond.'}
          fullPage={false}
        />
      )}

      {/* A type that the engine never emits is a real finding, not a UI dead
          end — say so plainly rather than showing a generic empty state. */}
      {emptyForType && (
        <Card>
          <p className="text-xs" style={{ color: 'var(--probex-text-secondary)' }}>
            The engine has not emitted any <strong>{typeFilter}</strong> events. This type is
            documented by the API, but the engine only produces a subset of the documented types —
            which types are live changes as the engine evolves, so try another filter to see what
            it is currently recording.
          </p>
        </Card>
      )}

      {typeFilter === null && parsed?.kind === 'empty' && (
        <EmptyState
          title="No events recorded this session"
          description="The engine logs edge detections, trades, and resolutions here as they happen. The log resets when the engine restarts."
        />
      )}

      {parsed?.kind === 'unrecognized' && (
        <Card>
          <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
            The engine reports {parsed.count} event{parsed.count === 1 ? '' : 's'}, but the
            item format doesn’t match the agreed schema yet — entries are not displayed
            to avoid showing wrong values.
          </p>
        </Card>
      )}

      {visibleRows.length > 0 && <EventStream rows={visibleRows} />}
    </div>
  )
}


// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick, dotColor }: { label: string; active: boolean; onClick: () => void; dotColor?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="focus-ring text-2xs font-semibold rounded px-2 py-1 cursor-pointer transition-colors duration-100 inline-flex items-center gap-1"
      style={{
        color:      active ? 'var(--probex-primary)' : 'var(--probex-text-muted)',
        background: 'var(--probex-surface-2)',
        border:     `1px solid ${active ? 'var(--probex-primary)' : 'var(--probex-border)'}`,
      }}
    >
      {dotColor && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} aria-hidden="true" />}
      {label}
    </button>
  )
}
