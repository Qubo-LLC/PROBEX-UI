'use client'

// EngineStatusStrip — persistent engine vitals in the top navigation
// (PROBEX_PRODUCT_SPEC.md §3): BTC price · survival state · feed latency ·
// system status. Everything reads from ApplicationStore (zero extra HTTP).
//
// Truthfulness: each segment renders only when its endpoint has data.
//
// ─── Consolidation note ──────────────────────────────────────────────────────
// This strip previously carried its own `engineDown` line AND a PAPER/LIVE mode
// chip, while a separate full-width banner above the chrome announced mock or
// offline. Three components answering "what state is the system in", none of
// them aware of the others — so mock mode showed a warning banner, a green
// HEALTHY chip and a neutral PAPER badge simultaneously.
//
// All three collapse into SystemStatusIndicator, which derives one answer from
// one model (lib/display/systemStatus). The mode badge is not lost: 'Live
// trading' and 'Paper trading' are two of that model's states, so LIVE is still
// unmissable — it now reads as a sentence rather than as a four-letter chip
// competing with three neighbours for the same meaning.
//
// What stays here is what the indicator is not: the market figure, the capital
// state, and the feed's physical latency.

import { useApplicationStore } from '@/store/applicationStore'
import { formatBtcPrice } from '@/lib/mappers/priceHistory'
import { survivalStateLabel, survivalStateIsAlarm } from '@/lib/display/engine'
import { LiveHeartbeat } from '@/components/shared/LiveHeartbeat'
import { StatusChip, toneForStatus } from '@/components/ui/StatusChip'
import { SystemStatusIndicator } from '@/components/system/SystemStatusIndicator'

export function EngineStatusStrip() {
  const stats    = useApplicationStore((s) => s.engine.stats)
  const survival = useApplicationStore((s) => s.engine.survival)
  const price    = useApplicationStore((s) => s.engine.priceHistory)

  // Price: prefer /api/stats; fall back to /api/price-history (stats has a
  // history of failing while price-history keeps working).
  const currentPrice =
    stats.data?.currentPrice ?? price.data?.current ?? null

  const feed = stats.data
    ? { connected: stats.data.feedConnected, latencyMs: stats.data.feedLatencyMs }
    : null

  const state = survival.data?.state ?? null

  return (
    <div className="flex items-center gap-3 sm:gap-4" role="status" aria-label="Engine status">

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
          live={survivalStateIsAlarm(state)}
          className="hidden lg:inline-flex"
          title={`Survival state: ${survivalStateLabel(state)}`}
        >
          {survivalStateLabel(state)}
        </StatusChip>
      )}

      {feed && (
        <span
          className="items-center gap-1.5 text-2xs tabular-nums hidden xl:flex"
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

      {/* The single authority on system state — mode, health, reachability and
          data provenance in one control, with the diagnostics behind it. */}
      <SystemStatusIndicator />

      <LiveHeartbeat />
    </div>
  )
}
