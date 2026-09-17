'use client'

// PortfolioValueChart — originally P2-01 (no backend). 2026-07-22:
// /api/portfolio/history is live (107 snapshots observed) — rendered via the
// shared LiveChart primitive.

import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import { chartStateFromSlice, staleBySeriesAge } from '@/components/shared/ChartFrame'
import { formatCurrency } from '@/lib/utils'

export function PortfolioValueChart({ height = 200 }: { height?: number }) {
  const slice = useApplicationStore((s) => s.engine.portfolioHistory)
  const data: LiveChartPoint[] = slice.status === 'success' && slice.data
    ? slice.data.history.map((p) => ({ tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: p.totalValue }))
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
      title="Portfolio Value"
      state={state}
      message={message}
      {...(newestTs !== undefined ? { lastConfirmedAt: newestTs } : {})}
      source="/api/portfolio/history"
      data={data}
      variant="area"
      height={height}
      color="var(--probex-primary)"
      yTickFormatter={(v) => formatCurrency(v, true)}
      valueFormatter={(v) => formatCurrency(v)}
    />
  )
}
