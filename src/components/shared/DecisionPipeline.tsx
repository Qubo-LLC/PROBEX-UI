'use client'

// DecisionPipeline — the engine's cycle, SCAN → DETECT → FILTER → SIZE →
// EXECUTE, as a mechanism ledger. Extracted from StrategyConsole so Strategy
// and Consensus draw the same cycle; the stage VALUES are computed by the
// callers from the same store slices (see lib/display/mechanism.ts for the
// readings both should use).
//
// ─── Why rows, not tiles ─────────────────────────────────────────────────────
// Five bordered tiles in a grid read as five unrelated statistics. A pipeline
// is a sequence: each stage's number is the INPUT to the next, and the gate
// between them is the rule that shrinks it. Rows with hairlines put the
// stage, its current number and its gate on one line, in order, and let a
// stage carry more than one figure when the mechanism has more than one gate
// (the filter has four thresholds and a pattern filter — one tile could not
// hold that honestly).

import type { ReactNode } from 'react'

export interface PipelineStage {
  step:    number
  name:    string
  /** The stage's current number, already formatted. */
  value:   string
  unit:    string
  /** The rule applied at this stage — the engine's own gate, stated. */
  gate:    string
  /** True for the stage the operator's eye should land on. */
  accent?: boolean
  /** Optional richer content beneath the gate: figures, thresholds, links. */
  detail?: ReactNode
  /** Certainty word for the value: 'derived' marks a number computed on
   *  this screen from two wire values. */
  certainty?: 'confirmed' | 'derived'
}

interface DecisionPipelineProps {
  stages: PipelineStage[]
  /** Optional footnote under the stages (e.g. session-scope disclaimer). */
  note?:  string
}

export function DecisionPipeline({ stages, note }: DecisionPipelineProps) {
  return (
    <div className="flex flex-col">
      <ol className="flex flex-col list-none m-0 p-0" style={{ borderBottom: '1px solid var(--synatra-border)' }}>
        {stages.map((s) => <StageRow key={s.step} {...s} />)}
      </ol>
      {note && <p className="t-metadata mt-2">{note}</p>}
    </div>
  )
}

function StageRow({ step, name, value, unit, gate, accent = false, detail, certainty = 'confirmed' }: PipelineStage) {
  return (
    <li
      className="grid gap-x-6 gap-y-1.5 py-3 pl-2.5 items-baseline"
      style={{
        borderTop: '1px solid var(--synatra-border)',
        borderLeft: `2.5px solid ${accent ? 'var(--synatra-primary)' : 'transparent'}`,
        gridTemplateColumns: 'minmax(0, 1fr)',
      }}
    >
      <div className="grid gap-x-6 gap-y-1 items-baseline sm:grid-cols-[7.5rem_minmax(7rem,10rem)_minmax(0,1fr)]">
        <span className="t-label" style={{ color: accent ? 'var(--synatra-primary)' : undefined }}>
          <span className="font-mono tabular-nums mr-1.5" style={{ color: 'var(--synatra-text-disabled)' }}>{step}</span>
          {name}
        </span>
        <span
          className={`flex items-baseline gap-1.5 ${certainty === 'derived' ? 'c-derived' : ''}`}
          {...(certainty === 'derived' ? { title: 'Derived value — computed on this screen from two wire values' } : {})}
        >
          <span className="t-metric-sm">{value}</span>
          <span className="t-helper">{unit}{certainty === 'derived' ? ' · derived' : ''}</span>
        </span>
        <span className="t-helper">{gate}</span>
      </div>
      {detail !== undefined && <div className="sm:pl-[9rem]">{detail}</div>}
    </li>
  )
}
