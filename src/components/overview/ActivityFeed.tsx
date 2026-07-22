'use client'

// ActivityFeed — the Overview's Live Activity rail, live from /api/events via
// parseEventRows. The event `type` vocabulary (new-position-*, market-resolved,
// consensus-shift, probability-spike, large-position, edge-detected) is the
// documented EngineEventItemDTO CONTRACT — not fabricated — so the icon/colour
// routing is honest; any type outside it still renders via DEFAULT_CONFIG.
//
// Craft (Product Experience Restoration · Phase E): tokenised colours, mono
// timestamps, canonical 8px surface, and a felt-recency cue — newly-arrived
// rows animate in (Design Language "recency" motion), so the feed feels awake
// the moment the engine acts. Reduced-motion neutralises the animation.

import { useMemo, useRef, useEffect } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEventRows, type EventRow } from '@/lib/mappers/events'
import { formatCompact } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

interface EventConfig {
  icon:      string
  color:     string
  important: boolean
}

// Documented EngineEventItemDTO type vocabulary (the frozen contract). Anything
// outside this map renders with DEFAULT_CONFIG — never hidden, never guessed at.
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

function ActivityRow({ item, isNew }: { item: EventRow; isNew: boolean }) {
  const cfg = EVENT_CONFIG[item.type] ?? DEFAULT_CONFIG
  const age = item.timestamp !== null ? formatAge(item.timestamp) : null

  return (
    <div
      className={`flex items-start gap-2.5 px-3.5 py-2${isNew ? ' animate-fade-in-up' : ''}`}
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
          {age && <span className="text-[9px] font-mono tabular-nums flex-shrink-0" style={{ color: 'var(--probex-text-muted)' }}>{age}</span>}
        </div>
        <p className="text-[10px] leading-snug m-0" style={{ color: 'var(--probex-text-muted)' }}>
          {item.description}
          {item.amount !== null && (
            <span className="font-semibold font-mono ml-1" style={{ color: cfg.color }}>${formatCompact(item.amount)}</span>
          )}
          {item.probability !== null && (
            <span className="font-bold font-mono ml-1" style={{ color: cfg.color }}>→ {Math.round(item.probability * 100)}%</span>
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
        <span className="text-2xs font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>{count} events</span>
      </div>
      {(whales > 0 || shifts > 0) && (
        <div className="flex gap-1.5">
          {whales > 0 && (
            <span className="text-[9px] font-bold rounded-full px-1.5 py-0.5" style={{ color: 'var(--probex-warning)', background: 'var(--probex-warning-dim)', border: '1px solid var(--probex-warning-border)' }}>
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

  // Recency: rows whose id wasn't present on the previous render animate in.
  // The ref is updated after render, so the next poll only animates genuinely
  // new events (Design Language "motion = information", never decorative).
  const seenRef = useRef<Set<string>>(new Set())
  const newIds = useMemo(() => {
    const s = new Set<string>()
    for (const r of sorted) if (!seenRef.current.has(r.id)) s.add(r.id)
    return s
  }, [sorted])
  useEffect(() => {
    for (const r of sorted) seenRef.current.add(r.id)
  }, [sorted])

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
      className={`flex flex-col overflow-hidden rounded-md ${className}`}
      style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}
    >
      <FeedHeader count={sorted.length} rows={sorted} />
      <div className="overflow-y-auto flex-1">
        {parsed?.kind === 'empty' && (
          <EmptyState
            size="sm"
            title="Standing by for engine activity"
            description="Edge detections, trades, and resolutions stream in here the moment the engine acts."
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
        {sorted.map((item) => <ActivityRow key={item.id} item={item} isNew={newIds.has(item.id)} />)}
      </div>
    </div>
  )
}
