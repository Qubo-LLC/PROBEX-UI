'use client'

// PortfolioPage — V3 Phase 4 assembly root, restoring V1's Portfolio
// experience (git 0e3833a4) on the live data spine. Continues the connected
// journey Overview → Markets → Consensus → Portfolio → Positions.
//
// V1 gated the entire page (charts, allocation, insights, activity) behind
// "does the user have any positions" and showed one blocking EmptyState
// otherwise. Per the Phase 3 lesson (platform-wide widgets shouldn't be
// gated behind an unrelated condition) and this phase's explicit "never
// collapse premium layouts because an endpoint is missing" directive, every
// section here renders unconditionally — each widget owns its own graceful
// empty/awaiting state instead of one page-level all-or-nothing gate. The
// page always looks like a complete, populated product.

import { PortfolioOverview } from './PortfolioOverview'
import { PortfolioSummaryCard } from './PortfolioSummaryCard'
import { PerformanceWindow } from './PerformanceWindow'
import { PortfolioAllocation } from './PortfolioAllocation'
import { PortfolioInsights } from './PortfolioInsights'
import { PortfolioActivity } from './PortfolioActivity'
import { PortfolioValueChart } from './charts/PortfolioValueChart'
import { PnLChart } from './charts/PnLChart'
import { WinRateChart } from './charts/WinRateChart'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Panel } from '@/components/ui/Panel'
import { chartStateFromSlice } from '@/components/shared/ChartFrame'
import { useApplicationStore } from '@/store/applicationStore'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

// The local ChartCard that used to live here re-implemented .card at a
// different radius (`rounded-xl` where every sibling surface is `rounded-lg`)
// with its own uppercase heading treatment matching neither .t-card-title nor
// .t-label — ten instances on this page alone, and the same hand-rolled shape
// appeared in ~30 places across the app. Charts now sit in the shared Panel,
// so a chart container and an instrument panel are the same material.

export function PortfolioPage({ embedded = false }: EmbeddableProps = {}) {
  // All three history charts read one slice, so the wrapping Panels derive
  // their lineage from it here rather than hardcoding provenance="live".
  // Measured before this: a failing /api/portfolio/history rendered
  // "Portfolio Value unavailable" directly beneath a green LIVE badge, because
  // the Panel could not see the state its own child had resolved.
  const historySlice = useApplicationStore((st) => st.engine.portfolioHistory)
  const historyRows = historySlice.data?.history.length ?? 0
  const { state: historyState } = chartStateFromSlice(historySlice, historyRows)
  const historyProvenance =
    historyState === 'unavailable' ? 'unreachable' as const
    : historyState === 'idle'      ? 'idle' as const
    : 'live' as const
  const historyPanelState = historyState === 'unavailable' ? 'unavailable' as const : 'live' as const
  return (
    <div className={pageShell(embedded, 'gap-5')}>
      {!embedded && (
        <PageHeader
          title="Portfolio"
          subtitle="How capital and performance are evolving — value, realized results, and open exposure"
        />
      )}

      <PortfolioOverview />

      <PortfolioSummaryCard />

      <PerformanceWindow />

      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Performance History"
          subtitle="Every series below is drawn from the engine's own snapshot history"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Panel title="Portfolio Value" provenance={historyProvenance} state={historyPanelState} source="/api/portfolio/history">
            <PortfolioValueChart height={200} />
          </Panel>
          <Panel title="Realized P&L" provenance={historyProvenance} state={historyPanelState} source="/api/portfolio/history">
            <PnLChart height={200} />
          </Panel>
          <Panel title="Rolling Win Rate" provenance={historyProvenance} state={historyPanelState} source="/api/portfolio/history" className="lg:col-span-2">
            <WinRateChart height={160} />
          </Panel>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading title="Allocation" />
        <PortfolioAllocation />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PortfolioInsights />
        <PortfolioActivity />
      </section>
    </div>
  )
}
