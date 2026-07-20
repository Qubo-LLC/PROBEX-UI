'use client'

// PnLChart — restored V1 chart shell (git 0e3833a4). Daily/cumulative P&L
// over time has no history endpoint yet (P2-01) — shared PendingChart shell.

import { PendingChart } from '@/components/shared/PendingChart'

export function PnLChart({ height = 200 }: { height?: number }) {
  return <PendingChart title="Daily & Cumulative P&L" endpoint="P2-01" variant="line" height={height} bare />
}
