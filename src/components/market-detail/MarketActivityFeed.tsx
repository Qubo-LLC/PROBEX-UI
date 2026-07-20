'use client'

// MarketActivityFeed — restored from V1 (git 0e3833a4). V1 needed a
// dedicated per-market activity endpoint (markets.activity, still
// awaiting-backend); V3 achieves the same result truthfully today by
// filtering the confirmed, live global /api/events envelope client-side by
// marketId — the same technique already proven on the Overview page.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEventRows } from '@/lib/mappers/events'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

function formatAge(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

export function MarketActivityFeed({ marketId }: { marketId: string }) {
  const eventsSlice = useApplicationStore((s) => s.engine.events)

  const rows = useMemo(() => {
    if (!eventsSlice.data) return null
    const parsed = parseEventRows(eventsSlice.data)
    if (parsed.kind !== 'rows') return []
    return parsed.rows.filter((r) => r.marketId === marketId).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
  }, [eventsSlice.data, marketId])

  return (
    <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--probex-border)' }}>
      <h2 className="text-xs font-semibold mb-3" style={{ color: 'var(--probex-text-primary)' }}>Activity</h2>

      {eventsSlice.status === 'error' && (
        <ErrorState title="Activity unavailable" description={eventsSlice.error?.message ?? 'The /api/events endpoint did not respond.'} fullPage={false} />
      )}

      {rows !== null && rows.length === 0 && (
        <EmptyState size="sm" title="No activity for this market yet" description="Trades, edge detections, and resolutions for this market appear here as they happen." />
      )}

      {rows !== null && rows.length > 0 && (
        <ul className="flex flex-col gap-0 list-none p-0 m-0">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-2.5 py-2" style={{ borderBottom: '1px solid var(--probex-border)' }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--probex-primary)' }} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: 'var(--probex-text-secondary)' }}>{r.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {r.timestamp !== null && <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{formatAge(r.timestamp)}</span>}
                  {r.amount !== null && <span className="text-2xs font-semibold" style={{ color: 'var(--probex-text-primary)' }}>{formatCurrency(r.amount)}</span>}
                  {r.probability !== null && <span className="text-2xs font-semibold" style={{ color: 'var(--probex-primary)' }}>→ {formatPercent(r.probability)}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
