'use client'

// Command Center — the Overview page of the PROBEX cockpit.
//
// Answers, top to bottom, in seconds (PROBEX_PRODUCT_SPEC.md §4):
//   1. Is the engine running?        → IdentityStrip
//   2. Anything needing attention?   → AttentionBanner (invisible when nominal)
//   3. Is capital safe / profitable? → Capital & trading vitals row
//   4. What is the market doing?     → PriceCard + profit targets
//   5. Is it healthy inside?         → ComponentGrid
//
// Every section renders ONLY when its endpoint has real data — no fake zeros.
// Trading figures come from /api/execution/status (spec §6.2).

import { useCommandCenter, useEnginePriceChart } from '@/config/hooks/useServices'
import { formatCurrency, formatSignedCurrency, formatDelta, formatPercent } from '@/lib/utils'
import { survivalStateColor, survivalStateLabel } from '@/lib/display/engine'
import { StatCard } from '@/components/ui/StatCard'
import { AttentionBanner } from './AttentionBanner'
import { IdentityStrip } from './IdentityStrip'
import { PriceCard } from '@/components/shared/PriceCard'
import { TargetProgress } from '@/components/shared/TargetProgress'
import { ComponentGrid } from './ComponentGrid'

export function CommandCenter() {
  const vm    = useCommandCenter()
  const chart = useEnginePriceChart()

  const pnlColor = (v: number) =>
    v > 0 ? 'var(--probex-positive)' : v < 0 ? 'var(--probex-negative)' : undefined

  return (
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">

      {/* 1 · Is the engine running? */}
      <IdentityStrip
        identity={vm.identity}
        uptimeSeconds={vm.vitals?.uptimeSeconds ?? null}
        allClear={vm.attention.length === 0 && vm.vitals !== null}
      />

      {/* 2 · Does anything require immediate attention? */}
      <AttentionBanner items={vm.attention} />

      {/* Initial load — labelled skeletons keep the layout stable while data arrives */}
      {vm.isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {['Survival State', 'Capital', 'Total P&L', 'Unrealized P&L', 'Open Positions', 'Balance'].map((label) => (
            <StatCard key={label} label={label} value="" isLoading />
          ))}
        </div>
      )}

      {/* 3 · Is capital safe? Is the engine profitable? */}
      {(vm.capital || vm.trading || vm.vitals) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {vm.capital && (
            <StatCard
              label="Survival State"
              value={survivalStateLabel(vm.capital.state)}
              valueColor={survivalStateColor(vm.capital.state)}
              deltaLabel={`Capital at ${formatPercent(vm.capital.capitalPct)}`}
            />
          )}
          {vm.capital && (
            <StatCard
              label="Capital"
              value={formatCurrency(vm.capital.currentCapital)}
              delta={vm.capital.capitalPct - 1}
              deltaLabel={formatDelta(vm.capital.capitalPct - 1) + ' vs initial'}
            />
          )}
          {vm.trading && (
            <StatCard
              label="Total P&L"
              value={formatSignedCurrency(vm.trading.totalPnl)}
              valueColor={pnlColor(vm.trading.totalPnl)}
              deltaLabel={
                vm.trading.totalTrades > 0
                  ? `${vm.trading.totalTrades} trades · ${vm.trading.wins}W / ${vm.trading.losses}L`
                  : 'No trades this session'
              }
            />
          )}
          {vm.vitals && (
            <StatCard
              label="Unrealized P&L"
              value={formatSignedCurrency(vm.vitals.unrealizedPnl)}
              valueColor={pnlColor(vm.vitals.unrealizedPnl)}
              deltaLabel={`Realized ${formatSignedCurrency(vm.vitals.realizedPnl)}`}
            />
          )}
          {vm.vitals && (
            <StatCard
              label="Open Positions"
              value={String(vm.vitals.activePositions)}
              {...(vm.activeEdges !== null && { deltaLabel: `${vm.activeEdges} active edges` })}
            />
          )}
          {vm.trading && vm.trading.totalTrades > 0 ? (
            <StatCard
              label="Win Rate"
              value={formatPercent(vm.trading.winRate)}
              valueColor={vm.trading.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)'}
              deltaLabel={`${vm.trading.wins}W / ${vm.trading.losses}L`}
            />
          ) : vm.trading ? (
            <StatCard
              label="Balance"
              value={formatCurrency(vm.trading.balance)}
              deltaLabel="Paper account"
            />
          ) : null}
        </div>
      )}

      {/* 4 · Market + targets */}
      {(chart.data || vm.capital) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
          {chart.data && (
            <div className="lg:col-span-2">
              <PriceCard
                chart={chart.data}
                feed={vm.vitals ? { connected: vm.vitals.feedConnected, latencyMs: vm.vitals.feedLatencyMs } : null}
              />
            </div>
          )}
          {vm.capital && (
            <TargetProgress capital={vm.capital} />
          )}
        </div>
      )}

      {/* 5 · Engine internals */}
      <ComponentGrid
        healthComponents={vm.healthComponents}
        runtimeComponents={vm.runtimeComponents}
      />

    </div>
  )
}
