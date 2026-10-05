'use client'

// StrategyConsole — how the engine operates, and what can currently be seen
// of it operating.
//
// ─── What "strategy" is here ─────────────────────────────────────────────────
// The wire has no strategy object — no name, type, on/off flag, decision log
// or per-trade rationale. It exposes the MECHANISM in parts: the rules the
// engine was started with (/api/config), the survival brain's live
// adjustments (/api/survival), the candidates it sees (/api/edges), what it
// scanned (/api/markets), process counters (/api/stats), the paper session's
// record (/api/paper-stats) and the events it wrote. This page composes
// those, and says which is which. See lib/display/mechanism.ts.
//
// ─── The hierarchy (Investigation lens) ──────────────────────────────────────
//   A  the posture: one sentence — acting / blocked and why / holding — from
//      the same reading Overview leads with, plus how long since the engine
//      last recorded anything
//   B  the cycle: SCAN → DETECT → FILTER → SIZE → EXECUTE as a ledger of
//      stages, each with its current number and the gate applied
//   C  the conditions: current candidates, the survival brain's state, the
//      rules as configured
//   D  the record: recent trade/edge events on the shared row, technical
//      units flagged where the contract leaves them undocumented, and the
//      engine's own one-line self-reports (formerly the Research tab)
//
// ─── Two readings corrected ──────────────────────────────────────────────────
// "Filter · 0 passed" read survival.filtered_patterns, which is the number of
// tracked patterns the brain has STOPPED trading. "Execute · 0 trades" read
// the real-order subsystem, which is legitimately zero in paper mode while
// the paper session had recorded ten trades. Both readings now come from
// mechanism.ts, shared with Consensus.

import { useMemo } from 'react'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { useMarketLookup } from '@/config/hooks/useMarketLookup'
import { parseEdgeRows } from '@/lib/mappers/edges'
import { parseEventRows, collapseConsecutiveRepeats } from '@/lib/mappers/events'
import { latestActivity } from '@/lib/display/eventDisplay'
import { formatAge } from '@/lib/display/freshness'
import { formatEdgePct, formatUptime, survivalStateColor, survivalStateLabel } from '@/lib/display/engine'
import { mechanismVerdict, patternFilterReading, processCounters } from '@/lib/display/mechanism'
import { formatCurrency } from '@/lib/utils'
import { ROUTES } from '@/config/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState } from '@/components/ui/ErrorState'
import { EdgeTable }  from '@/components/shared/EdgeTable'
import { MechanismCycle } from './MechanismCycle'
import { EngineReports } from './EngineReports'
import { EventStream } from '@/components/shared/EventStream'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'
import type { EngineConfig, SurvivalStatus } from '@/types/engine'
import { DETECTOR_THRESHOLD_UNREPORTED, SURVIVAL_FLOOR_LABEL } from '@/lib/display/thresholds'

/** Event types that are the mechanism acting or seeing — not health/system. */
const MECHANISM_EVENTS = new Set(['edge', 'trade', 'resolution'])
const RECENT_EVENTS = 8

export function StrategyConsole({ embedded = false }: EmbeddableProps = {}) {
  const survival  = useApplicationStore((s) => s.engine.survival)
  const config    = useApplicationStore((s) => s.engine.config)
  const markets   = useApplicationStore((s) => s.engine.markets)
  const edges     = useApplicationStore((s) => s.engine.edges)
  const stats     = useApplicationStore((s) => s.engine.stats)
  const events    = useApplicationStore((s) => s.engine.events)
  const lookup    = useMarketLookup()

  const sv  = survival.data
  const cfg = config.data

  const edgeRows = useMemo(() => (edges.data ? parseEdgeRows(edges.data) : null), [edges.data])
  const rows = edgeRows?.kind === 'rows' ? edgeRows.rows : edgeRows?.kind === 'empty' ? [] : null

  const verdict   = mechanismVerdict({ markets: markets.data, edges: edges.data, edgeRows: rows, survival: sv })
  const patterns  = patternFilterReading(sv)
  const counters  = processCounters(stats.data)

  // What the engine last wrote down — the same reading Live Feed leads with.
  const recent = useMemo(() => {
    if (!events.data) return null
    const parsed = parseEventRows(events.data)
    if (parsed.kind !== 'rows') return { rows: [], latest: null }
    const mech = parsed.rows.filter((r) => MECHANISM_EVENTS.has(r.type.toLowerCase()))
    return { rows: collapseConsecutiveRepeats(mech).slice(0, RECENT_EVENTS), latest: latestActivity(mech) }
  }, [events.data])

  return (
    <ProvenanceScope detail="tooltip">
    <div className={pageShell(embedded, 'gap-5')}>
      {!embedded && (
        <PageHeader
          title="Strategy"
          subtitle="How the engine operates — the cycle it runs, the gates it applies, and what it currently sees"
        />
      )}

      {survival.status === 'error' && config.status === 'error' && (
        <ErrorState
          title="The mechanism's records did not answer"
          description="Neither /api/survival nor /api/config responded — the rules and the survival brain's state are unknown."
          fullPage={false}
        />
      )}

      {/* ── A · posture ──────────────────────────────────────────────────── */}
      <section aria-labelledby="st-posture" className="flex flex-col gap-2">
        <h2 id="st-posture" className="sr-only">Current posture</h2>
        <Posture verdict={verdict} survival={sv} edgesState={edges.status} marketsState={markets.status} />
        {recent?.latest ? (
          <p className="t-helper">
            Last recorded action {formatAge(recent.latest.ageMs)} ({new Date(recent.latest.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})
            {counters && ` · engine counters: ${counters.edgesDetected} edge${counters.edgesDetected === 1 ? '' : 's'} detected, ${counters.ordersExecuted} order${counters.ordersExecuted === 1 ? '' : 's'} executed · process up ${formatUptime(counters.uptimeSeconds)}`}
          </p>
        ) : events.status === 'error' ? (
          <p className="t-helper">The event log did not answer — when the engine last acted is unknown.</p>
        ) : null}
      </section>

      {/* ── B · the cycle ────────────────────────────────────────────────── */}
      <div className="pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <MechanismCycle />
      </div>

      {/* ── C · candidates ───────────────────────────────────────────────── */}
      <section aria-labelledby="st-candidates" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-baseline gap-2 flex-wrap">
            <h2 id="st-candidates" className="t-section-title">Current candidates</h2>
            <span className="t-description">edges the detector reports this cycle{rows !== null ? ` · ${rows.length}` : ''}</span>
          </span>
          <span className="flex items-baseline gap-3">
            <span className="t-metadata">/api/edges{certaintyFromSlice(edges, 8_000).certainty === 'stale' ? ' · stale' : ''}</span>
            <Link href={ROUTES.LIVE} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>Live Feed →</Link>
          </span>
        </div>
        {edges.status === 'error' ? (
          <ErrorState title="The edge detector did not answer" description={edges.error?.message ?? 'No response from /api/edges.'} fullPage={false} />
        ) : edgeRows === null ? (
          <p className="t-description">Waiting for the edge detector.</p>
        ) : (
          <EdgeTable
            result={edgeRows}
            emptyTitle={verdict.marketsScanned === 0 ? 'Nothing to evaluate' : 'No edge this cycle'}
            emptyDescription={
              verdict.marketsScanned === 0
                ? 'The engine scanned no markets this cycle, so the detector had nothing to evaluate. Candidates appear the moment the market fetcher returns windows.'
                : `The detector reports no edge on the ${verdict.marketsScanned ?? ''} market${verdict.marketsScanned === 1 ? '' : 's'} it scanned. Whether any candidate was rejected by a gate is not recorded on the wire.`
            }
          />
        )}
      </section>

      {/* ── C · the survival brain ───────────────────────────────────────── */}
      <section aria-labelledby="st-brain" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-baseline gap-2 flex-wrap">
            <h2 id="st-brain" className="t-section-title">The survival brain</h2>
            <span className="t-description">the part of the mechanism that moves — sizing and the edge bar follow capital</span>
          </span>
          <span className="flex items-baseline gap-3">
            <span className="t-metadata">/api/survival</span>
            <Link href={`${ROUTES.STRATEGY}?view=survival`} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>Capital protection →</Link>
          </span>
        </div>
        {sv ? (
          <div className="flex items-start gap-x-8 gap-y-3 flex-wrap">
            <Figure label="State" size="md" tone={survivalStateColor(sv.state)} title="survival.state" {...certaintyFromSlice(survival, 5_000)}>
              {survivalStateLabel(sv.state)}
            </Figure>
            <Figure label="Capital" size="md" footnote={<span className="t-helper">{sv.capitalPct.toFixed(1)}% of {formatCurrency(sv.initialCapital)} initial</span>} {...certaintyFromSlice(survival, 5_000)}>
              {formatCurrency(sv.currentCapital)}
            </Figure>
            <Figure label="Kelly modifier" size="md" tone={sv.kellyModifier < 1 ? 'var(--synatra-warning)' : undefined} footnote={<span className="t-helper">{sv.kellyModifier > 1 ? 'sizing up while ahead' : sv.kellyModifier < 1 ? 'sizing cut back' : 'full sizing'}</span>} {...certaintyFromSlice(survival, 5_000)}>
              ×{sv.kellyModifier.toFixed(2)}
            </Figure>
            <Figure label={SURVIVAL_FLOOR_LABEL} size="md" title={DETECTOR_THRESHOLD_UNREPORTED} footnote={<span className="t-helper">survival brain · min_edge_threshold · not the detector’s threshold</span>} {...certaintyFromSlice(survival, 5_000)}>
              {formatEdgePct(sv.minEdgeThreshold, 2)}
            </Figure>
            {patterns && (
              <Figure
                label="Patterns"
                size="md"
                footnote={
                  <span className="t-helper">
                    {patterns.stopped} stopped · <Link href={ROUTES.ANALYTICS} className="focus-ring rounded-sm" style={{ color: 'var(--synatra-primary)' }}>per pattern →</Link>
                  </span>
                }
                title="Outcomes tallied per hour × window × edge bucket; a pattern the brain judges losing is stopped (`filtered`)"
                {...certaintyFromSlice(survival, 5_000)}
              >
                {patterns.tracked}
              </Figure>
            )}
          </div>
        ) : survival.status === 'error' ? (
          <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>The survival brain did not answer — its state, modifier and threshold are unknown.</p>
        ) : (
          <p className="t-description">Waiting for /api/survival.</p>
        )}
      </section>

      {/* ── C/D · rules as configured ────────────────────────────────────── */}
      <section aria-labelledby="st-rules" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-baseline gap-2 flex-wrap">
            <h2 id="st-rules" className="t-section-title">Rules as configured</h2>
            <span className="t-description">set at engine start; the dashboard cannot change them</span>
          </span>
          <span className="t-metadata">/api/config{cfg ? ` · ${cfg.environment} mode` : ''}</span>
        </div>
        {cfg ? <RulesLedger cfg={cfg} /> : config.status === 'error'
          ? <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>The configuration did not answer — the rules are unknown.</p>
          : <p className="t-description">Waiting for /api/config.</p>}
      </section>

      {/* ── D · the record ───────────────────────────────────────────────── */}
      <section aria-labelledby="st-record" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-baseline gap-2 flex-wrap">
            <h2 id="st-record" className="t-section-title">What it did</h2>
            <span className="t-description">edge, trade and resolution events, newest first — observed alongside, not explained</span>
          </span>
          <span className="flex items-baseline gap-3">
            <span className="t-metadata">/api/events</span>
            <Link href={`${ROUTES.SYSTEM}?view=events`} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>Full log →</Link>
          </span>
        </div>
        {events.status === 'error' ? (
          <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>The event log did not answer — what the engine recorded is unknown.</p>
        ) : recent === null ? (
          <p className="t-description">Waiting for the event log.</p>
        ) : recent.rows.length === 0 ? (
          <p className="t-description">No edge, trade or resolution events in the engine’s retained log.</p>
        ) : (
          <EventStream rows={recent.rows} compact lookup={lookup} />
        )}
      </section>

      {/* ── D · the engine's own summaries ───────────────────────────────── */}
      <EngineReports />
    </div>
    </ProvenanceScope>
  )
}

// ─── A · posture ──────────────────────────────────────────────────────────────

function Posture({ verdict, survival, edgesState, marketsState }: {
  verdict: ReturnType<typeof mechanismVerdict>
  survival: SurvivalStatus | null
  edgesState: string
  marketsState: string
}) {
  const f = verdict.focus
  let text: string
  let tone = 'var(--synatra-text-primary)'

  if (f.kind === 'acting') {
    text = `Acting on a ${f.edge.direction.toUpperCase()} edge of ${formatEdgePct(f.edge.edgePct)}` +
      (survival ? ` — it clears the survival brain’s ${formatEdgePct(survival.minEdgeThreshold, 2)} floor.` : '.')
    tone = 'var(--synatra-positive)'
  } else if (f.kind === 'blocked') {
    const why = f.reasons.map((r) =>
      r.kind === 'halted' ? `trading is halted (survival state ${r.state})`
      : r.kind === 'threshold' ? `${formatEdgePct(r.edgePct)} is below the ${formatEdgePct(r.minEdge, 2)} required`
      : r.kind === 'stale-market-data' ? 'the engine reports its market data is stale'
      : `the Kelly modifier is ${r.kellyModifier.toFixed(2)}, so every position sizes to zero`,
    ).join('; ')
    text = `Sees a ${f.edge.direction.toUpperCase()} edge of ${formatEdgePct(f.edge.edgePct)} but will not act — ${why}.`
    tone = 'var(--synatra-warning)'
  } else if (f.kind === 'holding') {
    const scanned = verdict.marketsScanned
    text = f.halted
      ? `Halted — survival state ${f.state ?? 'DEAD'}; the engine is not trading.`
      : scanned === 0
        ? 'Idle — the engine scanned no markets this cycle, so there is nothing to evaluate.'
        : `Holding — ${scanned ?? 'the'} market${scanned === 1 ? '' : 's'} scanned, no edge reported this cycle.`
    tone = scanned === 0 || f.halted ? 'var(--synatra-text-secondary)' : 'var(--synatra-text-primary)'
  } else {
    text = edgesState === 'error' || marketsState === 'error'
      ? 'The scanner or the edge detector did not answer — what the engine currently sees is unknown.'
      : 'Waiting for the scanner and the edge detector.'
    tone = 'var(--synatra-text-muted)'
  }

  return <p className="text-sm font-medium leading-relaxed m-0" style={{ color: tone }}>{text}</p>
}

// ─── C/D · rules ──────────────────────────────────────────────────────────────

function RulesLedger({ cfg }: { cfg: EngineConfig }) {
  const rows: Array<{ label: string; value: string; note: string; flag?: boolean }> = [
    { label: 'Max bet', value: `${cfg.maxBetPercent}%`, note: 'of bankroll per position' },
    { label: 'Max concurrent positions', value: String(cfg.maxConcurrentPositions), note: 'open at once' },
    { label: 'Max execution latency', value: `${cfg.maxLatencyMs} ms`, note: 'orders abort above this' },
    { label: 'Initial bankroll', value: formatCurrency(cfg.initialBankroll), note: 'the capital figures are measured against this' },
  ]
  if (cfg.blockedHours !== null) {
    rows.push({ label: 'Blocked hours', value: cfg.blockedHours.length === 0 ? 'none' : cfg.blockedHours.map((h) => `${String(h).padStart(2, '0')}:00`).join(', '), note: cfg.blockedHours.length === 0 ? 'the engine trades around the clock' : 'trading suspended during these hours' })
  }
  if (cfg.lowLiquidityStartHour !== null && cfg.lowLiquidityEndHour !== null) {
    const unset = cfg.lowLiquidityStartHour === 0 && cfg.lowLiquidityEndHour === 0
    rows.push({ label: 'Low-liquidity window', value: unset ? 'not set' : `${String(cfg.lowLiquidityStartHour).padStart(2, '0')}:00–${String(cfg.lowLiquidityEndHour).padStart(2, '0')}:00`, note: unset ? 'start and end are both 0, so no window is in force' : 'reduced activity during these hours' })
  }
  if (cfg.earlyExitThreshold !== null) {
    rows.push({ label: 'Early exit', value: String(cfg.earlyExitThreshold), note: 'early_exit_threshold as reported — unit not documented', flag: true })
  }
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 m-0">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-0.5 min-w-0">
          <dt className="t-label truncate">{r.label}</dt>
          <dd className="m-0 flex items-baseline gap-2 min-w-0">
            <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: 'var(--synatra-text-primary)' }}>{r.value}</span>
            <span className="t-helper truncate" style={r.flag ? { color: 'var(--synatra-text-disabled)' } : undefined}>{r.note}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}
