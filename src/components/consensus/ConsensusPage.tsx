'use client'

// ConsensusPage — V3 Phase 3 flagship (git 0e3833a4 reference: ConsensusEnginePage).
// The engine's reasoning as hero, restored with V1's premium vocabulary but
// rebuilt on real data end to end. Two columns: Engine Signal (fully live —
// selected market's edge, recommendation, decision pipeline, explainability)
// and Consensus Intelligence (the platform-wide aggregation concept — no
// backend yet, CE-3/CE-4 — rendered as complete, richly-styled widgets with
// only individual values marked pending, never as blank AwaitingBackend
// blocks). Selecting a market — via the selector or an Opportunity
// Intelligence row — updates uiStore.focusMarketId, so the whole page
// re-centers on one market without a route change.

import { useEffect, useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { useUIStore } from '@/store/uiStore'
import { parseMarketRows } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { PageHeader } from '@/components/ui/PageHeader'
import { DecisionPipeline } from '@/components/shared/DecisionPipeline'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

import { MarketSelector } from './MarketSelector'
import { OpportunityIntelligence } from './OpportunityIntelligence'
import { EdgeStrengthGauge } from './EdgeStrengthGauge'
import { RecommendationCard } from './RecommendationCard'
import { ExplainabilityPanel } from './ExplainabilityPanel'
import { ConsensusScoreCard } from './ConsensusScoreCard'
import { BiasBreakdown } from './BiasBreakdown'
import { ConfidenceEvolution } from './ConfidenceEvolution'
import { HistoricalSnapshots } from './HistoricalSnapshots'
import { ConsensusHistoryChart } from './ConsensusHistoryChart'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

export function ConsensusPage({ embedded = false }: EmbeddableProps = {}) {
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const edgesSlice    = useApplicationStore((s) => s.engine.edges)
  const survivalSlice = useApplicationStore((s) => s.engine.survival)
  const configSlice   = useApplicationStore((s) => s.engine.config)
  const executionSlice = useApplicationStore((s) => s.engine.executionStatus)

  const focusMarketId = useUIStore((s) => s.focusMarketId)
  const setFocusMarket = useUIStore((s) => s.setFocusMarket)

  const marketRows = useMemo(() => {
    if (!marketsSlice.data) return []
    const parsed = parseMarketRows(marketsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [marketsSlice.data])

  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  // Default the focus market once markets/edges resolve: prefer a market that
  // currently has an active edge (the most interesting starting point) over
  // an arbitrary first row.
  useEffect(() => {
    if (focusMarketId || marketRows.length === 0) return
    const withEdge = marketRows.find((m) => edgeMap.has(m.id))
    setFocusMarket((withEdge ?? marketRows[0])!.id)
  }, [focusMarketId, marketRows, edgeMap, setFocusMarket])

  const selectedMarket = marketRows.find((m) => m.id === focusMarketId)
  const selectedEdge = focusMarketId ? edgeMap.get(focusMarketId) : undefined

  const sv  = survivalSlice.status === 'success' ? survivalSlice.data : null
  const cfg = configSlice.status === 'success' ? configSlice.data : null
  const ex  = executionSlice.status === 'success' ? executionSlice.data : null
  const effectiveKelly = cfg && sv ? cfg.kellyFraction * sv.kellyModifier : null

  return (
    <div className={pageShell(embedded, 'gap-4')}>
      {!embedded && (
        <PageHeader
          title="Consensus"
          subtitle="What the engine sees, why it likes a market, and how strongly it believes it — made visible."
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <MarketSelector markets={marketRows} edgeMap={edgeMap} value={focusMarketId} onSelect={setFocusMarket} />
      </div>

      <OpportunityIntelligence onSelectMarket={setFocusMarket} />

      {/* ── Engine Signal (live, per selected market) ────────────────── */}
      {!selectedMarket ? (
        <EmptyState size="lg" title="Select a market" description="Choose a market above, or from Opportunity Intelligence, to see its per-market reasoning breakdown." />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold truncate" style={{ color: 'var(--probex-text-primary)' }}>{selectedMarket.title}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
            <Card variant="elevated" className="lg:col-span-2 flex items-center justify-center">
              <EdgeStrengthGauge edge={selectedEdge} />
            </Card>
            <div className="lg:col-span-3">
              <RecommendationCard edge={selectedEdge} />
            </div>
          </div>

          <ExplainabilityPanel edge={selectedEdge} survival={sv} />
        </>
      )}

      {/* ── Decision Pipeline (live, whole-engine cycle — not market-scoped) ── */}
      <Card className="flex flex-col gap-3">
        <h3 className="t-label">
          Decision Pipeline
        </h3>
        <DecisionPipeline
          note="Shared with Strategy — one live pipeline, two lenses on the same engine cycle."
          stages={[
            { step: 1, name: 'Scan',    value: marketsSlice.data ? String(marketsSlice.data.count) : '…', unit: marketsSlice.data?.count === 1 ? 'market' : 'markets', gate: 'Polymarket 5-minute BTC markets, refreshed each cycle' },
            { step: 2, name: 'Detect',  value: sv ? sv.totalPatterns.toLocaleString() : '…', unit: 'patterns', gate: 'price patterns evaluated against market odds' },
            { step: 3, name: 'Filter',  value: sv ? sv.filteredPatterns.toLocaleString() : '…', unit: 'passed', gate: sv ? `edge must exceed ${sv.minEdgeThreshold.toFixed(2)}%` : 'edge threshold gate', accent: true },
            { step: 4, name: 'Size',    value: effectiveKelly !== null ? `${effectiveKelly.toFixed(2)}×` : '…', unit: 'Kelly', gate: cfg ? `capped at ${cfg.maxBetPercent}% of bankroll` : 'fractional Kelly sizing' },
            { step: 5, name: 'Execute', value: ex ? String(ex.totalTrades) : '…', unit: ex?.totalTrades === 1 ? 'trade' : 'trades', gate: cfg ? `only if execution < ${cfg.maxLatencyMs}ms` : 'latency-guarded execution' },
          ]}
        />
      </Card>

      {/* ── Consensus Intelligence — platform-wide, live since 2026-07-22 ── */}
      <div className="flex flex-col gap-3 mt-2">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>Consensus Intelligence</h2>
          <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>Platform-wide aggregation across all signal sources</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ConsensusScoreCard />
          <BiasBreakdown />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ConfidenceEvolution />
          <ConsensusHistoryChart />
        </div>

        <HistoricalSnapshots />
      </div>
    </div>
  )
}
