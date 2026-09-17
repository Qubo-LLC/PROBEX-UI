'use client'

// CapitalSummary — the Portfolio page's primary conclusion: what the account
// is worth, what it has banked, what is at risk, and how far it sits from
// its peak.
//
// ─── Two records, and why both are named ─────────────────────────────────────
// /api/portfolio is the LIVE ledger — balance, realized, unrealized, the
// survival brain's reading of the capital. /api/portfolio/summary is the
// SNAPSHOT record — the engine's periodic portfolio snapshots, which is where
// peak and drawdown come from, and whose window can lag the ledger by hours
// (live: ledger $2,165.50 at 10:13, last snapshot $2,920.42 at 23:31 the
// evening before). The previous page rendered both as "current value" in
// two different panels, 300px apart, with no word on why they disagreed.
// Here the ledger leads and the snapshot figures say when they were taken.
//
// No container: the conclusion is ruled off from the evidence beneath it.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { survivalStateLabel, survivalStateSeverity } from '@/lib/display/engine'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'

export function CapitalSummary() {
  const portfolioSlice = useApplicationStore((s) => s.engine.portfolio)
  const summarySlice   = useApplicationStore((s) => s.engine.portfolioSummary)
  const positionsSlice = useApplicationStore((s) => s.engine.positions)

  const pf  = portfolioSlice.data ?? null
  const snap = summarySlice.data?.summary ?? null
  const pos = positionsSlice.data ?? null

  const severity = pf ? survivalStateSeverity(pf.survival.state) : null
  const survivalTone =
    severity === 'danger' ? 'var(--probex-negative)'
    : severity === 'caution' ? 'var(--probex-warning)'
    : undefined

  const snapAge = snap ? `snapshot ${new Date(snap.lastSnapshot).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : null

  return (
    <section aria-labelledby="pf-capital" className="flex flex-col gap-4 pb-6" style={{ borderBottom: '1px solid var(--probex-border)' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <h2 id="pf-capital" className="t-section-title">Capital</h2>
          <Popover label="About the capital figures" trigger={(p) => <InfoButton what="the capital figures" {...p} />}>
            <PopoverTitle>Ledger first, snapshots second</PopoverTitle>
            <PopoverText>
              Account value, realized and unrealized come from the engine&rsquo;s live
              portfolio ledger, which survives restarts. The survival state beside the
              value is the brain&rsquo;s own classification of that capital.
            </PopoverText>
            <PopoverText>
              Peak and drawdown come from the engine&rsquo;s periodic portfolio snapshots —
              a separate record that can lag the ledger by hours, which is why its time is
              printed with it. When the two disagree, the ledger is current and the
              snapshot is history.
            </PopoverText>
          </Popover>
        </span>
        {pf && <span className="t-metadata">{pf.mode === 'live' ? 'live account' : 'paper account'}</span>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
        {pf ? (
          <Figure
            label="Capital"
            size="lg"
            title="/api/portfolio"
            {...certaintyFromSlice(portfolioSlice, 5_000)}
            footnote={
              <span style={survivalTone ? { color: survivalTone } : undefined}>
                {survivalStateLabel(pf.survival.state)} · {pf.survival.capitalPct.toFixed(1)}% of starting capital
              </span>
            }
          >
            {formatCurrency(pf.balance.current)}
          </Figure>
        ) : (
          <Figure label="Capital" size="lg" certainty="absent" absentReason={portfolioSlice.status === 'error' ? 'The portfolio ledger did not answer' : 'Waiting for the portfolio ledger'} />
        )}

        {pf ? (
          <Figure
            label="Realized"
            size="md"
            tone={pf.pnl.realized > 0 ? 'var(--probex-positive)' : pf.pnl.realized < 0 ? 'var(--probex-negative)' : undefined}
            title="/api/portfolio"
            {...certaintyFromSlice(portfolioSlice, 5_000)}
            footnote={
              pf.performance.totalTrades > 0
                ? `${formatPercent(pf.performance.winRate)} win rate · ${pf.performance.totalTrades} trades`
                : 'no settled trades yet'
            }
          >
            {formatSignedCurrency(pf.pnl.realized)}
          </Figure>
        ) : (
          <Figure label="Realized" size="md" certainty="absent" absentReason="Waiting for the portfolio ledger" />
        )}

        {pos ? (
          <Figure
            label="Unrealized"
            size="md"
            tone={pos.totalUnrealizedPnl > 0 ? 'var(--probex-positive)' : pos.totalUnrealizedPnl < 0 ? 'var(--probex-negative)' : undefined}
            title="/api/positions"
            {...certaintyFromSlice(positionsSlice, 5_000)}
            footnote={pos.count === 0 ? 'flat — nothing deployed' : `${pos.count} open position${pos.count === 1 ? '' : 's'}`}
          >
            {formatSignedCurrency(pos.totalUnrealizedPnl)}
          </Figure>
        ) : (
          <Figure label="Unrealized" size="md" certainty="absent" absentReason="Waiting for open-position state" />
        )}

        {snap ? (
          <Figure
            label="Drawdown"
            size="md"
            tone={snap.currentDrawdownPct > 0 ? 'var(--probex-negative)' : undefined}
            title="/api/portfolio/summary"
            {...certaintyFromSlice(summarySlice, 30_000)}
            footnote={`from peak ${formatCurrency(snap.peakValue)} · ${snapAge}`}
          >
            {`−${snap.currentDrawdownPct.toFixed(1)}%`}
          </Figure>
        ) : (
          <Figure label="Drawdown" size="md" certainty="absent" absentReason={summarySlice.status === 'error' ? 'The snapshot record did not answer' : summarySlice.data?.message ?? 'No portfolio snapshots yet'} />
        )}
      </div>
    </section>
  )
}
