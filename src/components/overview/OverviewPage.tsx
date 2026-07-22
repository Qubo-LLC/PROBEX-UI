'use client'

// OverviewPage — Phase 6A hierarchy rework. The page previously opened with
// Global Consensus (an awaiting-backend promise) before any proof the engine
// was alive. New reading order, top to bottom:
//
//   Live BTC → Engine Health → Capital → Performance → Engine Intelligence → Consensus
//
// Every step before "Engine Intelligence" is fully live. Consensus — the one
// awaiting-backend element in this sequence — now closes the page instead of
// opening it. Widget content is unchanged from V3 Phase 1; only the
// sequence and framing changed (EnginePulseCard split into EngineVitals'
// three focal sections; GlobalConsensusBar trimmed to just the Consensus
// segment — see both files for the full reasoning).

import { EngineFocusHero }                       from './EngineFocusHero'
import { EngineHealthBanner, CapitalPerformanceRow } from './EngineVitals'
import { GlobalConsensusBar } from './GlobalConsensusBar'
import { FeaturedMarkets }    from './FeaturedMarkets'
import { TrendingMarkets }    from './TrendingMarkets'
import { ActivityFeed }       from './ActivityFeed'
import { Footer }             from '@/components/layout/Footer'

export function OverviewPage() {
  return (
    <div className="page-container animate-fade-in-up" style={{ paddingBottom: 0 }}>
      <h1 className="sr-only">PROBEX Overview</h1>

      <div className="flex flex-col gap-4">
        {/* 1 · Engine Focus hero — live BTC market (trader) + rotating engine
               state (AI). Proof-first: real price/edge/posture/record only. */}
        <EngineFocusHero />

        {/* 2 · Engine Health — is it alive, is anything wrong */}
        <EngineHealthBanner />

        {/* 3-4 · Capital & Performance — real money, real targets */}
        <CapitalPerformanceRow />
      </div>

      {/* 5 · Markets & Engine Intelligence — the hybrid thesis, stated once:
             the market is the trader's field to watch; the engine marks where it
             sees an edge and acts in the feed alongside. */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--probex-text-primary)' }}>
            Markets &amp; Engine Intelligence
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>
            The market is yours to watch — the engine marks where it sees an edge, and acts in the feed alongside.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="min-w-0 flex flex-col gap-7">
            <FeaturedMarkets />
            <TrendingMarkets />
          </div>

          <aside className="flex flex-col gap-4 xl:sticky xl:top-5">
            <ActivityFeed className="max-h-[420px]" />
          </aside>
        </div>
      </div>

      {/* 6 · Consensus — the one awaiting-backend promise, closes the page rather than opening it */}
      <div className="mt-7">
        <GlobalConsensusBar />
      </div>

      <Footer />
    </div>
  )
}
