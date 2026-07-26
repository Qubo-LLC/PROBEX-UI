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

import type { ReactNode } from 'react'
import { PortfolioOverview } from './PortfolioOverview'
import { PortfolioSummaryCard } from './PortfolioSummaryCard'
import { PerformanceWindow } from './PerformanceWindow'
import { PortfolioAllocation } from './PortfolioAllocation'
import { PortfolioInsights } from './PortfolioInsights'
import { PortfolioActivity } from './PortfolioActivity'
import { PortfolioValueChart } from './charts/PortfolioValueChart'
import { PnLChart } from './charts/PnLChart'
import { WinRateChart } from './charts/WinRateChart'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

function ChartCard({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-4 ${className}`} style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--probex-text-muted)' }}>{title}</h3>
      {children}
    </div>
  )
}

export function PortfolioPage({ embedded = false }: EmbeddableProps = {}) {
  return (
    <div className={pageShell(embedded, 'gap-5')}>
      {!embedded && (
        <div>
          <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--probex-text-primary)' }}>Portfolio</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--probex-text-muted)' }}>Performance, exposure, and the engine&apos;s live edge alignment</p>
        </div>
      )}

      <PortfolioOverview />

      <PortfolioSummaryCard />

      <PerformanceWindow />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>Performance History</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="Portfolio Value"><PortfolioValueChart height={200} /></ChartCard>
          <ChartCard title="Daily & Cumulative P&L"><PnLChart height={200} /></ChartCard>
          <ChartCard title="Rolling Win Rate" className="lg:col-span-2"><WinRateChart height={160} /></ChartCard>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>Allocation</h2>
        <PortfolioAllocation />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PortfolioInsights />
        <PortfolioActivity />
      </section>
    </div>
  )
}
