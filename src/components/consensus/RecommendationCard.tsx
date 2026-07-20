'use client'

// RecommendationCard — restored from V1 (git 0e3833a4). V1's headline
// recommendation was reused verbatim from a mock recommendation engine, and
// its "Consensus edge" metric was market-price minus a fabricated consensus
// score. V3 keeps the premium headline treatment but both supporting metrics
// are now genuinely real: Edge Magnitude (from /api/edges) and Engine
// Confidence (the same field), with no invented "gap" calculation.

import type { EdgeRow } from '@/lib/mappers/edges'

const REC_META: Record<string, { color: string; label: string; sub: string }> = {
  strong_buy_yes: { color: 'var(--probex-yes)', label: 'Strong Buy Yes', sub: 'High-conviction YES' },
  buy_yes:        { color: 'var(--probex-positive)', label: 'Buy Yes', sub: 'Lean YES' },
  hold:           { color: 'var(--probex-warning)', label: 'Hold', sub: 'No clear edge' },
  buy_no:         { color: 'var(--probex-negative)', label: 'Buy No', sub: 'Lean NO' },
  strong_buy_no:  { color: 'var(--probex-no)', label: 'Strong Buy No', sub: 'High-conviction NO' },
}

export function RecommendationCard({ edge }: { edge: EdgeRow | undefined }) {
  const meta = edge?.recommendation ? REC_META[edge.recommendation] : undefined

  return (
    <div className="rounded-xl overflow-hidden h-full flex flex-col" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Recommendation Engine</h2>
        {edge && <span className="live-dot" aria-hidden="true" />}
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1">
        {!edge || !meta ? (
          <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
            No active edge on this market right now — the engine has nothing to recommend until one clears the threshold.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: `color-mix(in srgb, ${meta.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${meta.color} 22%, transparent)` }}>
              <div className="flex flex-col">
                <span className="text-lg font-black leading-none" style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-2xs mt-1" style={{ color: 'var(--probex-text-muted)' }}>{meta.sub}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Edge Magnitude" value={`${edge.edgePct.toFixed(1)}%`} color={meta.color} hint="over market price" />
              <Metric
                label="Engine Confidence"
                value={edge.confidence !== null ? `${Math.round(edge.confidence * 100)}%` : '—'}
                color="var(--probex-primary)"
                hint={edge.confidence !== null ? (edge.confidence >= 0.7 ? 'high' : edge.confidence >= 0.5 ? 'medium' : 'low') : 'unavailable'}
              />
            </div>

            <p className="text-2xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
              The engine detected this edge via {edge.signal ?? 'its pattern detector'}. Direction, magnitude, and
              confidence come directly from the live edge signal — nothing here is inferred client-side.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, color, hint }: { label: string; value: string; color: string; hint: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-2.5 rounded-lg" style={{ background: 'var(--probex-surface-2)' }}>
      <span className="text-2xs uppercase tracking-wider" style={{ color: 'var(--probex-text-disabled)' }}>{label}</span>
      <span className="text-lg font-bold tabular-nums leading-none" style={{ color }}>{value}</span>
      <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{hint}</span>
    </div>
  )
}
