'use client'

// DecisionPipeline — the engine's live SCAN → DETECT → FILTER → SIZE → EXECUTE
// cycle, extracted from StrategyConsole (M4) so it can be reused verbatim by
// both the ops lens (Strategy) and the consumer lens (Consensus flagship,
// V3 Phase 3) — one source, two frames, per the implementation blueprint.
// No logic lives here beyond rendering; both callers compute their own stage
// values from the same applicationStore slices.

interface Stage {
  step:    number
  name:    string
  value:   string
  unit:    string
  gate:    string
  accent?: boolean
}

interface DecisionPipelineProps {
  stages: Stage[]
  /** Optional footnote under the stage grid (e.g. session-scope disclaimer). */
  note?:  string
}

export function DecisionPipeline({ stages, note }: DecisionPipelineProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {stages.map((s) => (
          <PipelineStage key={s.step} {...s} />
        ))}
      </div>
      {note && (
        <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>{note}</p>
      )}
    </div>
  )
}

function PipelineStage({ step, name, value, unit, gate, accent = false }: Stage) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg p-3"
      style={{
        background: 'var(--probex-surface-2)',
        border:     `1px solid ${accent ? 'var(--probex-primary)' : 'var(--probex-border)'}`,
      }}
    >
      <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: accent ? 'var(--probex-primary)' : 'var(--probex-text-muted)' }}>
        {step} · {name}
      </span>
      <span className="text-xl font-bold tabular-nums leading-none" style={{ color: 'var(--probex-text-primary)' }}>
        {value}
        <span className="text-2xs font-medium ml-1" style={{ color: 'var(--probex-text-muted)' }}>{unit}</span>
      </span>
      <span className="text-2xs leading-snug" style={{ color: 'var(--probex-text-disabled)' }}>
        {gate}
      </span>
    </div>
  )
}
