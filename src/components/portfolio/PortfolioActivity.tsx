'use client'

// PortfolioActivity — restored from V1 (git 0e3833a4), live from /api/events.
// Filtered to the event types that actually describe portfolio-affecting
// action (position opens, resolutions) rather than the full engine-wide feed
// Overview's ActivityFeed shows — same underlying envelope, a narrower lens,
// following the same technique as Market Detail's MarketActivityFeed.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEventRows, type EventRow } from '@/lib/mappers/events'
import { formatCurrency } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

const PORTFOLIO_EVENT_TYPES = new Set(['new-position-yes', 'new-position-no', 'market-resolved'])

const EVENT_META: Record<string, { icon: string; color: string; label: string }> = {
  'new-position-yes': { icon: '+', color: 'var(--probex-yes)', label: 'Position Opened' },
  'new-position-no':  { icon: '+', color: 'var(--probex-no)', label: 'Position Opened' },
  'market-resolved':  { icon: '✓', color: 'var(--probex-positive)', label: 'Market Resolved' },
}

function formatAge(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function PortfolioActivity() {
  const eventsSlice = useApplicationStore((s) => s.engine.events)

  const rows: EventRow[] | null = useMemo(() => {
    if (!eventsSlice.data) return null
    const parsed = parseEventRows(eventsSlice.data)
    if (parsed.kind !== 'rows') return []
    return parsed.rows.filter((r) => PORTFOLIO_EVENT_TYPES.has(r.type)).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
  }, [eventsSlice.data])

  return (
    <div className="flex flex-col rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div className="flex items-center gap-2">
          <span className="live-dot" aria-hidden="true" />
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Portfolio Activity</h2>
        </div>
        {rows && <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{rows.length} events</span>}
      </div>

      {eventsSlice.status === 'error' && (
        <ErrorState title="Activity unavailable" description={eventsSlice.error?.message ?? 'The /api/events endpoint did not respond.'} fullPage={false} />
      )}

      {rows !== null && rows.length === 0 && (
        <EmptyState size="sm" title="No portfolio activity yet" description="Position opens and market resolutions appear here as they happen." />
      )}

      {rows !== null && rows.length > 0 && (
        <div className="overflow-y-auto max-h-[420px]">
          {rows.map((r, i) => {
            const meta = EVENT_META[r.type] ?? { icon: '·', color: 'var(--probex-text-muted)', label: r.type }
            return (
              <div
                key={r.id}
                className="flex items-start gap-3 px-4 py-3"
                style={i < rows.length - 1 ? { borderBottom: '1px solid var(--probex-border)' } : undefined}
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5" style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color, border: `1px solid color-mix(in srgb, ${meta.color} 22%, transparent)` }} aria-hidden="true">
                  {meta.icon}
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-semibold px-1.5 py-0.5 rounded whitespace-nowrap" style={{ background: `color-mix(in srgb, ${meta.color} 12%, transparent)`, color: meta.color }}>{meta.label}</span>
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--probex-text-primary)' }}>{r.marketTitle ?? r.id}</span>
                  </div>
                  <p className="text-xs leading-snug" style={{ color: 'var(--probex-text-secondary)' }}>{r.description}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  {r.amount !== null && (
                    <span className="text-xs font-bold tabular-nums" style={{ color: r.amount >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)' }}>
                      {r.amount >= 0 ? '+' : ''}{formatCurrency(r.amount)}
                    </span>
                  )}
                  {r.timestamp !== null && <span className="text-2xs tabular-nums" style={{ color: 'var(--probex-text-disabled)' }}>{formatAge(r.timestamp)}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
