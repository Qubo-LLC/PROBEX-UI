'use client'

// WinRateChart — originally P2-01 (no backend). 2026-07-22:
// /api/portfolio/history carries win_rate per snapshot — rendered via the
// shared LiveChart primitive.

import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import { chartStateFromSlice, staleBySeriesAge } from '@/components/shared/ChartFrame'

export function WinRateChart({ height = 160 }: { height?: number }) {
  const slice = useApplicationStore((s) => s.engine.portfolioHistory)
  const data: LiveChartPoint[] = slice.status === 'success' && slice.data
    ? slice.data.history.map((p) => ({ tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: p.winRate }))
    : []

  // Real state, not just "has rows": an errored slice is unavailable and an
  // available:false envelope is idle — both look like zero rows otherwise.
  const { state: sliceState, message } = chartStateFromSlice(slice, data.length)
  // The series ends at the newest SNAPSHOT (history is chronological at the
  // adapter), not at the poll — see staleBySeriesAge.
  const newestTs = slice.data?.history.length ? slice.data.history[slice.data.history.length - 1]!.ts : undefined
  const state = staleBySeriesAge(sliceState, newestTs)

  return (
    <LiveChart
      title="Rolling Win Rate"
      state={state}
      message={message}
      {...(newestTs !== undefined ? { lastConfirmedAt: newestTs } : {})}
      source="/api/portfolio/history"
      data={data}
      variant="area"
      height={height}
      // --probex-yes is the MARKET-SIDE band. A win rate is not a YES.
      color="var(--probex-primary)"
      yTickFormatter={(v) => `${Math.round(v * 100)}%`}
      valueFormatter={(v) => `${(v * 100).toFixed(1)}%`}
    />
  )
}
