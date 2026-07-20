'use client'

// ConsensusHistoryChart — restored V1 chart shell (git 0e3833a4): the
// consensus score's trajectory over the session. No consensus-history
// endpoint exists yet (CE-3) — renders via the shared PendingChart shell.

import { PendingChart } from '@/components/shared/PendingChart'

export function ConsensusHistoryChart() {
  return (
    <PendingChart
      title="Consensus History"
      subtitle="Platform-wide consensus score over the session"
      endpoint="CE-3"
      variant="line"
    />
  )
}
