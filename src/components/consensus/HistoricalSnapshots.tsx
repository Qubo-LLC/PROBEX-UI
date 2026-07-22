'use client'

// HistoricalSnapshots — point-in-time consensus readings across the recent
// window. Originally CE-3 (no backend), rendered as 5 ghost rows. 2026-07-22:
// /api/consensus/history is live — sampled at 5 points across the available
// window (oldest, then evenly spaced to newest) so the spread is meaningful
// even though captures currently arrive only seconds apart.

import { useApplicationStore } from '@/store/applicationStore'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ConsensusHistoryPoint } from '@/types/engine'

function sampleSnapshots(history: ConsensusHistoryPoint[], n: number): ConsensusHistoryPoint[] {
  if (history.length <= n) return history
  const step = (history.length - 1) / (n - 1)
  return Array.from({ length: n }, (_, i) => history[Math.round(i * step)]!)
}

export function HistoricalSnapshots() {
  const slice = useApplicationStore((s) => s.engine.consensusHistory)
  const history = slice.status === 'success' && slice.data ? slice.data.history : []
  const rows = sampleSnapshots(history, 5)

  return (
    <div className="rounded-xl overflow-hidden h-full flex flex-col" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Historical Snapshots</h2>
          <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>Consensus state at key points in the recent window</p>
        </div>
        <ProvenanceBadge provenance="live" detail="/api/consensus/history" />
      </div>

      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState size="sm" title="No snapshots yet" description="Populates as the engine's consensus signal accumulates history." />
        </div>
      ) : (
        <div className="flex flex-col px-4">
          {rows.map((row, i) => {
            const scoreColor = Math.abs(row.score) < 0.05 ? 'var(--probex-text-muted)' : row.score > 0 ? 'var(--probex-yes)' : 'var(--probex-no)'
            return (
              <div
                key={row.ts}
                className="flex items-center gap-3 py-2.5"
                style={i < rows.length - 1 ? { borderBottom: '1px solid var(--probex-border)' } : undefined}
              >
                <span className="text-2xs font-semibold w-14 flex-shrink-0 tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                  {new Date(row.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-sm font-bold tabular-nums w-12 flex-shrink-0" style={{ color: scoreColor }}>{row.score.toFixed(2)}</span>
                <span className="text-xs tabular-nums w-12 flex-shrink-0" style={{ color: 'var(--probex-text-secondary)' }}>{Math.round(row.confidence * 100)}%</span>
                <span className="text-2xs font-semibold px-2 py-0.5 rounded flex-shrink-0 tabular-nums" style={{ background: 'var(--probex-surface-2)', color: 'var(--probex-text-muted)' }}>
                  ${row.btcPrice.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
