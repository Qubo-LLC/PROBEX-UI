'use client'

// MechanismCycle — the engine's SCAN → DETECT → FILTER → SIZE → EXECUTE cycle
// with the number at each stage now, read from the store.
//
// One component, two hosts: Strategy (its "The cycle" section) and Consensus
// (which used to keep a private copy of the stage list, computed the same
// wrong way — filtered_patterns as "passed", the real-order counter as
// "executed" in paper mode). The readings come from lib/display/mechanism.ts
// so both hosts show the same cycle by construction.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEdgeRows } from '@/lib/mappers/edges'
import { formatEdgePct } from '@/lib/display/engine'
import { sizingReading, executionReading, patternFilterReading, processCounters } from '@/lib/display/mechanism'
import { formatCurrency } from '@/lib/utils'
import { DecisionPipeline, type PipelineStage } from '@/components/shared/DecisionPipeline'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'
import type { EngineConfig, SurvivalStatus } from '@/types/engine'
import { DETECTOR_THRESHOLD_UNREPORTED } from '@/lib/display/thresholds'

export function MechanismCycle({ heading = true }: { heading?: boolean }) {
  const survival  = useApplicationStore((s) => s.engine.survival)
  const config    = useApplicationStore((s) => s.engine.config)
  const markets   = useApplicationStore((s) => s.engine.markets)
  const edges     = useApplicationStore((s) => s.engine.edges)
  const stats     = useApplicationStore((s) => s.engine.stats)
  const execution = useApplicationStore((s) => s.engine.executionStatus)
  const paper     = useApplicationStore((s) => s.engine.paperStats)

  const sv  = survival.data
  const cfg = config.data
  const edgeRows = useMemo(() => (edges.data ? parseEdgeRows(edges.data) : null), [edges.data])
  const edgesNow = edgeRows?.kind === 'rows' ? edgeRows.rows.length : edgeRows?.kind === 'empty' ? 0 : null
  const mode = cfg?.environment ?? execution.data?.mode ?? null

  const stages = buildStages({
    marketsScanned: markets.data?.count ?? null,
    edgesNow,
    sv, cfg,
    sizing:   sizingReading(cfg, sv),
    counters: processCounters(stats.data),
    executed: executionReading(mode, paper.data?.paperTrading ?? null, execution.data),
    patterns: patternFilterReading(sv),
  })

  return (
    <section aria-labelledby="st-cycle" className="flex flex-col gap-3">
      {heading && (
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 flex-wrap">
            <h2 id="st-cycle" className="t-section-title">The cycle</h2>
            <span className="t-description">scan → detect → filter → size → execute, with the number at each stage now</span>
            <Popover label="About the cycle" trigger={(p) => <InfoButton what="the cycle" {...p} />}>
              <PopoverTitle>What is and is not on the wire</PopoverTitle>
              <PopoverText>
                Each stage shows a value the engine reports and the rule it reports alongside.
                The engine does not publish a decision log: which candidate was rejected by
                which gate, or which edge produced which trade, is not recorded anywhere the
                dashboard can read. Nothing here infers it.
              </PopoverText>
              <PopoverText>
                The contract names three edge thresholds (base, YES, NO) and a live survival
                threshold but does not document how they combine. They are shown as reported.
              </PopoverText>
            </Popover>
          </span>
          <span className="t-metadata">/api/markets · /api/edges · /api/survival · /api/config · /api/paper-stats</span>
        </div>
      )}
      <DecisionPipeline stages={stages} />
    </section>
  )
}

// ─── The stages ───────────────────────────────────────────────────────────────

export function buildStages(input: {
  marketsScanned: number | null
  edgesNow: number | null
  sv: SurvivalStatus | null
  cfg: EngineConfig | null
  sizing: ReturnType<typeof sizingReading>
  counters: ReturnType<typeof processCounters>
  executed: ReturnType<typeof executionReading>
  patterns: ReturnType<typeof patternFilterReading>
}): PipelineStage[] {
  const { marketsScanned, edgesNow, sv, cfg, sizing, counters, executed, patterns } = input
  const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString())

  const thresholds: Array<[string, string]> = []
  if (sv) thresholds.push(['survival brain floor', formatEdgePct(sv.minEdgeThreshold, 2)])
  if (cfg) {
    thresholds.push(['configured min_edge', formatEdgePct(cfg.minEdge, 2)])
    if (cfg.minEdgeYes !== null) thresholds.push(['YES side', formatEdgePct(cfg.minEdgeYes, 2)])
    if (cfg.minEdgeNo !== null) thresholds.push(['NO side', formatEdgePct(cfg.minEdgeNo, 2)])
    if (cfg.minVolume !== null) thresholds.push(['min volume', cfg.minVolume.toLocaleString()])
    if (cfg.minAlignment !== null) thresholds.push(['min alignment', `${cfg.minAlignment} (unit undocumented)`])
    if (cfg.edgeConfirmationCount !== null) thresholds.push(['confirmations', String(cfg.edgeConfirmationCount)])
  }

  return [
    {
      step: 1, name: 'Scan',
      value: fmt(marketsScanned), unit: marketsScanned === 1 ? 'market now' : 'markets now',
      gate: 'Polymarket Up-or-Down windows the fetcher returned this cycle',
    },
    {
      step: 2, name: 'Detect',
      value: fmt(edgesNow), unit: edgesNow === 1 ? 'edge now' : 'edges now',
      gate: 'the detector prices each window and reports an edge, its direction, confidence and the RSI / MACD / alignment it read',
      detail: counters ? (
        <span className="t-metadata">{counters.edgesDetected.toLocaleString()} detected in total · engine counter · /api/stats</span>
      ) : undefined,
    },
    {
      step: 3, name: 'Filter', accent: true,
      value: sv ? formatEdgePct(sv.minEdgeThreshold, 2) : '—', unit: 'survival floor',
      gate: `the survival brain’s floor, the configured minimums, and the pattern filter — how these combine is not documented, and ${DETECTOR_THRESHOLD_UNREPORTED}`,
      detail: (
        <div className="flex flex-col gap-1.5">
          {thresholds.length > 0 && (
            <dl className="flex items-baseline gap-x-4 gap-y-1 flex-wrap m-0">
              {thresholds.map(([label, value]) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <dt className="t-label">{label}</dt>
                  <dd className="m-0 font-mono text-xs tabular-nums" style={{ color: 'var(--synatra-text-secondary)' }}>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {patterns && (
            <span className="t-helper">
              Pattern filter: {patterns.tracked} pattern{patterns.tracked === 1 ? '' : 's'} tracked, {patterns.stopped} stopped by the brain
            </span>
          )}
        </div>
      ),
    },
    {
      step: 4, name: 'Size',
      value: sizing ? `${sizing.effectiveKelly.toFixed(2)}×` : '—', unit: 'Kelly',
      certainty: 'derived',
      gate: sizing
        ? `${sizing.baseKelly.toFixed(2)} base × ${sizing.modifier.toFixed(2)} survival modifier, capped at ${sizing.maxBetPercent}% of bankroll`
        : 'fractional Kelly, scaled by the survival modifier and capped',
      detail: sizing ? (
        <span className="t-helper">Largest stake at the cap {formatCurrency(sizing.maxStakeUsd)} <span className="t-metadata">· {sizing.maxBetPercent}% of the survival brain’s current capital · derived here — the executor applies the cap to the balance it fetches at submit</span></span>
      ) : undefined,
    },
    {
      step: 5, name: 'Execute',
      value: executed.kind === 'unknown' ? '—' : executed.trades.toLocaleString(),
      unit: executed.kind === 'paper' ? 'paper trades' : executed.kind === 'live' ? 'orders' : 'trades',
      gate: executed.kind === 'paper'
        ? `paper mode — trades are recorded, not sent${cfg ? `; orders would abort above ${cfg.maxLatencyMs} ms` : ''}`
        : executed.kind === 'live'
          ? `live orders${cfg ? `, aborted above ${cfg.maxLatencyMs} ms` : ''}${executed.isRunning ? '' : ' — executor not running'}`
          : 'execution mode not yet known',
      detail: executed.kind === 'paper' ? (
        <span className="t-helper">
          {executed.wins} won · {executed.losses} lost{executed.pending > 0 ? ` · ${executed.pending} pending` : ''} this session
          <span className="t-metadata"> · since {new Date(executed.sessionStart).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · /api/paper-stats</span>
        </span>
      ) : executed.kind === 'live' ? (
        <span className="t-helper">{executed.wins} won · {executed.losses} lost <span className="t-metadata">· /api/execution/status</span></span>
      ) : undefined,
    },
  ]
}

