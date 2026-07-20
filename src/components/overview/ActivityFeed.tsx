'use client'

// ActivityFeed — restored from V1 (git 0e3833a4), live from /api/events via
// parseEventRows. Event `type` arrives as an unconfirmed backend string
// (parse-or-report), so the icon/colour/importance lookup is lenient: any
// type outside the documented EngineEventItemDTO vocabulary still renders,
// just without special styling — never hidden, never guessed at.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEventRows, type EventRow } from '@/lib/mappers/events'
import { formatCompact } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

interface EventConfig {
  icon:       string
  color:      string
  important:  boolean
}

// Documented EngineEventItemDTO type vocabulary (lib/mappers/events.ts).
// Anything outside this map renders with the DEFAULT_CONFIG fallback.
const EVENT_CONFIG: Record<string, EventConfig> = {
  'new-position-yes':  { icon: '↑', color: 'var(--probex-yes)',      important: false },
  'new-position-no':   { icon: '↓', color: 'var(--probex-no)',       important: false },
  'market-resolved':   { icon: '✓', color: 'var(--probex-positive)', important: true },
  'consensus-shift':   { icon: '◈', color: 'var(--probex-primary)',  important: true },
  'probability-spike': { icon: '⚡', color: 'var(--probex-warning)',  important: true },
  'large-position':    { icon: '●', color: 'var(--probex-positive)', important: true },
  'edge-detected':     { icon: '◆', color: 'var(--probex-primary)',  important: true },
}
const DEFAULT_CONFIG: EventConfig = { icon: '·', color: 'var(--probex-text-muted)', important: false }

function formatAge(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)    return `${s}s`
  if (s < 3600)  return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function ActivityRow({ item }: { item: EventRow }) {
  const cfg = EVENT_CONFIG[item.type] ?? DEFAULT_CONFIG
  const age = item.timestamp !== null ? formatAge(item.timestamp) : null

  return (
    <div
      className="flex items-start gap-2.5 px-3.5 py-2"
      style={{
        borderBottom: '1px solid var(--probex-border)',
        borderLeft:   cfg.important ? `2.5px solid ${cfg.color}` : '2.5px solid transparent',
        background:   cfg.important ? `color-mix(in srgb, ${cfg.color} 5%, var(--probex-surface))` : 'var(--probex-surface)',
      }}
    >
      <span
        className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-2xs font-bold mt-px"
        style={{ background: `color-mix(in srgb, ${cfg.color} 16%, transparent)`, color: cfg.color }}
        aria-hidden="true"
      >
        {cfg.icon}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span
            className="text-2xs truncate flex-1"
            style={{ fontWeight: cfg.important ? 600 : 500, color: 'var(--probex-text-primary)' }}
          >
            {item.marketTitle ?? item.type}
          </span>
          {age && <span className="text-[9px] flex-shrink-0" style={{ color: 'var(--probex-text-muted)' }}>{age}</span>}
        </div>
        <p className="text-[10px] leading-snug m-0" style={{ color: 'var(--probex-text-muted)' }}>
          {item.description}
          {item.amount !== null && (
            <span className="font-semibold ml-1" style={{ color: cfg.color }}>${formatCompact(item.amount)}</span>
          )}
          {item.probability !== null && (
            <span className="font-bold ml-1" style={{ color: cfg.color }}>→ {Math.round(item.probability * 100)}%</span>
          )}
        </p>
      </div>
    </div>
  )
}

function FeedHeader({ count, rows }: { count: number; rows: EventRow[] }) {
  const whales = rows.filter((r) => r.type === 'large-position').length
  const shifts = rows.filter((r) => r.type === 'consensus-shift').length
  return (
    <div className="px-3.5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="live-dot w-1.5 h-1.5" aria-hidden="true" />
          <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--probex-text-primary)' }}>Live Activity</h3>
        </div>
        <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{count} events</span>
      </div>
      {(whales > 0 || shifts > 0) && (
        <div className="flex gap-1.5">
          {whales > 0 && (
            <span className="text-[9px] font-bold rounded-full px-1.5 py-0.5" style={{ color: '#F97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
              {whales} large position{whales === 1 ? '' : 's'}
            </span>
          )}
          {shifts > 0 && (
            <span className="text-[9px] font-bold rounded-full px-1.5 py-0.5" style={{ color: 'var(--probex-primary)', background: 'var(--probex-primary-dim)', border: '1px solid var(--probex-yes-border)' }}>
              {shifts} shift{shifts === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface ActivityFeedProps {
  className?: string
}

export function ActivityFeed({ className = '' }: ActivityFeedProps) {
  const eventsSlice = useApplicationStore((s) => s.engine.events)

  const parsed = useMemo(
    () => (eventsSlice.data ? parseEventRows(eventsSlice.data) : null),
    [eventsSlice.data],
  )

  const sorted = useMemo(() => {
    if (parsed?.kind !== 'rows') return []
    return [...parsed.rows].sort((a, b) => {
      const ai = (EVENT_CONFIG[a.type] ?? DEFAULT_CONFIG).important ? 1 : 0
      const bi = (EVENT_CONFIG[b.type] ?? DEFAULT_CONFIG).important ? 1 : 0
      if (ai !== bi) return bi - ai
      return (b.timestamp ?? 0) - (a.timestamp ?? 0)
    })
  }, [parsed])

  if (eventsSlice.status === 'error') {
    return (
      <Card className={className}>
        <ErrorState
          title="Activity unavailable"
          description={eventsSlice.error?.message ?? 'The /api/events endpoint did not respond.'}
          fullPage={false}
        />
      </Card>
    )
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl ${className}`}
      style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}
    >
      <FeedHeader count={sorted.length} rows={sorted} />
      <div className="overflow-y-auto flex-1">
        {parsed?.kind === 'empty' && (
          <EmptyState
            size="sm"
            title="No activity yet"
            description="Trades, edge detections, and resolutions appear here as the engine acts."
          />
        )}
        {parsed?.kind === 'unrecognized' && (
          <div className="p-3.5">
            <p className="text-2xs" style={{ color: 'var(--probex-warning)' }}>
              {parsed.count} event{parsed.count === 1 ? '' : 's'} reported, but the format doesn’t match the
              agreed schema yet. (Backend contract P0-01.)
            </p>
          </div>
        )}
        {sorted.map((item) => <ActivityRow key={item.id} item={item} />)}
      </div>
    </div>
  )
}
