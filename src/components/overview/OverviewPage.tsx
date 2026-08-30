'use client'

// OverviewPage — the command center for an autonomous trading engine.
//
// ─── Reading order ───────────────────────────────────────────────────────────
//   1  Attention    only when something is wrong; absent on a healthy engine
//   2  Market+Edge  what is happening, and what the engine sees in it
//   3  Engine state capital · exposure · execution · system, four instruments
//   4  Markets      the field: featured, trending, and the live edge rail
//   5  Consensus    the one awaiting-backend promise, last
//
// The sequence answers the seven cockpit questions in the order an operator
// actually asks them — is anything wrong, what is the market doing, what does
// the engine think, what is at risk, what has it done, is it healthy — and it
// answers all seven, which the previous composition did not: risk and execution
// had no representation at all despite both being fully polled.
//
// ─── What changed structurally ───────────────────────────────────────────────
// Before: hero (with a 7s rotating panel carrying three unrelated topics), a
// permanent "All systems nominal" strip, two 670×104px cards holding one number
// each, and a full-width Profit Targets card whose progress bars were 1310px
// wide. Roughly 690px of vertical space before the first market appeared,
// carrying under 200 characters.
//
// After: the same 690px carries the hero at a larger chart size plus four
// instrument panels holding ~40 live figures. Nothing was invented to fill it —
// every added value was already arriving in the store and going unread.

import { useMemo }          from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseMarketRows }   from '@/lib/mappers/markets'
import { EngineAttention }  from './EngineAttention'
import { EngineFocusHero }  from './EngineFocusHero'
import { EngineStateBand }  from './EngineStateBand'
import { GlobalConsensusBar } from './GlobalConsensusBar'
import { FeaturedMarkets }  from './FeaturedMarkets'
import { TrendingMarkets }  from './TrendingMarkets'
import { HotMarkets }       from './HotMarkets'
import { Card }             from '@/components/ui/Card'
import { EmptyState }       from '@/components/ui/EmptyState'
import { ErrorState }       from '@/components/ui/ErrorState'
import { Footer }           from '@/components/layout/Footer'

export function OverviewPage() {
  // ─── One market condition, stated once ──────────────────────────────────────
  // Featured, Trending and Hot Markets all read the SAME `markets` slice and
  // each renders its own empty and error branch. With the engine returning no
  // markets that produced three consecutive empty frames; with the endpoint
  // failing — its current state — it produced the words "Markets unavailable"
  // three times down one page. Three restatements of one fact read as a broken
  // page rather than an idle engine.
  //
  // So the shared condition is resolved here and the three sections render only
  // when there is something for them to differentiate. Nothing is hidden: every
  // branch below still states the real condition, including the schema-mismatch
  // case, which is a data-integrity warning and must never be softened into an
  // empty state. This is composition — no new fetch, no new slice, no change to
  // what any of the three components does when rows exist.
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const marketRows = useMemo(
    () => (marketsSlice.data ? parseMarketRows(marketsSlice.data) : null),
    [marketsSlice.data],
  )
  const hasRows = marketRows?.kind === 'rows' && marketRows.rows.length > 0

  return (
    <div className="page-container animate-fade-in-up" style={{ paddingBottom: 0 }}>
      <h1 className="sr-only">Probex Overview</h1>

      <div className="flex flex-col gap-3">
        {/* 1 · Only present when the engine has something to report. */}
        <EngineAttention />

        {/* 2 · Market and edge — the one dominant surface on the page. */}
        <EngineFocusHero />

        {/* 3 · The instrument row: capital, exposure, execution, system. */}
        <EngineStateBand />
      </div>

      {/* 4 · The field. The market is the operator's to watch; the engine marks
             where it sees an edge. */}
      <section className="mt-7">
        <h2 className="t-section-title mb-3">Markets</h2>

        {hasRows ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
            <div className="min-w-0 flex flex-col gap-6">
              <FeaturedMarkets />
              <TrendingMarkets />
            </div>

            <aside className="flex flex-col gap-4 xl:sticky xl:top-5">
              <HotMarkets className="max-h-[460px]" />
            </aside>
          </div>
        ) : (
          <MarketContextFrame
            status={marketsSlice.status}
            message={marketsSlice.error?.message ?? null}
            unrecognizedCount={marketRows?.kind === 'unrecognized' ? marketRows.count : null}
          />
        )}
      </section>

      {/* 5 · Consensus — renders nothing once the endpoint exists. */}
      <div className="mt-6">
        <GlobalConsensusBar />
      </div>

      <Footer />
    </div>
  )
}

/**
 * The single market-context frame shown when there are no market rows.
 *
 * Replaces three sections, each of which would otherwise state the same
 * condition. It states it once, and states it precisely — loading, failed,
 * schema-mismatched and genuinely empty are four different facts and keep four
 * different treatments.
 */
function MarketContextFrame({
  status,
  message,
  unrecognizedCount,
}: {
  status:            'loading' | 'success' | 'empty' | 'error'
  message:           string | null
  unrecognizedCount: number | null
}) {
  if (status === 'loading') {
    return (
      <Card>
        <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
          Waiting for /api/markets — the engine’s market fetcher can take several seconds under rate limiting.
        </p>
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <ErrorState
        title="Market context unavailable"
        description={message ?? 'The /api/markets endpoint did not respond.'}
        fullPage={false}
      />
    )
  }

  // Items arrived but did not match the agreed shape. This is a contract
  // warning, not an empty state, and must stay distinguishable from one.
  if (unrecognizedCount !== null) {
    return (
      <Card>
        <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
          The engine reports {unrecognizedCount} active market{unrecognizedCount === 1 ? '' : 's'}, but the item
          format doesn’t match the agreed schema — the catalogue is withheld rather than shown with wrong values.
        </p>
      </Card>
    )
  }

  return (
    <EmptyState
      size="sm"
      title="No markets open right now"
      description="The engine's 5- and 15-minute BTC markets appear here as they open. Featured, trending and hot markets return with them."
    />
  )
}
