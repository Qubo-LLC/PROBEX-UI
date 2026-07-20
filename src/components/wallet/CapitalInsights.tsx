'use client'

// CapitalInsights — V3 redesign of V1's WalletInsights (git 0e3833a4). V1's
// deposit/withdrawal/funding-velocity metrics and "Funding Source
// Distribution" (USDC/Bank/PayPal) assume a funded crypto wallet that
// doesn't exist here — dropped entirely rather than faked, per the "not a
// crypto wallet" directive. Settlement Activity is restored using the real
// /api/execution/status resolutionStats already established elsewhere.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency } from '@/lib/utils'

export function CapitalInsights() {
  const executionSlice = useApplicationStore((s) => s.engine.executionStatus)
  const ex = executionSlice.status === 'success' ? executionSlice.data : null

  if (!ex) {
    return (
      <div className="rounded-xl p-4" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
        <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>Waiting for /api/execution/status…</p>
      </div>
    )
  }

  const rs = ex.resolutionStats

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Capital Insights</h2>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricBlock label="Overall P&L" value={formatSignedCurrency(ex.totalPnl)} color={ex.totalPnl >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)'} />
          <MetricBlock label="Win Rate" value={`${Math.round(ex.winRate * 100)}%`} color={ex.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)'} />
          <MetricBlock label="Total Trades" value={String(ex.totalTrades)} color="var(--probex-text-primary)" />
          <MetricBlock label="Avg. Execution" value={`${ex.avgExecutionMs}ms`} color="var(--probex-text-primary)" />
        </div>

        <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}>
          <span className="text-2xs uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>Settlement Activity</span>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--probex-positive-dim)', color: 'var(--probex-positive)' }}>{rs.wins}W</span>
              <span className="font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--probex-negative-dim)', color: 'var(--probex-negative)' }}>{rs.losses}L</span>
              <span style={{ color: 'var(--probex-text-muted)' }}>· {rs.totalResolved} settled</span>
            </div>
            <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{rs.trackedPositions} tracked · {rs.autoClosed} auto-closed</span>
          </div>
        </div>

        <p className="text-2xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
          Balance shown is {formatCurrency(ex.balance)}, last refreshed {ex.balanceCacheAgeSec}s ago from the exchange.
        </p>
      </div>
    </div>
  )
}

function MetricBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}>
      <span className="text-2xs uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <span className="text-xl font-black tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}
