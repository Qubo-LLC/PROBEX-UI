'use client'

// WalletPage — V3 Phase 4 assembly root, replacing V1's crypto-wallet
// experience (git 0e3833a4: ConnectedWallets, FundingHub, deposit/withdraw/
// transfer, Polygon/USDC/POL) with the explicit "this is not a crypto
// wallet, it is the engine's capital" redesign. Reuses the existing shared
// TargetProgress component (M3, already used on Overview/Survival) rather
// than rebuilding daily/weekly profit-target tracking a second time.

import { useApplicationStore } from '@/store/applicationStore'
import { TargetProgress } from '@/components/shared/TargetProgress'
import { CapitalOverview } from './CapitalOverview'
import { CapitalInsights } from './CapitalInsights'
import { CapitalLedger } from './CapitalLedger'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function WalletPage() {
  const survivalSlice = useApplicationStore((s) => s.engine.survival)
  const sv = survivalSlice.status === 'success' ? survivalSlice.data : null

  return (
    <div className="page-container flex flex-col gap-5 pb-8 animate-fade-in-up">
      <div>
        <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--probex-text-primary)' }}>Wallet</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--probex-text-muted)' }}>The engine's capital — balance, allocation, and profit targets</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
        <CapitalOverview />
        {sv ? (
          <TargetProgress
            capital={{
              dailyPnl: sv.dailyPnl,
              dailyTarget: sv.dailyTarget,
              dailyProgress: sv.dailyTarget > 0 ? clamp01(sv.dailyPnl / sv.dailyTarget) : 0,
              weeklyPnl: sv.weeklyPnl,
              weeklyTarget: sv.weeklyTarget,
              weeklyProgress: sv.weeklyTarget > 0 ? clamp01(sv.weeklyPnl / sv.weeklyTarget) : 0,
            }}
          />
        ) : (
          <div className="rounded-xl p-5" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border-default)' }}>
            <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>Waiting for /api/survival…</p>
          </div>
        )}
      </div>

      <CapitalInsights />
      <CapitalLedger />
    </div>
  )
}
