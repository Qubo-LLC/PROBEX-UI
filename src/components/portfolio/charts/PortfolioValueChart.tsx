'use client'

// PortfolioValueChart — restored V1 chart shell (git 0e3833a4). No portfolio
// value history endpoint exists yet (P2-01) — renders via the shared
// PendingChart shell inside the caller's own ChartCard framing.

import { PendingChart } from '@/components/shared/PendingChart'

export function PortfolioValueChart({ height = 200 }: { height?: number }) {
  return <PendingChart title="Portfolio Value" endpoint="P2-01" variant="area" height={height} bare />
}
