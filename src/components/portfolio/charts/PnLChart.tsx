'use client'

// PnLChart — originally P2-01 (no backend). 2026-07-22: /api/portfolio/history
// carries realized_pnl per snapshot — rendered via the shared LiveChart
// primitive.

import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import { chartStateFromSlice, staleBySeriesAge } from '@/components/shared/ChartFrame'
import { formatCurrency, formatSignedCurrency } from '@/lib/utils'

export function PnLChart({ height = 200 }: { height?: number }) {
  const slice = useApplicationStore((s) => s.engine.portfolioHistory)
  const data: LiveChartPoint[] = slice.status === 'success' && slice.data
    ? slice.data.history.map((p) => ({ tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: p.realizedPnl }))
    : []

  // The series is cumulative REALIZED P&L, and it is signed. A fixed
  // --synatra-positive line drew an 85-dollar loss in the profit colour; the
  // financial-direction band has to follow the value, not the chart's identity.
  const last = data.length > 0 ? data[data.length - 1]!.value : 0
  const seriesColor = last < 0 ? 'var(--synatra-negative)' : 'var(--synatra-positive)'

  // Real state, not just "has rows": an errored slice is unavailable and an
  // available:false envelope is idle — both look like zero rows otherwise.
  const { state: sliceState, message } = chartStateFromSlice(slice, data.length)
  // The series ends at the newest SNAPSHOT (history is chronological at the
  // adapter), not at the poll — see staleBySeriesAge.
  const newestTs = slice.data?.history.length ? slice.data.history[slice.data.history.length - 1]!.ts : undefined
  const state = staleBySeriesAge(sliceState, newestTs)

  return (
    <LiveChart
      title="Realized P&L"
      state={state}
      message={message}
      {...(newestTs !== undefined ? { lastConfirmedAt: newestTs } : {})}
      source="/api/portfolio/history"
      data={data}
      variant="line"
      height={height}
      color={seriesColor}
      yTickFormatter={(v) => formatCurrency(v, true)}
      valueFormatter={(v) => formatSignedCurrency(v)}
    />
  )
}
