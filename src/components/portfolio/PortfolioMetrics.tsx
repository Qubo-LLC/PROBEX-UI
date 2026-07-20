'use client'

// PortfolioMetrics — restored from V1 (git 0e3833a4). V1's "Avg. Consensus"
// stat depended on a fabricated per-position consensus score; every other
// stat was already the right shape for real engine data. V3 replaces it with
// Total Trades (a genuinely live execution metric) and sources every value
// from /api/execution/status + /api/positions — both confirmed, live.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency } from '@/lib/utils'
import { StatCard } from '@/components/ui/StatCard'

export function PortfolioMetrics() {
  const executionSlice = useApplicationStore((s) => s.engine.executionStatus)
  const positionsSlice = useApplicationStore((s) => s.engine.positions)

  const ex  = executionSlice.status === 'success' ? executionSlice.data : null
  const pos = positionsSlice.status === 'success' ? positionsSlice.data : null

  const loading = !ex && !pos

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <StatCard
        label="Portfolio Value"
        value={ex ? formatCurrency(ex.balance) : ''}
        isLoading={loading}
        valueSize="lg"
        {...(pos && { deltaLabel: `${pos.count} open position${pos.count === 1 ? '' : 's'}` })}
      />
      <StatCard
        label="Unrealized P&L"
        value={pos ? formatSignedCurrency(pos.totalUnrealizedPnl) : ''}
        isLoading={loading}
        {...(pos && pos.totalUnrealizedPnl !== 0 && { valueColor: pos.totalUnrealizedPnl > 0 ? 'var(--probex-positive)' : 'var(--probex-negative)' })}
        deltaLabel="across open positions"
      />
      <StatCard
        label="Realized P&L"
        value={ex ? formatSignedCurrency(ex.totalPnl) : ''}
        isLoading={loading}
        {...(ex && ex.totalPnl !== 0 && { valueColor: ex.totalPnl > 0 ? 'var(--probex-positive)' : 'var(--probex-negative)' })}
        {...(ex && { deltaLabel: `${ex.closedPositions} closed` })}
      />
      <StatCard
        label="Win Rate"
        value={ex ? `${Math.round(ex.winRate * 100)}%` : ''}
        isLoading={loading}
        {...(ex && { valueColor: ex.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)' })}
        {...(ex && { deltaLabel: `${ex.wins}W / ${ex.losses}L` })}
      />
      <StatCard
        label="Open Positions"
        value={pos ? String(pos.count) : ''}
        isLoading={loading}
        deltaLabel={pos && pos.count === 0 ? 'no capital deployed' : 'currently held'}
      />
      <StatCard
        label="Total Trades"
        value={ex ? String(ex.totalTrades) : ''}
        isLoading={loading}
        {...(ex && { deltaLabel: `${ex.avgExecutionMs}ms avg execution` })}
      />
    </div>
  )
}
