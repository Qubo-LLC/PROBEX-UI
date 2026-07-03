'use client'

// Daily/weekly profit-target progress from the Survival Engine.
// Shared between the Overview command center and the Survival console.
// Bars are capped at 100%; the raw PnL vs target figures carry the truth.

import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'

interface TargetProgressProps {
  capital: {
    dailyPnl:       number
    dailyTarget:    number
    dailyProgress:  number
    weeklyPnl:      number
    weeklyTarget:   number
    weeklyProgress: number
  }
}

export function TargetProgress({ capital }: TargetProgressProps) {
  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
        Profit Targets
      </h3>
      <TargetRow label="Daily"  pnl={capital.dailyPnl}  target={capital.dailyTarget}  progress={capital.dailyProgress} />
      <TargetRow label="Weekly" pnl={capital.weeklyPnl} target={capital.weeklyTarget} progress={capital.weeklyProgress} />
    </Card>
  )
}

function TargetRow({ label, pnl, target, progress }: { label: string; pnl: number; target: number; progress: number }) {
  const met      = progress >= 1
  const negative = pnl < 0
  const barColor = negative ? 'var(--probex-negative)' : met ? 'var(--probex-positive)' : 'var(--probex-primary)'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--probex-text-secondary)' }}>{label}</span>
        <span className="tabular-nums font-semibold" style={{ color: 'var(--probex-text-primary)' }}>
          {formatCurrency(pnl)} <span style={{ color: 'var(--probex-text-muted)', fontWeight: 400 }}>/ {formatCurrency(target)}</span>
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--probex-surface-2)' }}
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} target progress`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.round(progress * 100)}%`, background: barColor }}
        />
      </div>
    </div>
  )
}
