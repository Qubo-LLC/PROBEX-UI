'use client'

// SurvivalConsole — the capital-protection console (/survival).
//
// Operator questions, in order (PROBEX_PRODUCT_SPEC.md §4):
//   1. What state is the survival brain in?      → state machine strip
//   2. How much capital is left, and for how long? → capital + burn/runway
//   3. Am I on target?                            → target progress + remaining
//   4. How is the brain reacting?                 → sizing response (Kelly, threshold)
//
// Reads /api/survival (+ /api/runtime for context) from ApplicationStore.
// Truth rules: daysOfRunway is null when burn is zero — shown as "No burn",
// never a fake number; behind_target_pct is labelled "target remaining"
// (backend semantics: 100 = the full target remains).

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { survivalStateColor, survivalStateLabel } from '@/lib/display/engine'
import { StatCard }       from '@/components/ui/StatCard'
import { Card }           from '@/components/ui/Card'
import { PageHeader }     from '@/components/ui/PageHeader'
import { ErrorState }     from '@/components/ui/ErrorState'
import { TargetProgress } from '@/components/shared/TargetProgress'
import type { SurvivalState } from '@/types/engine'

const STATES: SurvivalState[] = ['HEALTHY', 'CAUTION', 'DANGER', 'CRITICAL']

const STATE_DESCRIPTIONS: Record<SurvivalState, string> = {
  HEALTHY:  'Capital intact — full position sizing available.',
  CAUTION:  'Capital drawdown detected — the brain reduces sizing and raises the edge bar.',
  DANGER:   'Significant drawdown — sizing sharply reduced, only strong edges accepted.',
  CRITICAL: 'Capital preservation mode — trading effectively halted until recovery.',
}

export function SurvivalConsole() {
  const slice   = useApplicationStore((s) => s.engine.survival)
  const sv      = slice.data

  return (
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader
        title="Survival"
        subtitle="Capital protection — state machine, burn rate, runway, and targets"
      />

      {slice.status === 'loading' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {['Capital', 'Daily Burn', 'Runway', 'Recovery Trades', 'Avg Win Size', 'Daily Target Left'].map((label) => (
            <StatCard key={label} label={label} value="" isLoading />
          ))}
        </div>
      )}

      {slice.status === 'error' && (
        <ErrorState
          title="Survival engine unavailable"
          description={slice.error?.message ?? 'The /api/survival endpoint did not respond.'}
          fullPage={false}
        />
      )}

      {sv && (
        <>
          {/* 1 · State machine */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
                Survival State
              </h3>
              <span className="text-xs" style={{ color: 'var(--probex-text-muted)' }}>
                {STATE_DESCRIPTIONS[sv.state]}
              </span>
            </div>
            <div className="flex items-center gap-1.5" role="list" aria-label="Survival state machine">
              {STATES.map((state) => {
                const isCurrent = state === sv.state
                return (
                  <div
                    key={state}
                    role="listitem"
                    aria-current={isCurrent}
                    className="flex-1 flex flex-col items-center gap-1.5 rounded-lg py-2.5 px-2"
                    style={{
                      background: isCurrent ? 'var(--probex-surface-2)' : 'transparent',
                      border:     `1px solid ${isCurrent ? survivalStateColor(state) : 'var(--probex-border)'}`,
                      opacity:    isCurrent ? 1 : 0.45,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: survivalStateColor(state) }}
                      aria-hidden="true"
                    />
                    <span
                      className="text-2xs font-bold uppercase tracking-wider"
                      style={{ color: isCurrent ? survivalStateColor(state) : 'var(--probex-text-muted)' }}
                    >
                      {survivalStateLabel(state)}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 2 · Capital vitals */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard
              label="Capital"
              value={formatCurrency(sv.currentCapital)}
              delta={sv.capitalPct / 100 - 1}
              deltaLabel={`${sv.capitalPct.toFixed(1)}% of initial ${formatCurrency(sv.initialCapital)}`}
            />
            <StatCard
              label="Daily Burn"
              value={sv.dailyBurnRate > 0 ? formatCurrency(sv.dailyBurnRate) : 'None'}
              valueColor={sv.dailyBurnRate > 0 ? 'var(--probex-negative)' : 'var(--probex-positive)'}
              deltaLabel={sv.dailyBurnRate > 0 ? 'capital consumed per day' : 'no capital being consumed'}
            />
            <StatCard
              label="Runway"
              value={sv.daysOfRunway !== null ? `${Math.floor(sv.daysOfRunway)}d` : '∞'}
              valueColor={
                sv.daysOfRunway !== null && sv.daysOfRunway < 7
                  ? 'var(--probex-negative)'
                  : undefined
              }
              deltaLabel={sv.daysOfRunway !== null ? 'at current burn rate' : 'no burn — not applicable'}
            />
            <StatCard
              label="Recovery Trades"
              value={String(sv.recoveryTradesNeeded)}
              deltaLabel={sv.recoveryTradesNeeded > 0 ? 'wins needed to recover' : 'nothing to recover'}
            />
            <StatCard
              label="Avg Win Size"
              value={sv.avgWinSize > 0 ? formatCurrency(sv.avgWinSize) : '—'}
              deltaLabel={sv.avgWinSize > 0 ? 'per winning trade' : 'no wins recorded yet'}
            />
            <StatCard
              label="Daily Target Left"
              value={formatPercent(sv.behindTargetPct / 100)}
              deltaLabel={`${formatCurrency(Math.max(0, sv.dailyTarget - sv.dailyPnl))} to go`}
            />
          </div>

          {/* 3 · Targets + 4 · Sizing response */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            <TargetProgress capital={{
              dailyPnl:       sv.dailyPnl,
              dailyTarget:    sv.dailyTarget,
              dailyProgress:  sv.dailyTarget  > 0 ? Math.max(0, Math.min(1, sv.dailyPnl  / sv.dailyTarget))  : 0,
              weeklyPnl:      sv.weeklyPnl,
              weeklyTarget:   sv.weeklyTarget,
              weeklyProgress: sv.weeklyTarget > 0 ? Math.max(0, Math.min(1, sv.weeklyPnl / sv.weeklyTarget)) : 0,
            }} />

            <Card className="flex flex-col gap-3">
              <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
                Brain Response
              </h3>
              <SizingRow
                label="Kelly modifier"
                value={`${sv.kellyModifier.toFixed(2)}×`}
                note={sv.kellyModifier >= 1 ? 'full sizing' : 'sizing reduced by the survival brain'}
                highlight={sv.kellyModifier < 1}
              />
              <SizingRow
                label="Minimum edge threshold"
                value={`${sv.minEdgeThreshold.toFixed(2)}%`}
                note="edges below this are rejected"
                highlight={false}
              />
              <p className="text-2xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
                The survival brain adjusts these live: as capital declines, the Kelly
                modifier shrinks and the edge threshold rises, so the engine trades
                smaller and only on stronger signals.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function SizingRow({ label, value, note, highlight }: { label: string; value: string; note: string; highlight: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span style={{ color: 'var(--probex-text-secondary)' }}>{label}</span>
      <span className="flex items-baseline gap-2">
        <span
          className="font-bold tabular-nums text-sm"
          style={{ color: highlight ? 'var(--probex-warning)' : 'var(--probex-text-primary)' }}
        >
          {value}
        </span>
        <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{note}</span>
      </span>
    </div>
  )
}
