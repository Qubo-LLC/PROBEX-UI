'use client'

// StrategyConsole — PROBEX's flagship experience (/dashboard/strategy).
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

export function StrategyConsole() {
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
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader
        title="Strategy"
        subtitle="How the engine thinks — the live decision pipeline from market scan to execution"
      />

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
          <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
            Decision Pipeline
          </h3>
          <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
            Counters are session-scoped — they reset when the engine restarts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <PipelineStage
            step={1}
            name="Scan"
            value={markets.data ? String(markets.data.count) : '…'}
            unit={markets.data?.count === 1 ? 'market' : 'markets'}
            gate="Polymarket 5-minute BTC markets, refreshed each cycle"
          />
          <PipelineStage
            step={2}
            name="Detect"
            value={sv ? sv.totalPatterns.toLocaleString() : '…'}
            unit="patterns"
            gate="price patterns evaluated against market odds"
          />
          <PipelineStage
            step={3}
            name="Filter"
            value={sv ? sv.filteredPatterns.toLocaleString() : '…'}
            unit="passed"
            gate={sv ? `edge must exceed ${sv.minEdgeThreshold.toFixed(2)}%` : 'edge threshold gate'}
            accent
          />
          <PipelineStage
            step={4}
            name="Size"
            value={effectiveKelly !== null ? `${effectiveKelly.toFixed(2)}×` : '…'}
            unit="Kelly"
            gate={cfg ? `capped at ${cfg.maxBetPercent}% of bankroll` : 'fractional Kelly sizing'}
          />
          <PipelineStage
            step={5}
            name="Execute"
            value={ex ? String(ex.totalTrades) : '…'}
            unit={ex?.totalTrades === 1 ? 'trade' : 'trades'}
            gate={cfg ? `only if execution < ${cfg.maxLatencyMs}ms` : 'latency-guarded execution'}
          />
        </div>

        {sv && sv.totalPatterns === 0 && (
          <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
            The pattern detector has not evaluated any patterns this session — the
            pipeline is idle until the market fetcher returns candidates.
          </p>
        )}
      </Card>

      {/* ── What made it through: active edges ────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>
          Active Edges
          {edges.data && edges.data.count > 0 ? ` (${edges.data.count})` : ''}
        </h2>
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
                ? `Every evaluated pattern is currently below the ${sv.minEdgeThreshold.toFixed(2)}% edge threshold. The engine prefers no trade over a bad trade.`
                : 'The engine prefers no trade over a bad trade.'
            }
          />
        ) : null}
      </section>

      {/* ── Sizing model + hard limits ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <Card className="flex flex-col gap-3">
          <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
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
              <p className="text-2xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
                Each edge’s Kelly-optimal size is scaled by the effective multiplier,
                then capped. When capital declines, the survival brain lowers the
                modifier — the engine automatically bets smaller after losses.
              </p>
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
              Waiting for /api/config and /api/survival…
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
            Hard Limits
          </h3>
          {cfg ? (
            <div className="flex flex-col gap-2 text-xs">
              <LimitRow
                label="Minimum edge"
                value={sv ? `${sv.minEdgeThreshold.toFixed(2)}%` : `${cfg.minEdge.toFixed(2)}%`}
                note={
                  sv && sv.minEdgeThreshold !== cfg.minEdge
                    ? `survival-adjusted (configured floor ${cfg.minEdge.toFixed(2)}%)`
                    : 'configured floor'
                }
              />
              <LimitRow label="Max bet"                value={`${cfg.maxBetPercent}%`}          note="of bankroll per position" />
              <LimitRow label="Max concurrent positions" value={String(cfg.maxConcurrentPositions)} note="open at once" />
              <LimitRow label="Max execution latency"  value={`${cfg.maxLatencyMs}ms`}          note="orders abort above this" />
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
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PipelineStage({
  step, name, value, unit, gate, accent = false,
}: {
  step: number; name: string; value: string; unit: string; gate: string; accent?: boolean
}) {
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
