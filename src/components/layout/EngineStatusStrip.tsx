'use client'

// EngineStatusStrip — persistent engine vitals in the top navigation
// (PROBEX_PRODUCT_SPEC.md §3): BTC price · survival state chip · feed status ·
// mode badge. Everything reads from ApplicationStore (zero extra HTTP).
//
// Truthfulness: each segment renders only when its endpoint has data. The
// mode badge is safety-critical — PAPER is neutral, LIVE is loud, and its
// absence means the engine identity is unknown (not assumed).

import { useApplicationStore } from '@/store/applicationStore'
import { formatBtcPrice } from '@/lib/mappers/priceHistory'
import { survivalStateColor, survivalStateLabel } from '@/lib/display/engine'

export function EngineStatusStrip() {
  const stats    = useApplicationStore((s) => s.engine.stats)
  const survival = useApplicationStore((s) => s.engine.survival)
  const identity = useApplicationStore((s) => s.engine.identity)
  const price    = useApplicationStore((s) => s.engine.priceHistory)

  // Price: prefer /api/stats; fall back to /api/price-history (stats has a
  // history of failing while price-history keeps working).
  const currentPrice =
    stats.data?.currentPrice ?? price.data?.current ?? null

  const feed = stats.data
    ? { connected: stats.data.feedConnected, latencyMs: stats.data.feedLatencyMs }
    : null

  const state = survival.data?.state ?? null
  const mode  = identity.data?.mode ?? null

  const engineDown = stats.status === 'error' && survival.status === 'error' && identity.status === 'error'

  return (
    <div className="flex items-center gap-3 sm:gap-4" role="status" aria-label="Engine status">

      {engineDown && (
        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--probex-negative)' }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--probex-negative)' }} aria-hidden="true" />
          Engine offline
        </span>
      )}

      {currentPrice !== null && (
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>
          <span className="text-2xs font-semibold uppercase tracking-wider mr-1.5" style={{ color: 'var(--probex-text-muted)' }}>
            BTC
          </span>
          {formatBtcPrice(currentPrice)}
        </span>
      )}

      {state && (
        <span
          className="text-2xs font-bold uppercase tracking-wider rounded px-1.5 py-0.5 hidden sm:inline"
          style={{
            color:      survivalStateColor(state),
            background: 'var(--probex-surface-2)',
            border:     '1px solid var(--probex-border)',
          }}
          title={`Survival state: ${survivalStateLabel(state)}`}
        >
          {state}
        </span>
      )}

      {feed && (
        <span
          className="flex items-center gap-1.5 text-2xs tabular-nums hidden md:flex"
          style={{ color: 'var(--probex-text-muted)' }}
          title={feed.connected ? `Price feed connected · ${Math.round(feed.latencyMs)}ms` : 'Price feed disconnected'}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: feed.connected ? 'var(--probex-positive)' : 'var(--probex-negative)' }}
            aria-hidden="true"
          />
          {feed.connected ? `${Math.round(feed.latencyMs)}ms` : 'Feed down'}
        </span>
      )}

      {mode && (
        <span
          className="text-2xs font-bold uppercase tracking-wider rounded px-1.5 py-0.5"
          style={
            mode === 'live'
              ? { background: 'var(--probex-negative-dim)', color: 'var(--probex-negative)', border: '1px solid var(--probex-negative-border)' }
              : { background: 'var(--probex-surface-2)', color: 'var(--probex-text-secondary)', border: '1px solid var(--probex-border)' }
          }
          title={mode === 'live' ? 'LIVE mode — real capital at risk' : 'Paper trading mode'}
        >
          {mode}
        </span>
      )}
    </div>
  )
}
