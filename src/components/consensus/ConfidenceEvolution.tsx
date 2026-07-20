'use client'

// ConfidenceEvolution — restored V1 chart shell (git 0e3833a4): how the
// engine's confidence in a market has moved over time, with an uncertainty
// band. No confidence-history endpoint exists yet (CE-4) — renders via the
// shared PendingChart shell (Phase 4 extracted this from what was originally
// duplicated per-chart code here and in ConsensusHistoryChart).

import { PendingChart } from '@/components/shared/PendingChart'

export function ConfidenceEvolution() {
  return (
    <PendingChart
      title="Confidence Evolution"
      subtitle="Prediction confidence over time with uncertainty band"
      endpoint="CE-4"
      variant="area"
    />
  )
}
