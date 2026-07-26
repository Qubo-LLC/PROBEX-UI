'use client'

// AnalyticsPage — V3 Phase 5 assembly root. V1's Analytics was the most
// fabricated area of the original product (ETF flows, institutional flow,
// on-chain intelligence, consensus accuracy — all decorative, none backed by
// a plan PROBEX's own backend will ever implement for a Bitcoin 5-minute
// binary-market bot).
//
// 2026-07-22 redeploy status:
//   Fully Live    → EdgeQualityAnalytics, KellyUtilization (unchanged),
//                   PerformanceAnalytics (/api/portfolio/history),
//                   SegmentPerformance (repointed to /api/survival/patterns —
//                   the fictional Bitcoin-category taxonomy it originally
//                   assumed never existed on the backend)
//   Still Awaiting → ConsensusAccuracyAnalytics: no endpoint anywhere joins
//                   edge direction to eventual market resolution outcomes —
//                   genuinely no backend concept for this yet.
//   No Longer Appropriate → ETF flows / institutional flow / on-chain
//                   intelligence / macro indicators — not rebuilt.

import { EdgeQualityAnalytics } from './EdgeQualityAnalytics'
import { KellyUtilization } from './KellyUtilization'
import { PerformanceAnalytics } from './PerformanceAnalytics'
import { SegmentPerformance } from './SegmentPerformance'
import { AnalyticsEngineStatus } from './AnalyticsEngineStatus'
import { ConsensusAccuracyAnalytics } from './ConsensusAccuracyAnalytics'
import { IntelligenceModule } from '@/components/shared/IntelligenceModule'

export function AnalyticsPage() {
  return (
    <div className="page-container flex flex-col gap-5 pb-8 animate-fade-in-up">
      <div>
        <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--probex-text-primary)' }}>Analytics</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--probex-text-muted)' }}>Deeper analysis of edge quality, capital efficiency, and trading performance</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>Edge & Sizing</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          <EdgeQualityAnalytics />
          <KellyUtilization />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>Performance History</h2>
        <PerformanceAnalytics />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>Attribution</h2>
        <AnalyticsEngineStatus />
        <SegmentPerformance />
      </section>

      <IntelligenceModule
        title="Signal Accuracy"
        description="How often the engine's edge direction has matched the eventual market resolution — activates once resolution outcomes are joined to signal history"
        endpoint="consensusAccuracy"
      >
        <ConsensusAccuracyAnalytics />
      </IntelligenceModule>
    </div>
  )
}
