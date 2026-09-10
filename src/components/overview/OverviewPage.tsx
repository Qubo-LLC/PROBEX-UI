'use client'

// OverviewPage — the engine's current position in the loop.
//
// ─── The composition ─────────────────────────────────────────────────────────
// PROBEX is not a trading terminal. Its user does not act; the engine acts, and
// the user watches. So the questions are causal rather than comparative — what
// did it decide, why, was it right, is it still able to — and the product's
// data forms one closed loop:
//
//   market → perception → decision gate → sizing → execution
//      ↑                                              ↓
//   survival brain ←──── capital consequence ←───────
//
// Overview is that loop's CURRENT POSITION, and it is composed as an arc read
// top to bottom in the direction the causality runs:
//
//   1  MARKET       what the world is doing            (fast tier — moves)
//   2  PERCEPTION   what the engine sees in it         (operational — still)
//   3  COMMITMENT   what it holds, risks, has produced (operational — still)
//   4  FIELD        the markets it is choosing among
//
// Each arc is separated by a hairline rule and nothing else. There is no card
// around any of them, because none of them is a separate subject — they are
// four moments of one sentence, and boxing them said otherwise.
//
// ─── What changed from the panel grid ────────────────────────────────────────
// Before: hero card (split market/engine) → attention card → four equal-weight
// instrument panels → three market sections → consensus. Roughly eight bordered
// surfaces, each carrying its own provenance badge, before the first market.
//
// After: three ruled arcs and the market board. The badges are gone; the page
// makes ONE freshness claim, at the top, and the certainty of individual
// figures is carried by the figures themselves (see shared/Figure).
//
// ─── Containers, and why these ones are justified ────────────────────────────
// Every container on this page marks a causal or semantic boundary:
//
//   EngineAttention  an INTERRUPTION. It is the one thing that should break the
//                    reading order, and a bounded surface is how it does that.
//   market cards     a market is a discrete object with its own identity, price
//                    and lifecycle. The boundary is real.
//   HotMarkets rail  a different question ("where is the action") beside the
//                    field, not part of it.
//
// The three arcs have none, and need none.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseMarketRows } from '@/lib/mappers/markets'
import { MarketArc } from './MarketArc'
import { PerceptionArc } from './PerceptionArc'
import { CommitmentArc } from './CommitmentArc'
import { EngineAttention } from './EngineAttention'
import { GlobalConsensusBar } from './GlobalConsensusBar'
import { FeaturedMarkets } from './FeaturedMarkets'
import { TrendingMarkets } from './TrendingMarkets'
import { HotMarkets } from './HotMarkets'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Footer } from '@/components/layout/Footer'
import { FreshnessIndicator } from '@/components/shared/FreshnessIndicator'
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'

export function OverviewPage() {
  // ─── One market condition, stated once ──────────────────────────────────────
  // Featured, Trending and Hot Markets all read the SAME `markets` slice and
  // each renders its own empty and error branch. With the engine returning no
  // markets that produced three consecutive empty frames; with the endpoint
  // failing it produced the words "Markets unavailable" three times down one
  // page. Three restatements of one fact read as a broken page rather than an
  // idle engine, so the shared condition is resolved here and the three
  // sections render only when there is something for them to differentiate.
  //
  // Nothing is hidden: every branch below still states the real condition,
  // including the schema-mismatch case, which is a data-integrity warning and
  // must never be softened into an empty state.
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const statsSlice   = useApplicationStore((s) => s.engine.stats)

  const marketRows = useMemo(
    () => (marketsSlice.data ? parseMarketRows(marketsSlice.data) : null),
    [marketsSlice.data],
  )
  const hasRows = marketRows?.kind === 'rows' && marketRows.rows.length > 0

  return (
    // Overview is an INTELLIGENCE surface: it answers "what is happening", not
    // "which endpoint produced this". Endpoint paths move into tooltips and
    // accessible names. System is the instrument surface and still prints them
    // in the open, which is where an operator actually needs them.
    <ProvenanceScope detail="tooltip">
    <div className="page-container animate-fade-in-up" style={{ paddingBottom: 0 }}>

      {/* ── The page's ONE freshness claim ───────────────────────────────────
          This replaces roughly a dozen per-panel provenance badges that used to
          render on this page, nearly all of them saying "Live". Liveness is a
          fact the reader establishes once and then relies on; restating it
          beside every figure did not make the product feel alive, it made the
          word stop meaning anything.

          Bound to /api/stats — the fast tier, and the first thing to go quiet
          if the engine stops. `showWhenFresh` is on here and nowhere else:
          this is the one place a healthy age is worth stating. */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap pb-4">
        <h1 className="sr-only">Probex Overview</h1>
        <span className="t-label">Market intelligence</span>
        <FreshnessIndicator state={statsSlice} expectedIntervalMs={2_000} showWhenFresh />
      </div>

      {/* ── 1 · MARKET — what the world is doing ──────────────────────────── */}
      <MarketArc />

      {/* ── 2 · PERCEPTION — what the engine sees in it ───────────────────── */}
      <PerceptionArc />

      {/* ── 3 · COMMITMENT — what it holds, risks, and has produced ───────── */}
      <CommitmentArc />

      {/* ── Attention — an interruption, not a step in the arc ─────────────
             Present only when something is actually wrong. It sits AFTER the
             arc rather than above it so that a degraded probe cannot outrank
             the engine's own state on every load, and it keeps a bounded
             surface because breaking the reading order is its entire job. */}
      <div className="mt-5 empty:mt-0">
        <EngineAttention />
      </div>

      {/* ── 4 · FIELD — the markets it is choosing among ──────────────────── */}
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

      {/* Consensus — renders nothing once the endpoint exists. */}
      <div className="mt-6">
        <GlobalConsensusBar />
      </div>

      <Footer />
    </div>
    </ProvenanceScope>
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
