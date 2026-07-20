'use client'

// ExplainabilityPanel — V3 redesign of V1's ExplainabilityPanel (git
// 0e3833a4). V1 broke a fabricated consensus score into invented "weighted
// drivers." V3 keeps the exact bar-driver visual language but every driver is
// a real, quantifiable dimension of the engine's actual decision: how far the
// detected edge clears the live threshold, how confident the engine is, and
// how much capital the Kelly model would allocate. Nothing here is a factor
// weight guessed by the UI — every number traces to /api/edges or
// /api/survival.

import type { EdgeRow } from '@/lib/mappers/edges'
import type { SurvivalStatus } from '@/types/engine'
import { formatCurrency } from '@/lib/utils'

interface Driver {
  label:  string
  pct:    number   // 0–100, bar fill
  detail: string
  color:  string
}

export function ExplainabilityPanel({ edge, survival }: { edge: EdgeRow | undefined; survival: SurvivalStatus | null }) {
  const drivers: Driver[] = []

  if (edge && survival) {
    const thresholdRatio = survival.minEdgeThreshold > 0 ? (edge.edgePct / survival.minEdgeThreshold) * 100 : 100
    drivers.push({
      label:  'Edge vs. Threshold',
      pct:    Math.min(100, thresholdRatio),
      detail: `${edge.edgePct.toFixed(1)}% detected vs. ${survival.minEdgeThreshold.toFixed(1)}% required to trade`,
      color:  thresholdRatio >= 100 ? 'var(--probex-positive)' : 'var(--probex-warning)',
    })
  }

  if (edge?.confidence !== null && edge?.confidence !== undefined) {
    drivers.push({
      label:  'Engine Confidence',
      pct:    edge.confidence * 100,
      detail: 'How certain the pattern detector is in this signal',
      color:  'var(--probex-primary)',
    })
  }

  if (edge?.kellySize !== null && edge?.kellySize !== undefined && survival) {
    const effectiveKellyPct = edge.kellySize * survival.kellyModifier * 100
    drivers.push({
      label:  'Kelly Allocation',
      pct:    Math.min(100, effectiveKellyPct * 4), // typical allocations are a few % of bankroll; ×4 keeps bars legible
      detail: `${effectiveKellyPct.toFixed(2)}% of ${formatCurrency(survival.currentCapital)} capital`,
      color:  'var(--probex-yes)',
    })
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Why this call?</h2>
        <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>The real inputs behind the engine's current read, ranked by pipeline stage</p>
      </div>

      <div className="p-4">
        {drivers.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
            {edge ? 'Waiting on survival data to compute threshold and sizing context.' : 'No active edge on this market — there is nothing to explain until one clears the threshold.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {drivers.map((d) => (
              <div key={d.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--probex-text-primary)' }}>{d.label}</span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>{Math.round(d.pct)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(2, d.pct)}%`, background: d.color }} />
                </div>
                <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{d.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
