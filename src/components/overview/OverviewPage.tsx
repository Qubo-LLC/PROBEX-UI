'use client'

// OverviewPage — the engine's current position in the loop.
//
// ─── The composition ─────────────────────────────────────────────────────────
// Synatra is not a trading terminal. Its user does not act; the engine acts, and
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
//   3  CAPITAL &    what that state means for the book — capital against its
//      BOOK         targets, exposure against its limit, results so far.
//                   The one CONTAINED movement: money is a different subject.
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
// After: two ruled arcs, one contained financial group, and the market board.
// The badges are gone; the page makes ONE freshness claim, at the top, and the
// certainty of individual figures is carried by the figures themselves.
//
// ─── The correction that followed ────────────────────────────────────────────
// The first pass of this composition over-corrected. Retiring the four-panel
// instrument row took roughly forty figures off the page and replaced them with
// three, which is not restraint — the page went from information-dense to
// sparse, and read as hero → whitespace → market list.
//
// The goal was never "remove cards". It was "stop using cards as the default
// grammar for every piece of information". So the depth came back, in ONE
// contained group organised by rules rather than by four bordered surfaces.
// See CapitalBookGroup for what that restored and what it deliberately did not
// (avg fill and backoff stayed on Execution, where they have context).
//
// ─── Containers, and why these ones are justified ────────────────────────────
// A container earns its place when it creates a real semantic, interaction or
// hierarchy boundary — not when a statistic needs somewhere to sit:
//
//   CapitalBookGroup money is a different subject from the market and the
//                    decision. One boundary for one subject.
//   EngineAttention  an INTERRUPTION. It is the one thing that should break the
//                    reading order, and a bounded surface is how it does that.
//   engine-field     a market the engine TRADES is a discrete object with its
//   market cards     own identity, baseline, lifecycle and resolution. The
//                    boundary is real — and there are two, not six. See
//                    MarketField for why the field is ordered by the engine's
//                    relationship to a market rather than by its volume.
//
// The three arcs have none, and need none. The observed-markets board is a
// table (its edge is the table's own chrome, not a container) and consensus is
// a ruled block, so the sequence down the field is card → rule → table.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseMarketRows } from '@/lib/mappers/markets'
import { MarketArc } from './MarketArc'
import { PerceptionArc } from './PerceptionArc'
import { CapitalBookGroup } from './CapitalBookGroup'
import { EngineAttention } from './EngineAttention'
import { MarketField } from './MarketField'
import { marketDataSignal } from '@/lib/display/engineFocus'
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
  const healthSlice  = useApplicationStore((s) => s.engine.health)
  // The engine's own verdict on its market data (api_access), quoted verbatim.
  const marketData   = marketDataSignal(healthSlice.data, marketsSlice.data?.count ?? null)

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
        <h1 className="sr-only">Synatra Overview</h1>
        <span className="t-label">Market intelligence</span>
        <FreshnessIndicator state={statsSlice} expectedIntervalMs={2_000} showWhenFresh />
      </div>

      {/* ── 1 · MARKET — what the world is doing ──────────────────────────── */}
      <MarketArc />

      {/* ── 2 · PERCEPTION — what the engine sees in it ───────────────────── */}
      <PerceptionArc />

      {/* ── 3 · CAPITAL & BOOK — what that state means for the account ─────
             Not "committed": when the engine is HOLDING — the common case —
             nothing has been committed, and a heading saying otherwise would
             claim capital was deployed on a decision the engine explicitly
             declined to make. The decision above stays the arc's climax; this
             is its financial consequence.

             This is the one CONTAINED movement of the arc, because money is a
             genuinely different subject from the market and the decision. One
             container, internally ruled — not the four-panel grid it replaces. */}
      <CapitalBookGroup />

      {/* ── Attention — an interruption, not a step in the arc ─────────────
             Present only when something is actually wrong. It sits AFTER the
             arc rather than above it so that a degraded probe cannot outrank
             the engine's own state on every load, and it keeps a bounded
             surface because breaking the reading order is its entire job. */}
      <div className="mt-5 empty:mt-0">
        <EngineAttention />
      </div>

      {/* ── 4 · FIELD — the markets, ordered by the engine's relationship to
             them: the two it trades as objects, consensus as a reading beside
             them, the fifty-six it observes as a board beneath. Replaces
             Featured (6 cards) + Trending (8 rows of the SAME markets) + the
             Hot Markets rail + a bottom-of-page consensus strip. */}
      {hasRows ? (
        <MarketField />
      ) : (
        <section className="mt-7">
          <h2 className="t-section-title mb-3">Markets</h2>
          <MarketContextFrame
            status={marketsSlice.status}
            message={marketsSlice.error?.message ?? null}
            unrecognizedCount={marketRows?.kind === 'unrecognized' ? marketRows.count : null}
            staleMessage={marketData?.stale ? (marketData.message ?? 'The engine reports its market data is stale.') : null}
          />
        </section>
      )}

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
  staleMessage,
}: {
  status:            'loading' | 'success' | 'empty' | 'error'
  message:           string | null
  unrecognizedCount: number | null
  /** api_access unhealthy: the empty list is a stale fetcher, not a quiet market. */
  staleMessage:      string | null
}) {
  if (status === 'loading') {
    return (
      <Card>
        <p className="text-xs" style={{ color: 'var(--synatra-text-disabled)' }}>
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
        <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>
          The engine reports {unrecognizedCount} active market{unrecognizedCount === 1 ? '' : 's'}, but the item
          format doesn’t match the agreed schema — the catalogue is withheld rather than shown with wrong values.
        </p>
      </Card>
    )
  }

  // Phase 2: an empty list while the engine's own api_access check is failing
  // is NOT a quiet market — the venue may have open windows the engine cannot
  // see. Say which it is, in the engine's words.
  if (staleMessage) {
    return (
      <EmptyState
        size="sm"
        title="No current market data"
        description={`The engine’s market data is stale, so this list says nothing about which markets are open. Engine: “${staleMessage}”`}
      />
    )
  }

  return (
    <EmptyState
      size="sm"
      title="Nothing in the engine’s scan"
      description="The 5- and 15-minute Up-or-Down windows the engine is scanning appear here as its fetcher returns them; right now it holds none."
    />
  )
}
