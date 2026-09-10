'use client'

// BiasBreakdown — YES/NO directional split across detected edges from
// /api/consensus/bias, with a confidence distribution and recent-trend.

import { useApplicationStore } from '@/store/applicationStore'
import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { Panel } from '@/components/ui/Panel'

export function BiasBreakdown() {
  const slice = useApplicationStore((s) => s.engine.consensusBias)
  const envelope = slice.status === 'success' ? slice.data : null
  // null exactly when the engine reports no edges detected yet — the split bar
  // must not be filled to a fabricated 50/50 in that case.
  const b = envelope?.detail ?? null
  const notComputed = envelope !== null && envelope.detail === null

  return (
    // Canonical data surface — see ConsensusScoreCard for why the hand-rolled
    // header/body split was retired.
    <Panel
      title="Bias Breakdown"
      provenance={b ? 'live' : 'idle'}
      source="/api/consensus/bias"
      slice={slice}
      state={b ? 'live' : 'idle'}
    >
      <div className="flex flex-col gap-3">
        <BiasRow
          label="YES"
          description={b ? `${b.bias.yesCount} of ${b.totalEdges} detected edge${b.totalEdges === 1 ? '' : 's'}` : 'Directional edges favoring YES'}
          icon="▲"
          color="var(--probex-yes)"
          percent={b?.bias.yesPercent ?? null}
        />
        <BiasRow
          label="NO"
          description={b ? `${b.bias.noCount} of ${b.totalEdges} detected edge${b.totalEdges === 1 ? '' : 's'}` : 'Directional edges favoring NO'}
          icon="▼"
          color="var(--probex-no)"
          percent={b?.bias.noPercent ?? null}
        />

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            <span>YES {b ? `${b.bias.yesPercent.toFixed(0)}%` : <AwaitingValue size="sm" className="inline" />}</span>
            <span>NO {b ? `${b.bias.noPercent.toFixed(0)}%` : <AwaitingValue size="sm" className="inline" />}</span>
          </div>
          {/* An unfilled track when there is no split — a half-filled bar would
              read as a measured 50/50, which is a value the engine never gave. */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
            {b !== null && (
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${b.bias.yesPercent}%`, background: 'var(--probex-yes)' }} />
            )}
          </div>
          {b !== null && (
            <span className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-disabled)' }}>
              Recent trend (last {b.recentTrend.last10Edges}): {b.recentTrend.bias}
            </span>
          )}
          {notComputed && (
            <span className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-disabled)' }}>
              {envelope.message ?? 'No edges detected yet.'}
            </span>
          )}
        </div>
      </div>
    </Panel>
  )
}

function BiasRow({ label, description, icon, color, percent }: { label: string; description: string; icon: string; color: string; percent: number | null }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}>
      <span className="text-lg flex-shrink-0 font-bold" style={{ color }} aria-hidden="true">{icon}</span>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-xs font-semibold" style={{ color: 'var(--probex-text-primary)' }}>{label}</span>
        <span className="text-2xs truncate" style={{ color: 'var(--probex-text-muted)' }}>{description}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        {percent !== null ? (
          <span className="text-sm font-bold tabular-nums" style={{ color }}>{percent.toFixed(0)}%</span>
        ) : (
          <AwaitingValue size="md" />
        )}
        <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>edge share</span>
      </div>
    </div>
  )
}
