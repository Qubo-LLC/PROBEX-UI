'use client'

// WalletPage — the engine's capital as a treasury view: "what do I hold, where
// is it, and am I on target." Deliberately distinct from Portfolio (2026-07-24):
// Portfolio answers "how is it PERFORMING over time" (returns, history charts,
// allocation, win rate); Wallet answers "what capital exists RIGHT NOW"
// (balance composition, available vs deployed vs at-risk, survival-tracked
// total, profit-target goals, and the settled-money ledger). The performance
// panel that used to live here (CapitalInsights — overall P&L / win rate /
// total trades) was removed because it duplicated Portfolio; performance is
// Portfolio's job, capital composition is Wallet's.

import { useApplicationStore } from '@/store/applicationStore'
import { TargetProgress } from '@/components/shared/TargetProgress'
import { CapitalOverview } from './CapitalOverview'
import { CapitalLedger } from './CapitalLedger'

export function WalletPage() {
  const survivalSlice = useApplicationStore((s) => s.engine.survival)
  const sv = survivalSlice.status === 'success' ? survivalSlice.data : null

  return (
    <div className="page-container flex flex-col gap-5 pb-8 animate-fade-in-up">
      <div>
        <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--probex-text-primary)' }}>Wallet</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--probex-text-muted)' }}>
          The engine&apos;s capital right now — balance composition, what&apos;s at risk, and your profit targets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
        <CapitalOverview />
        {sv ? (
          <TargetProgress
            capital={{
              dailyPnl:     sv.dailyPnl,
              dailyTarget:  sv.dailyTarget,
              weeklyPnl:    sv.weeklyPnl,
              weeklyTarget: sv.weeklyTarget,
            }}
          />
        ) : (
          <div className="rounded-xl p-5" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border-default)' }}>
            <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>Waiting for /api/survival…</p>
          </div>
        )}
      </div>

      <CapitalLedger />
    </div>
  )
}
