'use client'

// AnalyticsPage — V3 Phase 5 assembly root. V1's Analytics was the most
// fabricated area of the original product (ETF flows, institutional flow,
// on-chain intelligence, consensus accuracy — all decorative, none backed by
// a plan PROBEX's own backend will ever implement for a Bitcoin 5-minute
// binary-market bot). Per explicit Phase 5 direction, every widget below was
// classified before being built:
//
//   Fully Live               → EdgeQualityAnalytics, KellyUtilization
//   Awaiting Backend         → PerformanceAnalytics (P2-01), SegmentPerformance,
//                               ConsensusAccuracyAnalytics
//   No Longer Appropriate    → ETF flows / institutional flow / on-chain
//                               intelligence / macro indicators — NOT rebuilt;
//                               see the Phase 5 report for the full reasoning.

import { EdgeQualityAnalytics } from './EdgeQualityAnalytics'
import { KellyUtilization } from './KellyUtilization'
import { PerformanceAnalytics } from './PerformanceAnalytics'
import { SegmentPerformance } from './SegmentPerformance'
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

      <IntelligenceModule
        title="Performance History"
        description="Drawdown and capital growth over time — activates automatically as P2-01 ships"
        endpoint="P2-01"
      >
        <PerformanceAnalytics />
      </IntelligenceModule>

      <IntelligenceModule
        title="Attribution"
        description="Which segments and signals are driving results — activates automatically as trade-level history ships"
        endpoint="segmentPerformance / consensusAccuracy"
      >
        <div className="flex flex-col gap-3">
          <SegmentPerformance />
          <ConsensusAccuracyAnalytics />
        </div>
      </IntelligenceModule>
    </div>
  )
}
