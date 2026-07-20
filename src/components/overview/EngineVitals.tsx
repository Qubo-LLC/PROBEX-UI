'use client'

// EngineVitals — Phase 6A. Replaces the monolithic EnginePulseCard sidebar
// widget with three focal sections read in sequence down the Overview page
// itself: Live BTC (hero) → Engine Health → Capital & Performance. Same
// hooks, same live data (useCommandCenter/useEnginePriceChart) — reorganized
// so the page's own reading order proves the engine is alive before it says
// anything about future capabilities (Overview hierarchy directive).

import { useCommandCenter, useEnginePriceChart } from '@/config/hooks/useServices'
import { formatCurrency, formatSignedCurrency } from '@/lib/utils'
import { StatCard } from '@/components/ui/StatCard'
import { PriceCard } from '@/components/shared/PriceCard'
import { TargetProgress } from '@/components/shared/TargetProgress'

// ─── 1. Live BTC (hero) ─────────────────────────────────────────────────────

export function LiveBtcHero() {
  const vm    = useCommandCenter()
  const chart = useEnginePriceChart()

  if (!chart.data) return null

  return (
    <PriceCard
      chart={chart.data}
      feed={vm.vitals ? { connected: vm.vitals.feedConnected, latencyMs: vm.vitals.feedLatencyMs } : null}
      size="hero"
    />
  )
}

// ─── 2. Engine Health (merges the former attention line + health status) ──

export function EngineHealthBanner() {
  const vm = useCommandCenter()

  const critical = vm.attention.find((a) => a.severity === 'critical')
  const topIssue = critical ?? vm.attention[0]

  const healthColor =
    vm.healthStatus === 'online' ? 'var(--probex-positive)'
    : vm.healthStatus === 'degraded' ? 'var(--probex-warning)'
    : vm.healthStatus === 'offline' ? 'var(--probex-negative)'
    : 'var(--probex-text-muted)'

  const healthyCount = vm.healthComponents?.filter((c) => c.healthy).length ?? null
  const totalCount   = vm.healthComponents?.length ?? null

  return (
    <div
      role="status"
      aria-label="Engine health"
      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 px-5 py-3 rounded-xl"
      style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}
    >
      <div className="flex items-center gap-2 text-xs flex-shrink-0">
        {topIssue ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ background: topIssue.severity === 'critical' ? 'var(--probex-negative)' : 'var(--probex-warning)' }} aria-hidden="true" />
            <span className="font-semibold" style={{ color: topIssue.severity === 'critical' ? 'var(--probex-negative)' : 'var(--probex-warning)' }}>{topIssue.message}</span>
            {vm.attention.length > 1 && <span style={{ color: 'var(--probex-text-muted)' }}>+{vm.attention.length - 1} more</span>}
          </>
        ) : (
          <>
            <span className="live-dot w-1.5 h-1.5 flex-shrink-0" style={{ background: 'var(--probex-positive)' }} aria-hidden="true" />
            <span className="font-medium" style={{ color: 'var(--probex-text-secondary)' }}>All systems nominal</span>
          </>
        )}
      </div>

      {vm.healthStatus && (
        <>
          <div className="h-4 w-px hidden sm:block" style={{ background: 'var(--probex-border)' }} aria-hidden="true" />
          <span className="flex items-center gap-1.5 text-xs font-semibold flex-shrink-0" style={{ color: healthColor }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: healthColor }} aria-hidden="true" />
            {vm.healthStatus}
            {healthyCount !== null && totalCount !== null && (
              <span className="font-normal" style={{ color: 'var(--probex-text-muted)' }}>· {healthyCount}/{totalCount} probes</span>
            )}
          </span>
        </>
      )}
    </div>
  )
}

// ─── 3. Capital & Performance ───────────────────────────────────────────────

export function CapitalPerformanceRow() {
  const vm = useCommandCenter()

  const pnlColor = (v: number) => (v > 0 ? 'var(--probex-positive)' : v < 0 ? 'var(--probex-negative)' : undefined)

  if (!vm.capital && !vm.trading) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {vm.capital && (
          <StatCard label="Capital" value={formatCurrency(vm.capital.currentCapital)} provenance="live" flashKey={vm.capital.currentCapital} />
        )}
        {vm.trading && (
          <StatCard label="Total P&L" value={formatSignedCurrency(vm.trading.totalPnl)} valueColor={pnlColor(vm.trading.totalPnl)} provenance="live" flashKey={vm.trading.totalPnl} />
        )}
      </div>
      {vm.capital && <TargetProgress capital={vm.capital} />}
    </div>
  )
}
