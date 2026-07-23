'use client'

// PortfolioSummaryCard — snapshot-history aggregation from /api/portfolio/summary
// + /api/balance. A different source than PortfolioMetrics (execution/status +
// positions), and the two genuinely disagree upstream; both are shown rather
// than reconciled.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { StatCard } from '@/components/ui/StatCard'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'

export function PortfolioSummaryCard() {
  const summarySlice = useApplicationStore((s) => s.engine.portfolioSummary)
  const balanceSlice = useApplicationStore((s) => s.engine.balance)
  const s = summarySlice.status === 'success' && summarySlice.data ? summarySlice.data.summary : null
  const bal = balanceSlice.status === 'success' ? balanceSlice.data : null

  if (!s && !bal) return null

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Snapshot History</h2>
        <ProvenanceBadge provenance="live" detail="/api/portfolio/summary" />
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {s && (
          <>
            <StatCard label="Current Value" value={formatCurrency(s.currentValue)} deltaLabel={`peak ${formatCurrency(s.peakValue)}`} />
            <StatCard
              label="Total Return"
              value={`${s.totalReturnPct >= 0 ? '+' : ''}${s.totalReturnPct.toFixed(1)}%`}
              valueColor={s.totalReturnPct >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)'}
              deltaLabel={`since ${new Date(s.firstSnapshot).toLocaleDateString()}`}
            />
            <StatCard
              label="Drawdown"
              value={`${s.currentDrawdownPct.toFixed(1)}%`}
              valueColor={s.currentDrawdownPct > 20 ? 'var(--probex-negative)' : s.currentDrawdownPct > 0 ? 'var(--probex-warning)' : undefined}
              deltaLabel={`from peak ${formatCurrency(s.peakValue)}`}
            />
            <StatCard
              label="Win Rate"
              value={formatPercent(s.currentWinRate)}
              deltaLabel={`${s.totalTrades} total trades`}
            />
          </>
        )}
        {bal && (
          <StatCard
            label="Balance"
            value={formatCurrency(bal.balanceUsd)}
            {...(bal.cacheFresh
              ? { deltaLabel: 'fresh' }
              : bal.cacheAgeSec !== null
                ? { deltaLabel: `cached ${bal.cacheAgeSec}s` }
                : {})}
          />
        )}
      </div>
      {s && s.currentPositions !== 0 && (
        <div className="px-4 pb-3">
          <p className="text-2xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
            This snapshot history reports {s.currentPositions} current position{s.currentPositions === 1 ? '' : 's'} from {s.snapshotCount} portfolio snapshots — a different aggregation than the live trading metrics above, which come directly from the execution engine.
          </p>
        </div>
      )}
    </div>
  )
}
