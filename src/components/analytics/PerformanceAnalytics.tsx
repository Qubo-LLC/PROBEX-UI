'use client'

// PerformanceAnalytics — restored V1 chart-shell concept, redirected at real
// capital metrics per the Phase 5 classification (Drawdown, Capital Growth
// are both explicitly requested real analytics categories). Neither has a
// backend history endpoint yet (P2-01, same dependency as Portfolio's
// charts) — shared PendingChart shell, never fabricated.

import { PendingChart } from '@/components/shared/PendingChart'

export function PerformanceAnalytics() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <PendingChart title="Drawdown" subtitle="Peak-to-trough capital decline over time" endpoint="P2-01" variant="area" />
      <PendingChart title="Capital Growth" subtitle="Account equity curve since inception" endpoint="P2-01" variant="line" />
    </div>
  )
}
