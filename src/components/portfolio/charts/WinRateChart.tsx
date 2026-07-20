'use client'

// WinRateChart — restored V1 chart shell (git 0e3833a4). Rolling win rate
// over time has no history endpoint yet (P2-01) — shared PendingChart shell.
// (The current, single-point win rate IS live — see PortfolioMetrics —
// this chart is specifically the trend over time, which requires history.)

import { PendingChart } from '@/components/shared/PendingChart'

export function WinRateChart({ height = 160 }: { height?: number }) {
  return <PendingChart title="Rolling Win Rate" endpoint="P2-01" variant="area" height={height} bare />
}
