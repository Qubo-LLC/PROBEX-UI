'use client'

// Daily/weekly profit-target progress (Overview / Survival / Wallet). The bar
// measures against a personal target (preferencesStore) when set, else the
// engine's own target from /api/survival. The override is display-only — it
// never changes engine behaviour.

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { usePreferencesStore, type ProfitTargets } from '@/store/preferencesStore'

interface TargetProgressProps {
  capital: {
    dailyPnl:     number
    dailyTarget:  number      // engine default (fallback)
    weeklyPnl:    number
    weeklyTarget: number      // engine default (fallback)
    // Legacy caller props — ignored (progress is computed internally now).
    dailyProgress?:  number
    weeklyProgress?: number
  }
}

export function TargetProgress({ capital }: TargetProgressProps) {
  const overrides   = usePreferencesStore((s) => s.profitTargets)
  const setTarget   = usePreferencesStore((s) => s.setProfitTarget)

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="t-label">
          Profit Targets
        </h3>
        {(overrides.daily !== null || overrides.weekly !== null) && (
          <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>custom</span>
        )}
      </div>
      <TargetRow
        label="Daily"
        period="daily"
        pnl={capital.dailyPnl}
        engineTarget={capital.dailyTarget}
        override={overrides.daily}
        onSet={setTarget}
      />
      <TargetRow
        label="Weekly"
        period="weekly"
        pnl={capital.weeklyPnl}
        engineTarget={capital.weeklyTarget}
        override={overrides.weekly}
        onSet={setTarget}
      />
    </Card>
  )
}

function TargetRow({
  label, period, pnl, engineTarget, override, onSet,
}: {
  label:        string
  period:       keyof ProfitTargets
  pnl:          number
  engineTarget: number
  override:     number | null
  onSet:        (period: keyof ProfitTargets, value: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')

  const target    = override ?? engineTarget
  const hasTarget = target > 0
  const rawPct    = hasTarget ? pnl / target : 0
  const pct       = Math.max(0, Math.min(1, rawPct))   // bar fill, clamped
  const met       = hasTarget && pnl >= target
  const negative  = pnl < 0
  const barColor  = negative ? 'var(--probex-negative)' : met ? 'var(--probex-positive)' : 'var(--probex-primary)'
  const pctLabel  = hasTarget ? `${Math.round(rawPct * 100)}%` : '—'

  const commit = () => {
    const n = parseFloat(draft)
    onSet(period, Number.isFinite(n) && n > 0 ? n : null)
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="flex items-center gap-1.5" style={{ color: 'var(--probex-text-secondary)' }}>
          {label}
          {met && (
            <span className="text-2xs font-bold px-1.5 py-0.5 rounded" style={{ color: 'var(--probex-positive)', background: 'var(--probex-positive-dim)' }}>
              ✓ met
            </span>
          )}
        </span>

        {editing ? (
          <span className="flex items-center gap-1">
            <span style={{ color: 'var(--probex-text-muted)' }}>$</span>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
              onBlur={commit}
              placeholder={engineTarget.toFixed(2)}
              className="input-base h-6 w-20 text-xs text-right px-1.5 py-0"
              aria-label={`Set ${label.toLowerCase()} profit target`}
            />
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="tabular-nums font-semibold" style={{ color: 'var(--probex-text-primary)' }}>
              {formatCurrency(pnl)}{' '}
              <span style={{ color: 'var(--probex-text-muted)', fontWeight: 400 }}>/ {formatCurrency(target)}</span>
            </span>
            <span className="tabular-nums text-2xs font-bold" style={{ color: barColor }}>{pctLabel}</span>
            <button
              type="button"
              onClick={() => { setDraft(override !== null ? String(override) : ''); setEditing(true) }}
              className="text-2xs cursor-pointer focus-ring rounded px-1"
              style={{ color: 'var(--probex-text-muted)' }}
              aria-label={`Edit ${label.toLowerCase()} target`}
              title="Set a personal target"
            >
              edit
            </button>
          </span>
        )}
      </div>

      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--probex-surface-2)' }}
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} target progress`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.round(pct * 100)}%`, background: barColor }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
          {override !== null ? 'personal target' : `engine target · ${formatCurrency(engineTarget)}`}
        </span>
        {override !== null && (
          <button
            type="button"
            onClick={() => onSet(period, null)}
            className="text-2xs cursor-pointer focus-ring rounded px-1"
            style={{ color: 'var(--probex-text-disabled)' }}
          >
            reset to engine
          </button>
        )}
      </div>
    </div>
  )
}
