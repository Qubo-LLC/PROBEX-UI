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
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'
import { PageHeader } from '@/components/ui/PageHeader'

export function AnalyticsPage() {
  return (
    // Analytics is an evidence surface: the reader is asking what the history
    // shows, not which endpoint served it. Four raw paths rendered as body text
    // before this. System is the surface that may expose lineage prominently —
    // this one should not.
    <ProvenanceScope detail="tooltip">
    <div className="page-container flex flex-col gap-5 pb-8 animate-fade-in-up">
      <PageHeader
        title="Analytics"
        subtitle="How the system has performed over time — edge quality, capital efficiency, and trading results"
      />

      {/* Narrative order: what happened → why → where it came from.
          The page previously opened on Edge & Sizing — a sizing input — so the
          first thing a reader met was a parameter of the strategy rather than its
          result. Performance History is the primary analytical view and now
          leads; edge quality and Kelly sizing become the comparative detail that
          explains it; attribution is the supporting breakdown. */}
      <section className="flex flex-col gap-3">
        <h2 className="t-section-title">Performance History</h2>
        <PerformanceAnalytics />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="t-section-title">Edge Quality &amp; Sizing</h2>
        <p className="text-xs" style={{ color: 'var(--probex-text-muted)' }}>
          The inputs behind the curve above — how large the detected edges were, and how much of the
          Kelly allowance the engine actually deployed.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          <EdgeQualityAnalytics />
          <KellyUtilization />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="t-section-title">Attribution</h2>
        <AnalyticsEngineStatus />
        <SegmentPerformance />
      </section>

      <IntelligenceModule
        title="Signal Accuracy"
        description="How often the engine's edge direction has matched the eventual market resolution — activates once resolution outcomes are joined to signal history"
        // Human-readable, not the registry key — see ConsensusAccuracyAnalytics.
        endpoint="Consensus accuracy"
      >
        <ConsensusAccuracyAnalytics />
      </IntelligenceModule>
    </div>
    </ProvenanceScope>
  )
}
