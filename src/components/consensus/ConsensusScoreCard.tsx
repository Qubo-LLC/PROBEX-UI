'use client'

// ConsensusScoreCard — restored V1 visual (git 0e3833a4): the platform-wide
// consensus gauge, distinct from the per-market EdgeStrengthGauge above it.
// This is the genuine CE-3 concept (aggregated institutional-grade consensus
// across signals) which has no backend endpoint yet. Per the Phase 3
// "truthful, never empty" directive: the full widget — gauge ring, 4-cell
// metadata grid — renders at full visual weight; only the numbers inside are
// marked pending. One ProvenanceBadge in the header states why.

import { RadialGauge } from '@/components/shared/RadialGauge'
import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'

export function ConsensusScoreCard() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Consensus Score</h2>
        <ProvenanceBadge provenance="awaiting" detail="CE-3" />
      </div>

      <div className="p-4 flex flex-col items-center gap-4">
        <RadialGauge value={0} color="var(--probex-text-disabled)" trackColor="var(--probex-border-default)" ariaLabel="Consensus score awaiting backend">
          <AwaitingValue size="xl" />
          <span className="text-xs font-semibold mt-1 uppercase tracking-widest" style={{ color: 'var(--probex-text-muted)' }}>Consensus</span>
        </RadialGauge>

        <div className="grid grid-cols-2 gap-3 w-full">
          <MetaCell label="Signal" />
          <MetaCell label="Confidence" />
          <MetaCell label="Inst. Bias" />
          <MetaCell label="Retail Bias" />
        </div>

        <p className="text-2xs text-center leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
          Platform-wide institutional-grade consensus, aggregated across all signal sources — activates once CE-3 ships.
        </p>
      </div>
    </div>
  )
}

function MetaCell({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-2.5 rounded-lg" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}>
      <span className="text-2xs uppercase tracking-wider font-medium" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <AwaitingValue size="sm" />
    </div>
  )
}
