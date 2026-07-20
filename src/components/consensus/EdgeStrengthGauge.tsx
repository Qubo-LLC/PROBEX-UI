'use client'

// EdgeStrengthGauge — V3's redesign of V1's ConsensusScoreCard (git 0e3833a4).
// Same 270° hero gauge and 4-cell metadata grid V1 used to dramatize a
// fabricated consensus score; here every value is the engine's real,
// currently-detected edge for the selected market. No active edge is a
// genuine live state (not a missing-backend state) — it renders as a calm
// zeroed gauge with "No active edge", never as an AwaitingBackend frame.

import { RadialGauge } from '@/components/shared/RadialGauge'
import type { EdgeRow } from '@/lib/mappers/edges'

const REC_LABEL: Record<string, string> = {
  strong_buy_yes: 'Strong Buy Yes',
  buy_yes:        'Buy Yes',
  hold:           'Hold',
  buy_no:         'Buy No',
  strong_buy_no:  'Strong Buy No',
}

export function EdgeStrengthGauge({ edge }: { edge: EdgeRow | undefined }) {
  const pct   = edge ? edge.edgePct : 0
  const color = !edge
    ? 'var(--probex-text-muted)'
    : edge.direction === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)'

  return (
    <div className="flex flex-col items-center gap-4">
      <RadialGauge
        value={Math.min(1, pct / 20)} // edges are typically single-digit %; 20% fills the arc
        color={color}
        ariaLabel={edge ? `Edge strength: ${pct.toFixed(1)}%` : 'No active edge'}
      >
        <span className="text-4xl font-black tabular-nums leading-none" style={{ color }}>
          {edge ? `${pct.toFixed(1)}%` : '0%'}
        </span>
        <span className="text-xs font-semibold mt-1 uppercase tracking-widest" style={{ color: 'var(--probex-text-muted)' }}>
          Edge Strength
        </span>
      </RadialGauge>

      <div className="grid grid-cols-2 gap-3 w-full">
        <MetaCell label="Signal" value={edge?.signal ?? '—'} colorVar={color} />
        <MetaCell label="Confidence" value={edge?.confidence !== null && edge?.confidence !== undefined ? `${Math.round(edge.confidence * 100)}%` : '—'} colorVar={color} />
        <MetaCell label="Direction" value={edge ? edge.direction.toUpperCase() : '—'} colorVar={color} />
        <MetaCell label="Recommendation" value={edge?.recommendation ? (REC_LABEL[edge.recommendation] ?? edge.recommendation) : '—'} colorVar={color} />
      </div>
    </div>
  )
}

function MetaCell({ label, value, colorVar }: { label: string; value: string; colorVar: string }) {
  return (
    <div
      className="flex flex-col gap-0.5 p-2.5 rounded-lg"
      style={{ background: `color-mix(in srgb, ${colorVar} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${colorVar} 18%, transparent)` }}
    >
      <span className="text-2xs uppercase tracking-wider font-medium" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <span className="text-sm font-bold truncate" style={{ color: colorVar }}>{value}</span>
    </div>
  )
}
