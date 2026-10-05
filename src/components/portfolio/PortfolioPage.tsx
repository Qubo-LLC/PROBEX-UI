'use client'

// PortfolioPage — the account, under the Investigation lens: what it is
// worth, how it got there, what is deployed, and what the engine did.
//
// ─── The composition ─────────────────────────────────────────────────────────
//   A  CAPITAL      account value · realized · unrealized · drawdown — bare
//                   figures, the ledger leading and the snapshot record named
//   B  EVIDENCE     the equity curve, realized P&L and rolling win rate over
//                   the retained snapshot window, plus the bounded lookback
//   C  DEPLOYMENT   what is deployed now, in what, on which side, and whether
//                   the engine's current edge still agrees — a sentence when
//                   the book is flat
//   D  ACTIVITY     the engine's own trade and resolution events
//
// ─── What this replaced ──────────────────────────────────────────────────────
// Three Panels with LIVE badges, a "session scope" Panel, three empty cards
// (Top Exposure · Edge Alignment · Performance Snapshot), a "Snapshot History"
// Panel of five StatCards that restated Account Value and Realized under
// different names, a Performance Window Panel, three chart Panels whose time
// axis ran backwards, three "Allocation" cards, an Insights card and an
// Activity card whose filter matched no event type the engine emits. With no
// open positions — most of the day — nine of those surfaces were dashes.
//
// Every figure that remains was already on the page; what changed is which
// leads, which record each one names, and that nothing renders as an empty
// box. The chart components are reused unchanged; their series became
// chronological at the adapter (lib/services/dto.ts).

import { CapitalSummary } from './CapitalSummary'
import { PerformanceWindow } from './PerformanceWindow'
import { DeploymentReading } from './DeploymentReading'
import { PortfolioActivity } from './PortfolioActivity'
import { PortfolioValueChart } from './charts/PortfolioValueChart'
import { PnLChart } from './charts/PnLChart'
import { WinRateChart } from './charts/WinRateChart'
import { PageHeader } from '@/components/ui/PageHeader'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'
import { useApplicationStore } from '@/store/applicationStore'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

export function PortfolioPage({ embedded = false }: EmbeddableProps = {}) {
  const historySlice = useApplicationStore((st) => st.engine.portfolioHistory)
  const history = historySlice.data?.history ?? []
  const windowLabel = history.length >= 2
    ? `${history.length} snapshots · ${new Date(history[0]!.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} → ${new Date(history[history.length - 1]!.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null

  return (
    <div className={pageShell(embedded, 'gap-0')}>
      {!embedded && (
        <PageHeader
          title="Portfolio"
          subtitle="What the account is worth, how it got there, and what is deployed right now"
        />
      )}

      <div className="mt-5">
        <CapitalSummary />
      </div>

      {/* ── B · Evidence ─────────────────────────────────────────────────── */}
      <section aria-labelledby="pf-evidence" className="flex flex-col gap-5 py-6" style={{ borderBottom: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <h2 id="pf-evidence" className="t-section-title">Equity over the retained window</h2>
            <Popover label="About the equity charts" trigger={(p) => <InfoButton what="the equity charts" {...p} />}>
              <PopoverTitle>The engine&rsquo;s snapshot history</PopoverTitle>
              <PopoverText>
                All three series are drawn from the portfolio snapshots the engine has
                retained, in chronological order. The first snapshot is a retention boundary,
                not the start of trading; the rolling win rate is the engine&rsquo;s own figure
                per snapshot.
              </PopoverText>
            </Popover>
          </span>
          {windowLabel && <span className="t-metadata">{windowLabel}</span>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PortfolioValueChart height={200} />
          <PnLChart height={200} />
          <div className="lg:col-span-2">
            <WinRateChart height={150} />
          </div>
        </div>

        <div className="pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
          <PerformanceWindow />
        </div>
      </section>

      <DeploymentReading />
      <PortfolioActivity />
    </div>
  )
}
