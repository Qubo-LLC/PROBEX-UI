'use client'

// ConsensusAccuracyAnalytics — restored V1 concept (ConsensusAnalytics.tsx),
// redirected at a real question: historically, how often has the engine's
// edge signal been right? Distinct from the Consensus page's real-time
// reasoning widgets — this is the backward-looking accuracy record, which
// needs the same historical aggregation the backend doesn't expose yet.

import { PendingChart } from '@/components/shared/PendingChart'

export function ConsensusAccuracyAnalytics() {
  return (
    <PendingChart
      title="Signal Accuracy"
      subtitle="How often the engine's edge direction has matched the eventual market resolution"
      endpoint="consensusAccuracy"
      variant="line"
    />
  )
}
