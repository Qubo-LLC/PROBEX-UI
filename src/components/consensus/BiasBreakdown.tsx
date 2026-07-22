'use client'

// BiasBreakdown — originally built as CE-4 (no backend) with a fabricated
// "institutional vs. retail" volume-split framing.
//
// 2026-07-22: /api/consensus/bias is live. The real backend concept is a
// YES/NO directional split across currently-detected edges (bias.yes_percent/
// no_percent), plus a confidence distribution and a recent-10-edges trend —
// not an institutional/retail volume estimate, which the backend has no way
// to measure. Same two-row + participation-bar shell, now fed by the real
// thing the backend actually reports.

import { useApplicationStore } from '@/store/applicationStore'
import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'

export function BiasBreakdown() {
  const slice = useApplicationStore((s) => s.engine.consensusBias)
  const b = slice.status === 'success' ? slice.data : null

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Bias Breakdown</h2>
        <ProvenanceBadge provenance="live" detail="/api/consensus/bias" />
      </div>

      <div className="p-4 flex flex-col gap-3">
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
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${b?.bias.yesPercent ?? 50}%`, background: 'var(--probex-yes)' }} />
          </div>
          {b && (
            <span className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-disabled)' }}>
              Recent trend (last {b.recentTrend.last10Edges}): {b.recentTrend.bias}
            </span>
          )}
        </div>
      </div>
    </div>
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
