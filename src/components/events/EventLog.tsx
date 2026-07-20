'use client'

// EventLog — the engine event log (/events).
//
// Renders /api/events truthfully at every level:
//   • empty envelope   → designed empty state (log resets on engine restart)
//   • recognized items → typed rows, newest first, client-side type filter
//   • unrecognized     → count + notice, never guessed fields
//
// The type filter renders only from types actually present in the data —
// no invented taxonomy.

import { useMemo, useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEventRows, type EventRow } from '@/lib/mappers/events'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card }       from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

export function EventLog() {
  const slice = useApplicationStore((s) => s.engine.events)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const parsed = useMemo(
    () => (slice.data ? parseEventRows(slice.data) : null),
    [slice.data],
  )

  const presentTypes = useMemo(() => {
    if (parsed?.kind !== 'rows') return []
    return [...new Set(parsed.rows.map((r) => r.type))].sort()
  }, [parsed])

  const visibleRows = useMemo(() => {
    if (parsed?.kind !== 'rows') return []
    const rows = typeFilter ? parsed.rows.filter((r) => r.type === typeFilter) : parsed.rows
    // Newest first when timestamps exist; stable order otherwise.
    return [...rows].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
  }, [parsed, typeFilter])

  return (
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader
        title="Events"
        subtitle="Engine event log — trades, edges, resolutions, and system activity"
        actions={
          slice.data && slice.data.count > 0 ? (
            <span className="text-xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
              {slice.data.count} event{slice.data.count === 1 ? '' : 's'} · limit {slice.data.limit}
            </span>
          ) : undefined
        }
      />

      {slice.status === 'error' && (
        <ErrorState
          title="Event log unavailable"
          description={slice.error?.message ?? 'The /api/events endpoint did not respond.'}
          fullPage={false}
        />
      )}

      {parsed?.kind === 'empty' && (
        <EmptyState
          title="No events recorded this session"
          description="The engine logs trades, edge detections, and resolutions here as they happen. The log resets when the engine restarts."
        />
      )}

      {parsed?.kind === 'unrecognized' && (
        <Card>
          <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
            The engine reports {parsed.count} event{parsed.count === 1 ? '' : 's'}, but the
            item format doesn’t match the agreed schema yet — entries are not displayed
            to avoid showing wrong values. (Backend contract P0-01.)
          </p>
        </Card>
      )}

      {parsed?.kind === 'rows' && (
        <>
          {/* Type filter — only types that actually occur */}
          {presentTypes.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter events by type">
              <FilterChip label="All" active={typeFilter === null} onClick={() => setTypeFilter(null)} />
              {presentTypes.map((t) => (
                <FilterChip key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {visibleRows.map((row) => <EventRowItem key={row.id} row={row} />)}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="focus-ring text-2xs font-semibold rounded px-2 py-1 cursor-pointer transition-colors duration-100"
      style={{
        color:      active ? 'var(--probex-primary)' : 'var(--probex-text-muted)',
        background: 'var(--probex-surface-2)',
        border:     `1px solid ${active ? 'var(--probex-primary)' : 'var(--probex-border)'}`,
      }}
    >
      {label}
    </button>
  )
}

function EventRowItem({ row }: { row: EventRow }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs"
      style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}
    >
      <span
        className="text-2xs font-semibold rounded px-1.5 py-0.5 flex-shrink-0"
        style={{ color: 'var(--probex-primary)', background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}
      >
        {row.type}
      </span>
      <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--probex-text-secondary)' }} title={row.description}>
        {row.description}
        {row.marketTitle && (
          <span style={{ color: 'var(--probex-text-muted)' }}> — {row.marketTitle}</span>
        )}
      </span>
      {row.amount !== null && (
        <span className="tabular-nums font-semibold flex-shrink-0" style={{ color: 'var(--probex-text-primary)' }}>
          {formatCurrency(row.amount)}
        </span>
      )}
      {row.probability !== null && (
        <span className="tabular-nums flex-shrink-0" style={{ color: 'var(--probex-text-muted)' }}>
          {formatPercent(row.probability)}
        </span>
      )}
      {row.timestamp !== null && (
        <span className="tabular-nums flex-shrink-0" style={{ color: 'var(--probex-text-disabled)' }}>
          {new Date(row.timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
