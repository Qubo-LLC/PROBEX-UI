'use client'

// StrategyConsole — PROBEX's flagship experience (/strategy).
//
// This page explains HOW THE ENGINE THINKS, not just what its numbers are
// (PROBEX_PRODUCT_SPEC.md §1, §4). It walks the operator through the live
// decision pipeline the bot runs every cycle:
//
//   SCAN → DETECT → FILTER → SIZE → EXECUTE
//
// Every stage shows the real number currently at that stage and the gate
// applied to it. Below the pipeline: the active edges the filter has let
// through, the position-sizing model with the survival brain's live
// adjustment, and the hard limits the engine will not cross.
//
// Truth rules: session-scoped counters are labelled as such; the max-stake
// dollar figure is labelled as derived; unrecognized edge items are reported,
// never guessed at.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEdgeRows } from '@/lib/mappers/edges'
import { formatCurrency } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card }       from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { EdgeTable }  from '@/components/shared/EdgeTable'
import { DecisionPipeline } from '@/components/shared/DecisionPipeline'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

export function StrategyConsole({ embedded = false }: EmbeddableProps = {}) {
  const survival  = useApplicationStore((s) => s.engine.survival)
  const config    = useApplicationStore((s) => s.engine.config)
  const markets   = useApplicationStore((s) => s.engine.markets)
  const edges     = useApplicationStore((s) => s.engine.edges)
  const execution = useApplicationStore((s) => s.engine.executionStatus)

  const sv  = survival.data
  const cfg = config.data
  const ex  = execution.data

  const edgeRows = useMemo(
    () => (edges.data ? parseEdgeRows(edges.data) : null),
    [edges.data],
  )

  // Effective Kelly = configured base fraction × live survival modifier.
  const effectiveKelly = cfg && sv ? cfg.kellyFraction * sv.kellyModifier : null
  // Derived: the engine's current per-position dollar cap.
  const maxStakeUsd = cfg && sv ? sv.currentCapital * (cfg.maxBetPercent / 100) : null

  return (
    // Strategy is the product's flagship INTELLIGENCE surface: it explains what
    // the engine is seeing and deciding. The endpoint that served each reading
    // is lineage, so badges keep their word and move the path to the tooltip and
    // the accessible name — the same treatment as Markets and Analytics. System
    // is the surface that shows paths prominently, and it stays that way.
    <ProvenanceScope detail="tooltip">
    <div className={pageShell(embedded, 'gap-4')}>
      {!embedded && (
        <PageHeader
          title="Strategy"
          subtitle="How the engine makes decisions — the live pipeline from market scan to execution"
          actions={<ProvenanceBadge provenance="live" detail="/api/survival · /api/config" state={survival} />}
        />
      )}

      {survival.status === 'error' && config.status === 'error' && (
        <ErrorState
          title="Strategy layer unavailable"
          description="Neither /api/survival nor /api/config responded — the strategy state cannot be shown."
          fullPage={false}
        />
      )}

      {/* ── The decision pipeline ─────────────────────────────────────── */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="t-card-title">
            Decision Pipeline
          </h3>
          <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
            Counters are session-scoped — they reset when the engine restarts
          </span>
        </div>

        <DecisionPipeline
          stages={[
            { step: 1, name: 'Scan',    value: markets.data ? String(markets.data.count) : '…', unit: markets.data?.count === 1 ? 'market' : 'markets', gate: 'Polymarket 5-minute BTC markets, refreshed each cycle' },
            { step: 2, name: 'Detect',  value: sv ? sv.totalPatterns.toLocaleString() : '…', unit: 'patterns', gate: 'price patterns evaluated against market odds' },
            // The gate is NOT one number — see the Edge Thresholds panel. The
            // live survival threshold is named as the live one rather than as
            // "the" requirement.
            { step: 3, name: 'Filter',  value: sv ? sv.filteredPatterns.toLocaleString() : '…', unit: 'passed', gate: sv ? `live edge threshold ${sv.minEdgeThreshold.toFixed(2)}% — side-specific minimums also apply` : 'edge threshold gate', accent: true },
            { step: 4, name: 'Size',    value: effectiveKelly !== null ? `${effectiveKelly.toFixed(2)}×` : '…', unit: 'Kelly', gate: cfg ? `capped at ${cfg.maxBetPercent}% of bankroll` : 'fractional Kelly sizing' },
            { step: 5, name: 'Execute', value: ex ? String(ex.totalTrades) : '…', unit: ex?.totalTrades === 1 ? 'trade' : 'trades', gate: cfg ? `only if execution < ${cfg.maxLatencyMs}ms` : 'latency-guarded execution' },
          ]}
        />

        {sv && sv.totalPatterns === 0 && (
          <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
            The pattern detector has not evaluated any patterns this session — the
            pipeline is idle until the market fetcher returns candidates.
          </p>
        )}
      </Card>

      {/* ── What made it through: active edges ────────────────────────── */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading
          title="Active Edges"
          {...(edges.data ? { count: edges.data.count } : {})}
          actions={<ProvenanceBadge provenance="live" detail="/api/edges" state={edges} />}
        />
        {edges.status === 'error' ? (
          <ErrorState
            title="Edges unavailable"
            description={edges.error?.message ?? 'The /api/edges endpoint did not respond.'}
            fullPage={false}
          />
        ) : edgeRows ? (
          <EdgeTable
            result={edgeRows}
            emptyTitle="Nothing has cleared the filter"
            emptyDescription={
              sv
                ? `Nothing has cleared the engine's edge thresholds — the live threshold is ${sv.minEdgeThreshold.toFixed(2)}%, with side-specific minimums on top. The engine prefers no trade over a bad trade.`
                : 'The engine prefers no trade over a bad trade.'
            }
          />
        ) : null}
      </section>

      {/* ── Edge thresholds ──────────────────────────────────────────────
          Four real numbers from two endpoints. The engine publishes all four
          and documents none of their interaction, so all four are shown with
          their source, and the gap is stated rather than papered over with an
          invented rule. */}
      {cfg && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="t-card-title">Edge Thresholds</h3>
            <ProvenanceBadge provenance="live" detail="/api/config · /api/survival" state={config} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <ThresholdCell
              label="Live threshold"
              value={sv ? `${sv.minEdgeThreshold.toFixed(2)}%` : '—'}
              source="/api/survival"
              live
            />
            <ThresholdCell label="Base minimum" value={`${cfg.minEdge.toFixed(2)}%`} source="/api/config" />
            <ThresholdCell
              label="YES side"
              value={cfg.minEdgeYes !== null ? `${cfg.minEdgeYes.toFixed(2)}%` : 'not reported'}
              source="/api/config"
              side="yes"
            />
            <ThresholdCell
              label="NO side"
              value={cfg.minEdgeNo !== null ? `${cfg.minEdgeNo.toFixed(2)}%` : 'not reported'}
              source="/api/config"
              side="no"
            />
          </div>

          {/* The asymmetry is the interesting part — it is a deliberate strategy
              choice and the product hid it entirely until now. */}
          {cfg.minEdgeYes !== null && cfg.minEdgeNo !== null && cfg.minEdgeYes !== cfg.minEdgeNo && (
            <p className="text-xs" style={{ color: 'var(--probex-text-secondary)' }}>
              The engine is <strong>asymmetric</strong>: it demands{' '}
              <span className="tabular-nums font-semibold" style={{ color: 'var(--probex-yes)' }}>
                {cfg.minEdgeYes.toFixed(2)}%
              </span>{' '}
              to buy YES but only{' '}
              <span className="tabular-nums font-semibold" style={{ color: 'var(--probex-no)' }}>
                {cfg.minEdgeNo.toFixed(2)}%
              </span>{' '}
              to buy NO — a {Math.abs(cfg.minEdgeYes - cfg.minEdgeNo).toFixed(2)} point difference.
            </p>
          )}

          <p className="text-2xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
            The contract publishes these four values but does not document how they combine — whether the
            live survival threshold overrides the configured pair, floors it, or applies only to the base
            minimum. They are shown as reported rather than resolved into a single figure.
          </p>
        </Card>
      )}

      {/* ── Timing and exit rules ────────────────────────────────────────
          All three are real /api/config fields the product has never shown. Two
          of them are currently inert (no blocked hours, no low-liquidity window)
          — which is itself worth stating on a strategy surface: an operator
          asking "does the engine avoid certain hours?" deserves an answer, and
          "no" is an answer. */}
      {cfg && (cfg.blockedHours !== null || cfg.earlyExitThreshold !== null || cfg.lowLiquidityStartHour !== null) && (
        <Card className="flex flex-col gap-2.5">
          <h3 className="t-card-title">Timing &amp; Exit Rules</h3>
          <div className="flex flex-col gap-2 text-xs">
            {cfg.blockedHours !== null && (
              <LimitRow
                label="Blocked hours"
                value={cfg.blockedHours.length === 0 ? 'none' : cfg.blockedHours.map((h) => `${String(h).padStart(2, '0')}:00`).join(', ')}
                note={cfg.blockedHours.length === 0 ? 'the engine trades around the clock' : 'trading suspended during these hours'}
              />
            )}
            {cfg.lowLiquidityStartHour !== null && cfg.lowLiquidityEndHour !== null && (
              <LimitRow
                label="Low-liquidity window"
                value={
                  cfg.lowLiquidityStartHour === 0 && cfg.lowLiquidityEndHour === 0
                    ? 'not set'
                    : `${String(cfg.lowLiquidityStartHour).padStart(2, '0')}:00–${String(cfg.lowLiquidityEndHour).padStart(2, '0')}:00`
                }
                note={
                  cfg.lowLiquidityStartHour === 0 && cfg.lowLiquidityEndHour === 0
                    ? 'start and end are both 0, so no window is in force'
                    : 'reduced activity during these hours'
                }
              />
            )}
            {cfg.earlyExitThreshold !== null && (
              <LimitRow
                label="Early exit"
                value={cfg.earlyExitThreshold.toFixed(0)}
                note="early_exit_threshold as reported — unit not documented"
              />
            )}
          </div>
        </Card>
      )}

      {/* ── Sizing model + hard limits ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <Card className="flex flex-col gap-3">
          <h3 className="t-card-title">
            Position Sizing Model
          </h3>
          {cfg && sv ? (
            <>
              <div className="flex items-center gap-2 text-sm tabular-nums flex-wrap">
                <SizingTerm label="base Kelly" value={`${cfg.kellyFraction.toFixed(2)}×`} />
                <span style={{ color: 'var(--probex-text-disabled)' }}>×</span>
                <SizingTerm
                  label="survival modifier"
                  value={`${sv.kellyModifier.toFixed(2)}×`}
                  warn={sv.kellyModifier < 1}
                />
                <span style={{ color: 'var(--probex-text-disabled)' }}>=</span>
                <SizingTerm label="effective" value={`${(cfg.kellyFraction * sv.kellyModifier).toFixed(2)}×`} strong />
              </div>
              {maxStakeUsd !== null && (
                <p className="text-xs" style={{ color: 'var(--probex-text-secondary)' }}>
                  Largest possible stake right now:{' '}
                  <span className="font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>
                    {formatCurrency(maxStakeUsd)}
                  </span>{' '}
                  <span style={{ color: 'var(--probex-text-muted)' }}>
                    ({cfg.maxBetPercent}% of {formatCurrency(sv.currentCapital)} capital — derived)
                  </span>
                </p>
              )}
              {/* The modifier is not a one-way brake. Observed live at 1.50×
                  with capital at 149.9% of the starting bankroll — the brain
                  sizing UP. The previous copy described only the downside, so a
                  reader seeing 1.50× had no explanation for it. */}
              <p className="text-2xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
                Each edge’s Kelly-optimal size is scaled by the effective multiplier, then capped.
                The survival brain moves the modifier in both directions: below 1× after losses, so the
                engine bets smaller, and above 1× while capital is ahead.
                {sv.kellyModifier > 1 && ' It is currently above 1×, so sizing is being scaled up.'}
                {sv.kellyModifier < 1 && ' It is currently below 1×, so sizing is being cut back.'}
              </p>
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
              Waiting for /api/config and /api/survival…
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h3 className="t-card-title">
            Hard Limits
          </h3>
          {cfg ? (
            <div className="flex flex-col gap-2 text-xs">
              {/* "Minimum edge" used to live here as a single row reading the
                  live survival threshold with the note "configured floor 2.00%"
                  — i.e. a value below its own floor. Edge thresholds are not one
                  hard limit; they have their own panel below. */}
              <LimitRow label="Max bet"                value={`${cfg.maxBetPercent}%`}          note="of bankroll per position" />
              <LimitRow label="Max concurrent positions" value={String(cfg.maxConcurrentPositions)} note="open at once" />
              <LimitRow label="Max execution latency"  value={`${cfg.maxLatencyMs}ms`}          note="orders abort above this" />
              {cfg.minVolume !== null && (
                <LimitRow label="Minimum market volume" value={cfg.minVolume.toLocaleString()} note="as the engine reports it" />
              )}
              {cfg.edgeConfirmationCount !== null && (
                <LimitRow
                  label="Edge confirmations"
                  value={String(cfg.edgeConfirmationCount)}
                  note={cfg.edgeConfirmationCount === 1 ? 'one detection is enough to act' : 'detections required before acting'}
                />
              )}
              <p className="text-2xs leading-relaxed pt-1" style={{ color: 'var(--probex-text-disabled)' }}>
                These limits are configured at engine start and cannot be changed from
                the dashboard yet (config write endpoint is on the backend roadmap, P1-02).
              </p>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
              Waiting for /api/config…
            </p>
          )}
        </Card>
      </div>
    </div>
    </ProvenanceScope>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * One threshold, with the endpoint that reported it.
 *
 * `side` tints the figure on the MARKET-SIDE band (yes/no) because that is
 * exactly what these two thresholds are about — which side the engine is
 * willing to buy. The live and base cells stay on interface colours: they are
 * not side-specific.
 */
function ThresholdCell({
  label, value, source, live = false, side,
}: { label: string; value: string; source: string; live?: boolean; side?: 'yes' | 'no' }) {
  const colour =
    side === 'yes' ? 'var(--probex-yes)'
    : side === 'no' ? 'var(--probex-no)'
    : live ? 'var(--probex-primary)'
    : 'var(--probex-text-primary)'
  return (
    <div
      className="flex flex-col gap-1 rounded-lg px-3 py-2.5"
      style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}
    >
      <span className="t-label">{label}</span>
      <span className="text-base font-bold tabular-nums" style={{ color: colour }}>{value}</span>
      <span className="flex items-center gap-1.5">
        {/* A word, not only a colour: "live" vs "configured" is the distinction
            this panel exists to draw. */}
        <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: live ? 'var(--probex-primary)' : 'var(--probex-text-disabled)' }}>
          {live ? 'live' : 'configured'}
        </span>
        <span className="t-metadata truncate" title={source}>{source}</span>
      </span>
    </div>
  )
}

function SizingTerm({ label, value, warn = false, strong = false }: { label: string; value: string; warn?: boolean; strong?: boolean }) {
  return (
    <span className="flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}>
      <span
        className={strong ? 'text-base font-bold' : 'text-sm font-semibold'}
        style={{ color: warn ? 'var(--probex-warning)' : strong ? 'var(--probex-primary)' : 'var(--probex-text-primary)' }}
      >
        {value}
      </span>
      <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
    </span>
  )
}

function LimitRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span style={{ color: 'var(--probex-text-secondary)' }}>{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{value}</span>
        <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{note}</span>
      </span>
    </div>
  )
}
