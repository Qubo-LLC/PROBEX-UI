'use client'

// KellyUtilization — NEW to V3, not a V1 restore. Reuses the shared
// RadialGauge (same primitive as Consensus's EdgeStrengthGauge) to visualize
// how much of the engine's configured Kelly fraction the survival brain is
// currently allowing through, plus how that compares to what active edges
// are actually sized at.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEdgeRows } from '@/lib/mappers/edges'
import { RadialGauge } from '@/components/shared/RadialGauge'
import { formatPercent } from '@/lib/utils'

export function KellyUtilization() {
  const configSlice = useApplicationStore((s) => s.engine.config)
  const survivalSlice = useApplicationStore((s) => s.engine.survival)
  const edgesSlice = useApplicationStore((s) => s.engine.edges)

  const cfg = configSlice.status === 'success' ? configSlice.data : null
  const sv  = survivalSlice.status === 'success' ? survivalSlice.data : null

  const avgKellySize = useMemo(() => {
    if (!edgesSlice.data) return null
    const parsed = parseEdgeRows(edgesSlice.data)
    if (parsed.kind !== 'rows') return null
    const withKelly = parsed.rows.filter((r) => r.kellySize !== null)
    if (withKelly.length === 0) return null
    return withKelly.reduce((s, r) => s + (r.kellySize ?? 0), 0) / withKelly.length
  }, [edgesSlice.data])

  if (!cfg || !sv) {
    return (
      <div className="rounded-xl p-4" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
        <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>Waiting for /api/config and /api/survival…</p>
      </div>
    )
  }

  const effectiveKelly = cfg.kellyFraction * sv.kellyModifier
  const utilization = cfg.kellyFraction > 0 ? effectiveKelly / cfg.kellyFraction : 1

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Kelly Utilization</h2>
        <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>How much of the configured Kelly fraction the survival brain currently allows</p>
      </div>

      <div className="p-4 flex flex-col sm:flex-row items-center gap-5">
        <RadialGauge
          value={utilization}
          color={utilization >= 1 ? 'var(--probex-positive)' : utilization >= 0.5 ? 'var(--probex-warning)' : 'var(--probex-negative)'}
          size={120}
          strokeWidth={8}
          ariaLabel={`Kelly utilization: ${Math.round(utilization * 100)}%`}
        >
          <span className="text-2xl font-black tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{Math.round(utilization * 100)}%</span>
          <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>Utilized</span>
        </RadialGauge>

        <div className="flex-1 w-full grid grid-cols-2 gap-2">
          <Cell label="Base Kelly" value={`${cfg.kellyFraction.toFixed(2)}×`} />
          <Cell label="Survival Modifier" value={`${sv.kellyModifier.toFixed(2)}×`} warn={sv.kellyModifier < 1} />
          <Cell label="Effective Kelly" value={`${effectiveKelly.toFixed(2)}×`} accent />
          <Cell label="Avg. Active Edge Size" value={avgKellySize !== null ? formatPercent(avgKellySize) : '—'} />
        </div>
      </div>

      <p className="text-2xs leading-relaxed px-4 pb-4" style={{ color: 'var(--probex-text-disabled)' }}>
        When capital declines, the survival brain lowers the modifier below 1.00× — the engine automatically
        sizes smaller after losses, shown here as reduced utilization of the base Kelly fraction.
      </p>
    </div>
  )
}

function Cell({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 p-2.5 rounded-lg" style={{ background: 'var(--probex-surface-2)' }}>
      <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color: warn ? 'var(--probex-warning)' : accent ? 'var(--probex-primary)' : 'var(--probex-text-primary)' }}>{value}</span>
    </div>
  )
}
