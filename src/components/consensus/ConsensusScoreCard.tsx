'use client'

// ConsensusScoreCard — platform-wide consensus gauge from /api/consensus and
// /api/consensus/bias: a multi-signal composite score plus YES/NO edge bias.

import { useApplicationStore } from '@/store/applicationStore'
import { RadialGauge } from '@/components/shared/RadialGauge'
import { Panel } from '@/components/ui/Panel'
import { formatPercent } from '@/lib/utils'

export function ConsensusScoreCard() {
  const consensusSlice = useApplicationStore((s) => s.engine.consensus)
  const biasSlice      = useApplicationStore((s) => s.engine.consensusBias)
  const cEnvelope = consensusSlice.status === 'success' ? consensusSlice.data : null
  const bEnvelope = biasSlice.status === 'success' ? biasSlice.data : null

  // `reading`/`detail` are null exactly when the engine says it has nothing
  // computed. That is NOT the same as a zero score, so no `?? 0` here.
  const c = cEnvelope?.reading ?? null
  const b = bEnvelope?.detail ?? null

  const score = c?.score ?? null
  const color = score === null || Math.abs(score) < 0.05
    ? 'var(--probex-text-muted)'
    : score > 0 ? 'var(--probex-yes)' : 'var(--probex-no)'

  // Distinguish "engine answered, nothing computed yet" from "still loading" /
  // "request failed". Only the first has an engine-supplied reason to show.
  const notComputed = cEnvelope !== null && cEnvelope.reading === null

  return (
    // Canonical data surface. Was a hand-rolled `rounded-lg overflow-hidden`
    // container with its own header rule and its own uppercase title — one of
    // five components repeating that exact shape. Panel supplies the surface,
    // the title at the type scale's own weight, and the provenance slot, so the
    // lineage badge sits where it does on every other instrument.
    // Only claim "live" once a real reading exists: an endpoint that answered
    // "nothing computed yet" has not produced live data.
    <Panel
      title="Consensus Score"
      provenance={c ? 'live' : 'idle'}
      source="/api/consensus"
      slice={consensusSlice}
      state={c ? 'live' : 'idle'}
      // The composite score moving is a real engine event worth marking once.
      {...(c ? { updateKey: c.score } : {})}
    >
      <div className="flex flex-col items-center gap-4">
        <RadialGauge
          value={score === null ? 0 : (score + 1) / 2}
          color={color}
          trackColor="var(--probex-border-default)"
          ariaLabel={c ? `Consensus score ${c.score.toFixed(2)}, ${c.interpretation}` : 'Consensus score not yet computed'}
        >
          <span className="text-3xl font-black tabular-nums leading-none" style={{ color }}>
            {score === null ? '—' : score.toFixed(2)}
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
          {notComputed
            ? cEnvelope.message ?? 'The engine has not calculated a consensus yet.'
            : 'Composite of edge direction, RSI momentum, MACD trend, and price momentum, aggregated platform-wide.'}
        </p>
      </div>
    </Panel>
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
