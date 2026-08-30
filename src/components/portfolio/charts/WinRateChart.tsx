'use client'

// WinRateChart — originally P2-01 (no backend). 2026-07-22:
// /api/portfolio/history carries win_rate per snapshot — rendered via the
// shared LiveChart primitive.

import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import { chartStateFromSlice } from '@/components/shared/ChartFrame'

export function WinRateChart({ height = 160 }: { height?: number }) {
  const slice = useApplicationStore((s) => s.engine.portfolioHistory)
  const data: LiveChartPoint[] = slice.status === 'success' && slice.data
    ? slice.data.history.map((p) => ({ tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: p.winRate }))
    : []

  // Real state, not just "has rows": an errored slice is unavailable and an
  // available:false envelope is idle — both look like zero rows otherwise.
  const { state, message } = chartStateFromSlice(slice, data.length)

  return (
    <LiveChart
      title="Rolling Win Rate"
      state={state}
      message={message}
      lastConfirmedAt={slice.data?.timestamp}
      source="/api/portfolio/history"
      data={data}
      variant="area"
      height={height}
      bare
      color="var(--probex-yes)"
      yTickFormatter={(v) => `${Math.round(v * 100)}%`}
      valueFormatter={(v) => `${(v * 100).toFixed(1)}%`}
    />
  )
}
