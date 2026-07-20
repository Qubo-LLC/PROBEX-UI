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

import { LiveBtcHero, EngineHealthBanner, CapitalPerformanceRow } from './EngineVitals'
import { GlobalConsensusBar } from './GlobalConsensusBar'
import { HeroCarousel }       from './HeroCarousel'
import { FeaturedMarkets }    from './FeaturedMarkets'
import { TrendingMarkets }    from './TrendingMarkets'
import { ActivityFeed }       from './ActivityFeed'
import { Footer }             from '@/components/layout/Footer'

export function OverviewPage() {
  return (
    <div className="page-container animate-fade-in-up" style={{ paddingBottom: 0 }}>
      <h1 className="sr-only">PROBEX Overview</h1>

      <div className="flex flex-col gap-4">
        {/* 1 · Live BTC — the page's hero number, proof-first */}
        <LiveBtcHero />

        {/* 2 · Engine Health — is it alive, is anything wrong */}
        <EngineHealthBanner />

        {/* 3-4 · Capital & Performance — real money, real targets */}
        <CapitalPerformanceRow />
      </div>

      {/* 5 · Engine Intelligence: what the engine is watching + doing, live activity alongside */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start mt-7">
        <div className="min-w-0 flex flex-col gap-7">
          <section>
            <HeroCarousel />
          </section>
          <FeaturedMarkets />
          <TrendingMarkets />
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-5">
          <ActivityFeed className="max-h-[420px]" />
        </aside>
      </div>

      {/* 6 · Consensus — the one awaiting-backend promise, closes the page rather than opening it */}
      <div className="mt-7">
        <GlobalConsensusBar />
      </div>

      <Footer />
    </div>
  )
}
