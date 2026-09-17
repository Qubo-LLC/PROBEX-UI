'use client'

// OutcomeSummary — the Analytics page's primary conclusion: has the engine's
// edge paid, over the window it has kept?
//
// ─── Investigation lens ──────────────────────────────────────────────────────
// A reader arriving at Analytics is asking one question before any other — is
// the edge real — and the answer is four figures: what the account returned,
// how often it won, what a trade was worth on average, and how far it fell
// from its peak on the way. Everything beneath this block is evidence for it.
//
// ─── Sources, and why two ────────────────────────────────────────────────────
//   /api/portfolio/summary   return, peak, drawdown — the account's own record
//   /api/trades/ledger       wins / losses / P&L per settled trade
// Expectancy is computed here from the ledger and marked derived. The two
// surfaces disagree on trade counts at times (the summary's window is the
// engine's retained snapshot window; the ledger is every settled trade it
// still holds), so each figure names its own source rather than blending.
//
// No container: this is the page's first movement, and boxing the conclusion
// would make it one card among the evidence cards. The rule beneath separates
// it from the charts.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { expectancy } from '@/lib/mappers/analytics'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'

const SLOW_MS = 30_000
const MEDIUM_MS = 5_000

export function OutcomeSummary() {
  const summarySlice = useApplicationStore((s) => s.engine.portfolioSummary)
  const ledgerSlice  = useApplicationStore((s) => s.engine.tradesLedger)

  const summary = summarySlice.data?.summary ?? null
  const ledger  = ledgerSlice.data ?? null

  const trades = useMemo(() => ledger?.ledger ?? [], [ledger])
  const perTrade = useMemo(() => expectancy(trades), [trades])

  const returnPct = summary !== null ? summary.totalReturnPct : null
  const returnTone =
    returnPct === null ? undefined
    : returnPct > 0 ? 'var(--probex-positive)'
    : returnPct < 0 ? 'var(--probex-negative)'
    : undefined

  // The window the figures describe, read off the data. Stated once, at the
  // technical register, so a 2,800% return is never mistaken for a lifetime
  // figure when it is a one-hour snapshot window.
  const windowLabel = summary !== null
    ? `${new Date(summary.firstSnapshot).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} → ${new Date(summary.lastSnapshot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${summary.snapshotCount} snapshots`
    : null

  return (
    <section aria-labelledby="an-outcome" className="flex flex-col gap-4 pb-6" style={{ borderBottom: '1px solid var(--probex-border)' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <h2 id="an-outcome" className="t-section-title">Outcome</h2>
          <Popover
            label="About the outcome figures"
            trigger={(p) => <InfoButton what="the outcome figures" {...p} />}
          >
            <PopoverTitle>Two records, named separately</PopoverTitle>
            <PopoverText>
              Return and drawdown come from the engine&rsquo;s portfolio snapshots, which
              cover only the window it has retained — the first snapshot is a retention
              boundary, not the start of trading.
            </PopoverText>
            <PopoverText>
              Win rate and expectancy come from the settled-trade ledger. Expectancy is the
              mean P&amp;L per settled trade, computed here from that ledger; it is the one
              figure that says whether the edge pays independently of how often it wins.
            </PopoverText>
          </Popover>
        </span>
        {windowLabel && <span className="t-metadata">{windowLabel}</span>}
      </div>

      {/* One figure leads (the return), three qualify it. Registers do the
          ranking — lg over md — not containers. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
        {summary !== null ? (
          <Figure
            label="Return"
            size="lg"
            tone={returnTone}
            title="/api/portfolio/summary"
            {...certaintyFromSlice(summarySlice, SLOW_MS)}
            footnote={`${formatCurrency(summary.initialValue)} → ${formatCurrency(summary.currentValue)}`}
          >
            {`${returnPct! > 0 ? '+' : ''}${returnPct!.toFixed(1)}%`}
          </Figure>
        ) : (
          <Figure label="Return" size="lg" certainty="absent" absentReason={summarySlice.status === 'error' ? 'The portfolio summary did not answer' : 'Waiting for the portfolio summary'} />
        )}

        {ledger !== null ? (
          <Figure
            label="Win rate"
            size="md"
            title="/api/trades/ledger"
            {...certaintyFromSlice(ledgerSlice, MEDIUM_MS)}
            footnote={`${ledger.summary.wins} won · ${ledger.summary.losses} lost`}
          >
            {ledger.count > 0 ? formatPercent(ledger.summary.winRate) : '—'}
          </Figure>
        ) : (
          <Figure label="Win rate" size="md" certainty="absent" absentReason="Waiting for the trade ledger" />
        )}

        {perTrade !== null ? (
          <Figure
            label="Expectancy"
            size="md"
            certainty="derived"
            tone={perTrade > 0 ? 'var(--probex-positive)' : perTrade < 0 ? 'var(--probex-negative)' : undefined}
            title="Mean P&L per settled trade, computed from /api/trades/ledger"
            footnote={`per trade · ${trades.length} settled`}
          >
            {formatSignedCurrency(perTrade)}
          </Figure>
        ) : (
          <Figure label="Expectancy" size="md" certainty="absent" absentReason="No settled trades to average" />
        )}

        {summary !== null ? (
          <Figure
            label="Drawdown"
            size="md"
            tone={summary.currentDrawdownPct > 0 ? 'var(--probex-negative)' : undefined}
            title="/api/portfolio/summary"
            {...certaintyFromSlice(summarySlice, SLOW_MS)}
            footnote={`from peak ${formatCurrency(summary.peakValue)}`}
          >
            {`−${summary.currentDrawdownPct.toFixed(1)}%`}
          </Figure>
        ) : (
          <Figure label="Drawdown" size="md" certainty="absent" absentReason="Waiting for the portfolio summary" />
        )}
      </div>
    </section>
  )
}
