'use client'

// CapitalBookGroup — the fourth movement of the causal arc: what the current
// engine state means for the book.
//
// ─── Why this replaced CommitmentArc, and why the name matters ───────────────
// The previous version was called "Committed", which is a claim, and often a
// false one. When the engine is HOLDING — the common case — nothing has been
// committed at all, so a heading reading "Committed" above a capital balance
// implied capital had been deployed on a decision the engine explicitly
// declined to make. The engine's decision stays the arc's climax in
// PerceptionArc; this group answers the question that follows it: what does
// that state mean for the book right now?
//
// ─── Why this one is contained when the arcs above are not ───────────────────
// Money is a different subject from the market and from the decision. The three
// arcs above are one causal sentence and share a surface; this is its financial
// consequence and earns a boundary — a semantic one, which is the only kind
// that justifies a container.
//
// ONE container, though, not fifteen. The information inside is organised by
// rules, spacing and typographic weight — the same row grammar the old panels
// used internally (Focal / Row / RowGroup / Meter), reused rather than rebuilt.
// What is deliberately NOT recreated is the old four-Panel grid: four bordered
// surfaces, each with its own header and its own provenance badge, saying
// "these are four subjects" about what is really one.
//
// ─── Why the density could come back safely ──────────────────────────────────
// The old panels each needed a provenance badge because truth lived in the
// container. It now lives on the figure (see shared/Figure and the certainty
// scale), so ~15 values can sit here carrying their own individual staleness
// without reintroducing a wall of badges. That is what makes restoration
// different from reversion.
//
// ─── What is deliberately NOT here ───────────────────────────────────────────
// Avg fill time and the rate-limit/backoff condition. Both are real and both
// were on the old Overview, but they are execution-quality telemetry and they
// have proper operational context on the Execution console. Overview summarises
// the other domains; it does not become a second Execution page.
//
// Min edge threshold is also absent, and deliberately: it already reads in
// PerceptionArc as "Threshold", where it explains the decision. Repeating it
// here would be duplication, not depth.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { selectExposureSource } from '@/lib/display/exposureSource'
import { selectPerformanceSource } from '@/lib/display/performanceSource'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { Row, RowGroup, Meter } from '@/components/ui/Panel'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function CapitalBookGroup() {
  const survival   = useApplicationStore((s) => s.engine.survival)
  const positions  = useApplicationStore((s) => s.engine.positions)
  const stats      = useApplicationStore((s) => s.engine.stats)
  const execution  = useApplicationStore((s) => s.engine.executionStatus)
  const identity   = useApplicationStore((s) => s.engine.identity)
  const paperStats = useApplicationStore((s) => s.engine.paperStats)
  const policy     = useApplicationStore((s) => s.engine.executionPolicy)

  // Both derivations are reused verbatim. They encode provenance decisions that
  // took measured bugs to find — exposure must come from the position ledger
  // rather than /api/stats.active_positions (correctly 0 in paper mode, which
  // once rendered "Flat" over three open positions), and performance must be
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

  const d = survival.data
  const m = performance.metrics
  const isPaperSurface = performance.provenance.surface === 'paper'
  const perfSlice = isPaperSurface ? paperStats : execution

  const maxPositions = policy.data?.riskLimits.maxConcurrentPositions ?? null

  return (
    <section
      aria-labelledby="arc-book"
      className="rounded-lg px-5 py-4 mt-5"
      style={{
        background: 'var(--probex-surface)',
        border: '1px solid var(--probex-border)',
      }}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
        <h2 id="arc-book" className="t-section-title">Capital &amp; book</h2>
        {/* A sentence, so it takes the explanatory register — it was set as
            t-metadata, the register for endpoint paths and timestamps, which
            is why it read as a stray technical string beside the heading. */}
        <span className="t-description">What the current engine state means for the account</span>
      </div>

      {/* Three columns, one subject each, separated by rules rather than by
          borders. At the top of each column sits the figure that answers it;
          beneath, the context that makes that figure mean something. The old
          layout gave each of these its own card header, badge and padding —
          roughly 40% of the space went to the containers rather than the
          content. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 md:divide-x" style={{ borderColor: 'var(--probex-border)' }}>

        {/* ── CAPITAL ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 min-w-0 md:pr-8">
          {d !== null ? (
            <>
              <Figure
                label="Capital"
                size="md"
                title="/api/survival"
                {...certaintyFromSlice(survival, 5_000)}
                footnote={`of ${formatCurrency(d.initialCapital)} initial · ${d.capitalPct.toFixed(1)}%`}
              >
                {formatCurrency(d.currentCapital)}
              </Figure>

              <Meter
                value={clamp01(d.capitalPct / 100)}
                color="var(--probex-primary)"
                ariaLabel="Capital remaining against initial"
              />

              {/* The target rows are the most useful thing the old Capital
                  panel carried and the clearest loss when it was removed: they
                  are the only place the product says how the day is going
                  against the engine's own goal. Recovered from 4ace3902 with
                  their progress logic intact. */}
              <RowGroup>
                <TargetRow label="Daily"  pnl={d.dailyPnl}  target={d.dailyTarget} />
                <TargetRow label="Weekly" pnl={d.weeklyPnl} target={d.weeklyTarget} />
                <Row
                  label="Runway"
                  value={d.daysOfRunway === null ? 'No burn' : `${d.daysOfRunway.toFixed(1)}d`}
                  title={
                    d.daysOfRunway === null
                      ? 'Burn rate is zero — the engine is not losing capital'
                      : `At the current daily burn rate of ${formatCurrency(d.dailyBurnRate)}`
                  }
                />
                {/* Kelly reads naturally here rather than with exposure: it is
                    the survival brain's response to the capital state above it,
                    so the cause and the consequence sit together. */}
                <Row
                  label="Kelly modifier"
                  value={`${d.kellyModifier.toFixed(2)}×`}
                  title="The survival brain's current scaling factor on Kelly position sizing, set from the capital state above"
                />
              </RowGroup>
            </>
          ) : (
            <Figure
              label="Capital"
              size="md"
              certainty="absent"
              absentReason="The survival brain has not reported yet"
            />
          )}
        </div>

        {/* ── EXPOSURE ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 min-w-0 md:px-8">
          {exposure.openPositions !== null ? (
            <>
              <Figure
                label="At risk"
                size="md"
                title={exposure.endpoint ?? '/api/positions'}
                {...certaintyFromSlice(positions, 5_000)}
                // The limit is what makes the count interpretable. "2 open" says
                // nothing on its own; "2 of 10" says the engine has room.
                footnote={
                  maxPositions !== null
                    ? `of ${maxPositions} concurrent maximum`
                    : 'position limit not reported'
                }
              >
                {exposure.openPositions === 0 ? 'Flat' : `${exposure.openPositions} open`}
              </Figure>

              {maxPositions !== null && maxPositions > 0 && (
                <Meter
                  value={clamp01(exposure.openPositions / maxPositions)}
                  color={
                    exposure.openPositions >= maxPositions
                      ? 'var(--probex-warning)'
                      : 'var(--probex-primary)'
                  }
                  ariaLabel="Open positions against the concurrent maximum"
                />
              )}

              <RowGroup>
                <Row
                  label="Unrealized"
                  value={
                    exposure.unrealizedPnl !== null
                      ? formatSignedCurrency(exposure.unrealizedPnl)
                      : '—'
                  }
                  color={
                    exposure.unrealizedPnl === null ? undefined
                      : exposure.unrealizedPnl > 0 ? 'var(--probex-positive)'
                      : exposure.unrealizedPnl < 0 ? 'var(--probex-negative)'
                      : undefined
                  }
                  title="Aggregate unrealized P&L across open positions, from the same envelope as the count so the two cannot disagree"
                />
                {/* Positions the real-order executor holds, kept separate. In
                    paper mode this is 0 and that is correct and worth showing
                    — it is simply not the exposure figure. Named for the
                    subsystem, not "live": the executor exists in paper mode. */}
                {exposure.liveExecutionPositions !== null && (
                  <Row
                    label="Executor positions"
                    value={String(exposure.liveExecutionPositions)}
                    title="Positions held by the real-order execution subsystem — distinct from the ledger exposure above; 0 in paper mode"
                  />
                )}
              </RowGroup>
            </>
          ) : (
            <Figure
              label="At risk"
              size="md"
              certainty="absent"
              absentReason="The position ledger has not resolved"
            />
          )}
        </div>

        {/* ── PERFORMANCE ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 min-w-0 md:pl-8">
          {m !== null ? (
            <>
              <Figure
                label="Result"
                size="md"
                tone={
                  m.totalPnl > 0 ? 'var(--probex-positive)'
                  : m.totalPnl < 0 ? 'var(--probex-negative)'
                  : undefined
                }
                title={performance.provenance.note}
                // Certainty tracks the surface actually feeding these figures,
                // not whichever slice happens to be handy.
                {...certaintyFromSlice(perfSlice, 5_000)}
                // WHICH surface this is cannot be optional detail: paper and
                // live report different totals, so the label changes what the
                // number means. That is a qualification a word must carry — the
                // certainty scale does not cover it.
                footnote={performance.provenance.label}
              >
                {formatSignedCurrency(m.totalPnl)}
              </Figure>

              <RowGroup>
                <Row label="Trades" value={m.totalTrades.toLocaleString()} />
                <Row
                  label="Win rate"
                  value={m.totalTrades > 0 ? formatPercent(m.winRate) : '—'}
                  title={
                    m.totalTrades > 0
                      ? `${m.wins} won · ${m.losses} lost`
                      : 'No settled trades on this surface yet'
                  }
                />
                {m.pending !== null && (
                  <Row
                    label="Pending"
                    value={String(m.pending)}
                    title="Trades opened but not yet resolved"
                  />
                )}
              </RowGroup>
            </>
          ) : (
            <Figure
              label="Result"
              size="md"
              certainty="absent"
              absentReason={performance.provenance.note}
            />
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * A target as one line: name, progress against it, and the pair of figures.
 *
 * Recovered from the old Capital panel (4ace3902) with its logic unchanged —
 * it was correct, and the reason it disappeared was that its container did,
 * not that anything was wrong with it.
 */
function TargetRow({ label, pnl, target }: { label: string; pnl: number; target: number }) {
  const hasTarget = target > 0
  const ratio = hasTarget ? pnl / target : 0
  const met = hasTarget && pnl >= target
  const color = pnl < 0 ? 'var(--probex-negative)' : met ? 'var(--probex-positive)' : 'var(--probex-primary)'

  return (
    <Meter
      value={clamp01(ratio)}
      color={color}
      ariaLabel={`${label} target progress`}
      label={
        <Row
          label={label}
          color={color}
          value={
            <>
              {formatSignedCurrency(pnl)}
              <span style={{ color: 'var(--probex-text-disabled)', fontWeight: 400 }}>
                {' / '}
                {hasTarget ? formatCurrency(target) : '—'}
              </span>
              {met && <span style={{ color: 'var(--probex-positive)' }}> ✓</span>}
            </>
          }
        />
      }
    />
  )
}
