'use client'

// CapitalOverview — V3 redesign of V1's WalletBalanceCard + WalletOverview
// (git 0e3833a4). Per the explicit Phase 4 product direction: this is NOT a
// crypto wallet (no Polygon/USDC/POL gas balance, no connect-wallet flow) —
// it is the engine's capital, explained. Every figure is sourced from a
// specific live endpoint and labeled with that source, rather than merged
// into one ambiguous "total balance" the way V1's mock wallet did.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parsePositionRows } from '@/lib/mappers/positions'
import { formatCurrency } from '@/lib/utils'

export function CapitalOverview() {
  const executionSlice = useApplicationStore((s) => s.engine.executionStatus)
  const positionsSlice = useApplicationStore((s) => s.engine.positions)
  const survivalSlice  = useApplicationStore((s) => s.engine.survival)

  const ex = executionSlice.status === 'success' ? executionSlice.data : null
  const sv = survivalSlice.status === 'success' ? survivalSlice.data : null

  const openPositions = useMemo(() => {
    if (!positionsSlice.data) return []
    const parsed = parsePositionRows(positionsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [positionsSlice.data])

  const deployed  = openPositions.reduce((s, p) => s + (p.currentValue ?? 0), 0)
  const atRisk    = openPositions.reduce((s, p) => s + (p.costBasis ?? 0), 0)
  const available = ex?.balance ?? 0
  const total     = available + deployed
  const availPct  = total > 0 ? (available / total) * 100 : 100
  const deployPct = 100 - availPct

  if (!ex) {
    return (
      <div className="rounded-xl p-5" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border-default)' }}>
        <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>Waiting for /api/execution/status…</p>
      </div>
    )
  }

  return (
    <div className="card-elevated p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="t-label">Account Balance</span>
        <span className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider" style={{ color: ex.mode === 'live' ? 'var(--probex-positive)' : 'var(--probex-warning)' }}>
          <span className="live-dot w-1.5 h-1.5" aria-hidden="true" />
          {ex.mode}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{formatCurrency(available)}</span>
        <span className="text-sm" style={{ color: 'var(--probex-text-muted)' }}>USD</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex h-2 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
          <div className="h-full" style={{ width: `${availPct}%`, background: 'var(--probex-positive)' }} />
          <div className="h-full" style={{ width: `${deployPct}%`, background: 'var(--probex-primary)' }} />
        </div>
        <div className="flex items-center justify-between text-2xs">
          <span style={{ color: 'var(--probex-positive)' }}>Available {Math.round(availPct)}%</span>
          <span style={{ color: 'var(--probex-primary)' }}>Deployed {Math.round(deployPct)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <BalanceCell label="Available" value={formatCurrency(available)} colorVar="var(--probex-positive)" sublabel="execution balance" />
        <BalanceCell label="In Positions" value={formatCurrency(deployed)} colorVar="var(--probex-primary)" sublabel={`${openPositions.length} open`} />
        <BalanceCell label="Capital at Risk" value={formatCurrency(atRisk)} sublabel="cost basis, open positions" />
        {sv && <BalanceCell label="Survival-Tracked Total" value={formatCurrency(sv.currentCapital)} sublabel={`${sv.capitalPct.toFixed(1)}% of initial`} />}
      </div>
    </div>
  )
}

function BalanceCell({ label, value, sublabel, colorVar }: { label: string; value: string; sublabel?: string; colorVar?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-2.5 rounded-lg" style={{ background: 'var(--probex-surface-2)' }}>
      <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color: colorVar ?? 'var(--probex-text-primary)' }}>{value}</span>
      {sublabel && <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>{sublabel}</span>}
    </div>
  )
}
