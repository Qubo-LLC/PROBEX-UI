'use client'

// SurvivalConsole — the capital-protection half of the mechanism.
//
// Operator questions, in order:
//   1. What state is the survival brain in, and what is it doing about it?
//   2. How much capital is there, against what it started with?
//   3. Am I on target?
//   4. What does the engine report about burn, runway and recovery?
//
// Reads /api/survival from ApplicationStore.
//
// ─── What changed (2026-09-16) ───────────────────────────────────────────────
// Six StatCards and three Cards became one posture sentence, a row of Figures
// with their own certainty, the state strip (kept — it is the state machine,
// drawn), the target bars (shared TargetProgress) and a ledger of the fields
// the engine reports as-is. The per-state prose ("sizing sharply reduced,
// only strong edges accepted") was the dashboard describing what it assumed
// the brain does in each state; the wire reports what the brain is doing NOW
// — kelly_modifier and min_edge_threshold — so that is what the page says.
//
// Truth rules kept: daysOfRunway is null when there is no burn — shown as
// "not applicable", never a number; behind_target_pct is the engine's
// "target remaining" (100 = the full target remains); daily_burn_rate,
// avg_win_size and recovery_trades_needed are shown as reported, with their
// source, because other endpoints disagree with them (see project memory on
// the three accounting surfaces) and this page does not adjudicate.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { formatEdgePct, survivalStateColor, survivalStateLabel, SURVIVAL_STATES } from '@/lib/display/engine'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { PageHeader }     from '@/components/ui/PageHeader'
import { ErrorState }     from '@/components/ui/ErrorState'
import { TargetProgress } from '@/components/shared/TargetProgress'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

/** /api/survival polls at MEDIUM cadence (ApplicationStateLoader). */
const SURVIVAL_POLL_MS = 5_000

export function SurvivalConsole({ embedded = false }: EmbeddableProps = {}) {
  const slice = useApplicationStore((s) => s.engine.survival)
  const sv    = slice.data
  const cert  = certaintyFromSlice(slice, SURVIVAL_POLL_MS)

  return (
    <div className={pageShell(embedded, 'gap-5')}>
      {!embedded && (
        <PageHeader
          title="Survival"
          subtitle="Capital protection — the state the brain is in, and how it is sizing in response"
        />
      )}

      {slice.status === 'error' && !sv && (
        <ErrorState
          title="The survival brain did not answer"
          description={slice.error?.message ?? 'No response from /api/survival.'}
          fullPage={false}
        />
      )}

      {!sv && slice.status !== 'error' && (
        <p className="t-description">Waiting for /api/survival.</p>
      )}

      {sv && (
        <>
          {/* ── A · posture ────────────────────────────────────────────── */}
          <section aria-labelledby="sv-posture" className="flex flex-col gap-3">
            <h2 id="sv-posture" className="sr-only">Survival posture</h2>
            <p className="text-sm font-medium leading-relaxed m-0" style={{ color: 'var(--probex-text-primary)' }}>
              <span style={{ color: survivalStateColor(sv.state) }}>{survivalStateLabel(sv.state)}</span>
              {' — capital '}{formatCurrency(sv.currentCapital)}{', '}{sv.capitalPct.toFixed(1)}% of the {formatCurrency(sv.initialCapital)} it started with.
              {' '}The brain is {sv.kellyModifier > 1 ? 'sizing up' : sv.kellyModifier < 1 ? 'cutting size' : 'at full size'} (×{sv.kellyModifier.toFixed(2)}) and requires {formatEdgePct(sv.minEdgeThreshold, 2)} of edge.
              {cert.certainty === 'stale' && <span style={{ color: 'var(--probex-warning)' }}> Retained — last updated {cert.staleFor}.</span>}
            </p>

            {/* The state machine, drawn. Every known state, the current one
                lit; an unrecognised state is appended so it can never be
                invisible on its own page. */}
            <StateStrip state={sv.state} />
          </section>

          {/* ── B · the figures ───────────────────────────────────────────── */}
          <section aria-labelledby="sv-figures" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--probex-border)' }}>
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <span className="flex items-baseline gap-2 flex-wrap">
                <h2 id="sv-figures" className="t-section-title">Capital and response</h2>
                <span className="t-description">what the brain has and what it is doing with it</span>
              </span>
              <span className="t-metadata">/api/survival</span>
            </div>
            <div className="flex items-start gap-x-8 gap-y-3 flex-wrap">
              <Figure label="Capital" size="lg" footnote={<span className="t-helper">{sv.capitalPct.toFixed(1)}% of {formatCurrency(sv.initialCapital)} initial</span>} {...cert}>
                {formatCurrency(sv.currentCapital)}
              </Figure>
              <Figure label="Kelly modifier" size="md" tone={sv.kellyModifier < 1 ? 'var(--probex-warning)' : undefined} footnote={<span className="t-helper">{sv.kellyModifier > 1 ? 'above 1× — sizing up while ahead' : sv.kellyModifier < 1 ? 'below 1× — sizing cut back' : 'full sizing'}</span>} {...cert}>
                ×{sv.kellyModifier.toFixed(2)}
              </Figure>
              <Figure label="Edge required" size="md" footnote={<span className="t-helper">live threshold the filter applies</span>} {...cert}>
                {formatEdgePct(sv.minEdgeThreshold, 2)}
              </Figure>
              <Figure label="Today" size="md" tone={sv.dailyPnl > 0 ? 'var(--probex-positive)' : sv.dailyPnl < 0 ? 'var(--probex-negative)' : undefined} footnote={<span className="t-helper">target {formatCurrency(sv.dailyTarget)} · {formatPercent(sv.behindTargetPct / 100)} remaining</span>} {...cert}>
                {formatSignedCurrency(sv.dailyPnl)}
              </Figure>
              <Figure label="This week" size="md" tone={sv.weeklyPnl > 0 ? 'var(--probex-positive)' : sv.weeklyPnl < 0 ? 'var(--probex-negative)' : undefined} footnote={<span className="t-helper">target {formatCurrency(sv.weeklyTarget)}</span>} {...cert}>
                {formatSignedCurrency(sv.weeklyPnl)}
              </Figure>
            </div>
          </section>

          {/* ── C · targets ───────────────────────────────────────────────── */}
          <TargetProgress capital={{
            dailyPnl:     sv.dailyPnl,
            dailyTarget:  sv.dailyTarget,
            weeklyPnl:    sv.weeklyPnl,
            weeklyTarget: sv.weeklyTarget,
          }} />

          {/* ── D · as reported ───────────────────────────────────────────── */}
          <section aria-labelledby="sv-reported" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--probex-border)' }}>
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <span className="flex items-baseline gap-2 flex-wrap">
                <h2 id="sv-reported" className="t-section-title">Burn, runway and recovery</h2>
                <span className="t-description">the brain’s own figures, shown as reported — other endpoints account differently and this page does not reconcile them</span>
              </span>
              <span className="t-metadata">/api/survival</span>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2 m-0">
              <Reported label="Daily burn rate" value={formatCurrency(sv.dailyBurnRate)} note="daily_burn_rate" />
              <Reported label="Runway" value={sv.daysOfRunway !== null ? `${Math.floor(sv.daysOfRunway)}d` : 'not applicable'} note={sv.daysOfRunway !== null ? 'days_of_runway at this burn' : 'days_of_runway is null'} />
              <Reported label="Recovery trades" value={String(sv.recoveryTradesNeeded)} note={sv.recoveryTradesNeeded > 0 ? 'wins needed to recover' : 'nothing to recover'} />
              <Reported label="Avg win size" value={sv.avgWinSize > 0 ? formatCurrency(sv.avgWinSize) : '0'} note="avg_win_size" />
            </dl>
          </section>
        </>
      )}
    </div>
  )
}

function StateStrip({ state }: { state: string }) {
  const active = String(state).toUpperCase()
  const tiles: readonly string[] = SURVIVAL_STATES.includes(active as typeof SURVIVAL_STATES[number])
    ? SURVIVAL_STATES
    : [...SURVIVAL_STATES, active]
  return (
    <ol className="flex items-center gap-1 flex-wrap list-none m-0 p-0" aria-label="Survival state machine">
      {tiles.map((s) => {
        const isCurrent = s === active
        return (
          <li
            key={s}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 whitespace-nowrap"
            style={{
              background: isCurrent ? `color-mix(in srgb, ${survivalStateColor(s)} 12%, transparent)` : 'transparent',
              opacity: isCurrent ? 1 : 0.45,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: survivalStateColor(s) }} aria-hidden="true" />
            <span className="t-label" style={{ color: isCurrent ? survivalStateColor(s) : undefined }}>{survivalStateLabel(s)}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Reported({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="t-label truncate">{label}</dt>
      <dd className="m-0 flex flex-col min-w-0">
        <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{value}</span>
        <span className="t-metadata truncate">{note}</span>
      </dd>
    </div>
  )
}
