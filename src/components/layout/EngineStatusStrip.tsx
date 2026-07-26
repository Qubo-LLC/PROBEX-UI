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
import { survivalStateLabel } from '@/lib/display/engine'
import { LiveHeartbeat } from '@/components/shared/LiveHeartbeat'
import { StatusChip, toneForStatus } from '@/components/ui/StatusChip'

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

      {/* BTC price is the header's primary figure — the one number an operator
          glances up for. Given metric weight so it outranks the chips beside
          it, which previously all competed at similar visual volume. */}
      {currentPrice !== null && (
        <span className="flex items-baseline gap-1.5">
          <span className="t-label">BTC</span>
          <span className="t-metric-sm">{formatBtcPrice(currentPrice)}</span>
        </span>
      )}

      {state && (
        <StatusChip
          tone={toneForStatus(state)}
          live={state === 'CRITICAL' || state === 'DANGER'}
          className="hidden sm:inline-flex"
          title={`Survival state: ${survivalStateLabel(state)}`}
        >
          {state}
        </StatusChip>
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

      {/* Mode stays safety-weighted: LIVE is loud (real capital at risk),
          PAPER is informational. Same chip shape either way — only the tone
          differs, so the distinction is colour rather than a change of form. */}
      {mode && (
        <StatusChip
          tone={mode === 'live' ? 'danger' : 'info'}
          live={mode === 'live'}
          title={mode === 'live' ? 'LIVE mode — real capital at risk' : 'Paper trading mode'}
        >
          {mode}
        </StatusChip>
      )}

      <LiveHeartbeat />
    </div>
  )
}
