'use client'

// EventLog — the engine event log (/api/events). Each row surfaces the full
// payload: severity accent, title + message, and metadata chips (direction,
// edge_pct, rejection reason). Type/severity filters render only from values
// present in the data; duplicate bursts collapse via dedupeEventRows (×N).

import { useMemo, useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEventRows, dedupeEventRows, type DedupedEventRow } from '@/lib/mappers/events'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card }       from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

// Severity → accent colour. Anything unrecognised falls back to muted.
const SEVERITY_COLOR: Record<string, string> = {
  info:     'var(--probex-primary)',
  warning:  'var(--probex-warning)',
  error:    'var(--probex-negative)',
  critical: 'var(--probex-negative)',
  success:  'var(--probex-positive)',
}
const severityColor = (s: string | null): string =>
  (s && SEVERITY_COLOR[s.toLowerCase()]) || 'var(--probex-text-muted)'

export function EventLog() {
  const slice = useApplicationStore((s) => s.engine.events)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string | null>(null)

  const parsed = useMemo(
    () => (slice.data ? parseEventRows(slice.data) : null),
    [slice.data],
  )

  const presentTypes = useMemo(() => {
    if (parsed?.kind !== 'rows') return []
    return [...new Set(parsed.rows.map((r) => r.type))].sort()
  }, [parsed])

  const presentSeverities = useMemo(() => {
    if (parsed?.kind !== 'rows') return []
    return [...new Set(parsed.rows.map((r) => r.severity).filter((s): s is string => !!s))].sort()
  }, [parsed])

  const visibleRows = useMemo(() => {
    if (parsed?.kind !== 'rows') return []
    let rows = parsed.rows
    if (typeFilter)     rows = rows.filter((r) => r.type === typeFilter)
    if (severityFilter) rows = rows.filter((r) => r.severity === severityFilter)
    const sorted = [...rows].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    return dedupeEventRows(sorted)
  }, [parsed, typeFilter, severityFilter])

  return (
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader
        title="Events"
        subtitle="Engine event log — edges, trades, resolutions, and system activity, with the reasoning behind each"
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

      {parsed?.kind === 'rows' && (
        <>
          {/* Filters — type + severity, only for values actually present */}
          {(presentTypes.length > 1 || presentSeverities.length > 1) && (
            <div className="flex flex-col gap-2">
              {presentTypes.length > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter events by type">
                  <span className="text-2xs uppercase tracking-wider font-semibold mr-1" style={{ color: 'var(--probex-text-disabled)' }}>Type</span>
                  <FilterChip label="All" active={typeFilter === null} onClick={() => setTypeFilter(null)} />
                  {presentTypes.map((t) => (
                    <FilterChip key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
                  ))}
                </div>
              )}
              {presentSeverities.length > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter events by severity">
                  <span className="text-2xs uppercase tracking-wider font-semibold mr-1" style={{ color: 'var(--probex-text-disabled)' }}>Severity</span>
                  <FilterChip label="All" active={severityFilter === null} onClick={() => setSeverityFilter(null)} />
                  {presentSeverities.map((s) => (
                    <FilterChip key={s} label={s} active={severityFilter === s} onClick={() => setSeverityFilter(s)} dotColor={severityColor(s)} />
                  ))}
                </div>
              )}
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

/** Human-readable chips from an event's metadata; fields are optional and
 *  skipped when absent (never fabricated). */
function metaChips(row: DedupedEventRow): Array<{ label: string; tone?: 'yes' | 'no' | 'muted' }> {
  const m = row.metadata
  if (!m) return []
  const chips: Array<{ label: string; tone?: 'yes' | 'no' | 'muted' }> = []

  const dir = (m.direction ?? m.top_edge_direction)
  if (typeof dir === 'string') chips.push({ label: dir.toUpperCase(), tone: dir.toLowerCase() === 'yes' ? 'yes' : 'no' })

  const edge = (m.edge_pct ?? m.top_edge_pct)
  if (typeof edge === 'number') chips.push({ label: `${edge.toFixed(1)}% edge` })

  if (typeof m.edges_detected === 'number') chips.push({ label: `${m.edges_detected} edge${m.edges_detected === 1 ? '' : 's'}`, tone: 'muted' })
  if (typeof m.reason === 'string') chips.push({ label: m.reason, tone: 'muted' })

  return chips
}

function EventRowItem({ row }: { row: DedupedEventRow }) {
  const accent = severityColor(row.severity)
  const chips  = metaChips(row)
  const headline = row.title ?? row.type

  return (
    <div
      className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-xs"
      style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)', borderLeft: `2.5px solid ${accent}` }}
    >
      {/* Type badge + severity dot */}
      <span className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} aria-hidden="true" title={row.severity ?? undefined} />
        <span
          className="text-2xs font-semibold rounded px-1.5 py-0.5 uppercase tracking-wide"
          style={{ color: 'var(--probex-text-secondary)', background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}
        >
          {row.type}
        </span>
      </span>

      {/* Headline (title) + detail (message) + metadata chips */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate" style={{ color: 'var(--probex-text-primary)' }}>{headline}</span>
          {row.repeatCount > 1 && (
            <span
              className="text-2xs font-bold rounded px-1.5 py-0.5 flex-shrink-0 tabular-nums"
              style={{ color: 'var(--probex-warning)', background: 'var(--probex-warning-dim)' }}
              title={`Repeated ${row.repeatCount} times — collapsed to reduce noise`}
            >
              ×{row.repeatCount}
            </span>
          )}
        </div>

        {row.description && row.description !== headline && (
          <span className="truncate" style={{ color: 'var(--probex-text-muted)' }} title={row.description}>{row.description}</span>
        )}

        {chips.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {chips.map((c, i) => (
              <span
                key={i}
                className="text-2xs font-medium rounded px-1.5 py-0.5"
                style={
                  c.tone === 'yes'   ? { color: 'var(--probex-yes)', background: 'var(--probex-yes-dim)' }
                  : c.tone === 'no'  ? { color: 'var(--probex-no)',  background: 'var(--probex-no-dim)' }
                  : c.tone === 'muted' ? { color: 'var(--probex-text-muted)', background: 'var(--probex-surface-2)' }
                  : { color: 'var(--probex-text-secondary)', background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }
                }
              >
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Timestamp */}
      {row.timestamp !== null && (
        <span className="tabular-nums flex-shrink-0 mt-0.5 text-2xs" style={{ color: 'var(--probex-text-disabled)' }} title={row.firstTimestamp !== null && row.repeatCount > 1 ? `First seen ${new Date(row.firstTimestamp).toLocaleTimeString()}` : undefined}>
          {new Date(row.timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
