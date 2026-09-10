'use client'

// CommitmentArc — the third arc: what the engine has actually committed, and
// what it has produced.
//
// ─── What this replaces, and what moved where ────────────────────────────────
// EngineStateBand: four bordered Panels (Capital, Exposure, Performance,
// System) in an equal-weight grid. Every figure it carried is preserved or has
// a better home, verified before removal rather than assumed:
//
//   capital balance      → here, as the arc's lead figure
//   open exposure        → here (same selectExposureSource derivation)
//   trades / win rate    → here (same selectPerformanceSource derivation)
//   survival STATE chip  → removed from Overview. It is an interpretation of
//                          capital, not a fact about the market, and it reads
//                          as an alarm when detached from the targets and
//                          runway that explain it. Already rendered on
//                          Survival, on Wallet, and in PortfolioMetrics.
//   daily/weekly targets → already on SurvivalConsole and WalletPage
//   runway, capital %    → already on SurvivalConsole and PortfolioMetrics
//   system panel         → System, which is where an operator goes to ask
//                          whether the machine is healthy
//
// Nothing is lost. Overview stops answering "how healthy is the machine" so it
// can answer "what is happening" completely.
//
// ─── Why no containers ───────────────────────────────────────────────────────
// These three figures are one thought — the engine's position at this moment —
// read left to right in the direction the causality runs: capital it holds,
// what is at risk, what it has produced. Four cards said they were four
// subjects. A row of figures on one rule says they are one.
//
// ─── Cadence ─────────────────────────────────────────────────────────────────
// OPERATIONAL tier (5s). Settled, quiet, no flash. The market arc above is the
// only region on this page licensed to move.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { selectExposureSource } from '@/lib/display/exposureSource'
import { selectPerformanceSource } from '@/lib/display/performanceSource'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'

export function CommitmentArc() {
  const survival  = useApplicationStore((s) => s.engine.survival)
  const positions = useApplicationStore((s) => s.engine.positions)
  const stats     = useApplicationStore((s) => s.engine.stats)
  const execution = useApplicationStore((s) => s.engine.executionStatus)
  const identity  = useApplicationStore((s) => s.engine.identity)
  const paperStats = useApplicationStore((s) => s.engine.paperStats)

  // Both derivations are reused verbatim. They encode provenance decisions that
  // took measured bugs to find — exposure must come from the position ledger
  // rather than /api/stats.active_positions (which is correctly 0 in paper mode
  // and so rendered "Flat" over three open positions), and performance must be
  // attributed to whichever surface the engine's MODE selects.
  const exposure = selectExposureSource({
    positions:       positions.data,
    stats:           stats.data,
    executionStatus: execution.data,
  })

  const performance = selectPerformanceSource({
    engineMode:      identity.data?.mode ?? execution.data?.mode ?? null,
    paperStats:      paperStats.data,
    executionStatus: execution.data,
  })

  const capital = survival.data?.currentCapital ?? null
  const m = performance.metrics
  const isPaperSurface = performance.provenance.surface === 'paper'

  return (
    <section
      aria-labelledby="arc-commitment"
      className="flex flex-col gap-3 py-5"
      style={{ borderBottom: '1px solid var(--probex-border)' }}
    >
      <h2 id="arc-commitment" className="t-label">Committed</h2>

      <div className="flex flex-wrap items-start gap-x-12 gap-y-6">
      {/* ── Capital ────────────────────────────────────────────────────────
          Balance only. No state, no chip, no meter, no target. The question
          Overview answers about capital is "how much", and the interpretation
          of that number belongs where its context lives.

          Register stepped down lg → md. At lg this was a 4xl figure sitting
          BELOW the engine's decision, so the causal arc ended on an account
          balance instead of on what the engine did. The arc now decays
          display → decision → commitment, which is the order the reader should
          finish in. */}
      {capital !== null ? (
        <Figure
          label="Capital"
          size="md"
          title="/api/survival"
          {...certaintyFromSlice(survival, 5_000)}
        >
          {formatCurrency(capital)}
        </Figure>
      ) : (
        <Figure
          label="Capital"
          size="md"
          certainty="absent"
          absentReason="The survival brain has not reported yet"
        />
      )}

      {/* ── Exposure ───────────────────────────────────────────────────────
          What is at risk right now. The unrealized figure rides as a footnote
          rather than as its own metric: it qualifies the exposure, it is not a
          second subject. */}
      {exposure.openPositions !== null ? (
        <Figure
          label="At risk"
          size="md"
          title={exposure.endpoint ?? '/api/positions'}
          // Exposure comes from the position ledger, so its certainty does
          // too — not from stats, which reports a different (and in paper mode
          // correctly zero) number. See lib/display/exposureSource.
          {...certaintyFromSlice(positions, 5_000)}
          footnote={
            exposure.unrealizedPnl !== null
              ? `${formatSignedCurrency(exposure.unrealizedPnl)} unrealized`
              : undefined
          }
        >
          {exposure.openPositions === 0
            ? 'Flat'
            : `${exposure.openPositions} open`}
        </Figure>
      ) : (
        <Figure
          label="At risk"
          size="md"
          certainty="absent"
          absentReason="The position ledger has not resolved"
        />
      )}

      {/* ── Result ─────────────────────────────────────────────────────────
          The provenance label is rendered as the footnote rather than as a
          badge, because with two surfaces (paper and live) reporting different
          totals, WHICH surface this is cannot be optional detail — it changes
          what the number means. That is exactly the kind of qualification the
          certainty scale does not cover and a word must carry. */}
      {m !== null ? (
        <Figure
          label="Result"
          size="md"
          tone={m.totalPnl > 0 ? 'var(--probex-positive)' : m.totalPnl < 0 ? 'var(--probex-negative)' : undefined}
          title={performance.provenance.note}
          // Certainty tracks the surface actually feeding these figures, not
          // whichever slice happens to be handy. Attributing another endpoint's
          // fault to this number would mislead as much as hiding its own.
          {...certaintyFromSlice(isPaperSurface ? paperStats : execution, 5_000)}
          footnote={
            <>
              {performance.provenance.label} · {m.totalTrades} trade{m.totalTrades === 1 ? '' : 's'}
              {m.totalTrades > 0 ? ` · ${formatPercent(m.winRate)} win rate` : ''}
            </>
          }
        >
          {formatSignedCurrency(m.totalPnl)}
        </Figure>
      ) : (
        <Figure
          label="Result"
          size="md"
          certainty="absent"
          absentReason={performance.provenance.note}
        />
      )}
      </div>
    </section>
  )
}
