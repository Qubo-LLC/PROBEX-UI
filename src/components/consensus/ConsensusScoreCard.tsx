'use client'

// ConsensusScoreCard — platform-wide consensus gauge, distinct from the
// per-market EdgeStrengthGauge above it. Originally built as CE-3 (no
// backend) with a fabricated "institutional-grade consensus" framing.
//
// 2026-07-22: /api/consensus and /api/consensus/bias are both live. The real
// backend concept differs from V1's fiction — it's not institutional-vs-retail
// volume, it's a multi-signal composite (edge direction/confidence, RSI
// momentum, MACD trend, price momentum) plus a YES/NO directional bias across
// currently-detected edges. Same gauge + 4-cell shell, now fed by the real
// thing the backend actually measures.

import { useApplicationStore } from '@/store/applicationStore'
import { RadialGauge } from '@/components/shared/RadialGauge'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { formatPercent } from '@/lib/utils'

export function ConsensusScoreCard() {
  const consensusSlice = useApplicationStore((s) => s.engine.consensus)
  const biasSlice      = useApplicationStore((s) => s.engine.consensusBias)
  const c = consensusSlice.status === 'success' ? consensusSlice.data : null
  const b = biasSlice.status === 'success' ? biasSlice.data : null

  const score = c?.score ?? 0
  const color = !c || Math.abs(score) < 0.05
    ? 'var(--probex-text-muted)'
    : score > 0 ? 'var(--probex-yes)' : 'var(--probex-no)'

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Consensus Score</h2>
        <ProvenanceBadge provenance="live" detail="/api/consensus" />
      </div>

      <div className="p-4 flex flex-col items-center gap-4">
        <RadialGauge
          value={c ? (score + 1) / 2 : 0}
          color={color}
          trackColor="var(--probex-border-default)"
          ariaLabel={c ? `Consensus score ${score.toFixed(2)}, ${c.interpretation}` : 'Consensus score loading'}
        >
          <span className="text-3xl font-black tabular-nums leading-none" style={{ color }}>
            {c ? score.toFixed(2) : '—'}
          </span>
          <span className="text-xs font-semibold mt-1 uppercase tracking-widest" style={{ color: 'var(--probex-text-muted)' }}>
            {c?.interpretation ?? 'Consensus'}
          </span>
        </RadialGauge>

        <div className="grid grid-cols-2 gap-3 w-full">
          <MetaCell label="Signals" value={c ? String(c.signalCount) : '—'} />
          <MetaCell label="Confidence" value={c ? formatPercent(c.confidence) : '—'} />
          <MetaCell label="YES Bias" value={b ? formatPercent(b.bias.yesPercent / 100) : '—'} />
          <MetaCell label="NO Bias" value={b ? formatPercent(b.bias.noPercent / 100) : '—'} />
        </div>

        <p className="text-2xs text-center leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
          Composite of edge direction, RSI momentum, MACD trend, and price momentum, aggregated platform-wide.
        </p>
      </div>
    </div>
  )
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-2.5 rounded-lg" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}>
      <span className="text-2xs uppercase tracking-wider font-medium" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{value}</span>
    </div>
  )
}
