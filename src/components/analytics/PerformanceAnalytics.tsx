'use client'

// PerformanceAnalytics — Capital Growth (totalValue) and Drawdown (derived
// peak-to-trough %) from /api/portfolio/history.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import { chartStateFromSlice } from '@/components/shared/ChartFrame'
import { formatCurrency } from '@/lib/utils'
import type { PortfolioHistoryPoint } from '@/types/engine'

function toDrawdownSeries(history: PortfolioHistoryPoint[]): LiveChartPoint[] {
  let peak = -Infinity
  return history.map((p) => {
    peak = Math.max(peak, p.totalValue)
    const drawdownPct = peak > 0 ? ((p.totalValue - peak) / peak) * 100 : 0
    return { tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: drawdownPct }
  })
}

export function PerformanceAnalytics() {
  const slice = useApplicationStore((s) => s.engine.portfolioHistory)
  const history = slice.status === 'success' && slice.data ? slice.data.history : []

  // The window these charts actually cover, read off the data rather than
  // asserted. "Since session start" was wrong: this is the engine's retained
  // snapshot window, and its first point is a retention boundary — the same
  // boundary that makes /api/portfolio/summary.initial_value window-relative.
  const windowLabel = useMemo(() => {
    if (history.length < 2) return null
    const first = history[0]
    const last = history[history.length - 1]
    if (!first || !last) return null
    const spanMs = Math.abs(last.ts - first.ts)
    const mins = Math.round(spanMs / 60000)
    const span = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${Math.floor(mins / 1440)}d`
    return `${history.length} snapshots over ${span}, from ${new Date(first.ts).toLocaleString()}`
  }, [history])

  const growthData: LiveChartPoint[] = useMemo(
    () => history.map((p) => ({ tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: p.totalValue })),
    [history],
  )
  const drawdownData = useMemo(() => toDrawdownSeries(history), [history])

  // Both charts read the same slice, so they share one state derivation.
  const { state, message } = chartStateFromSlice(slice, history.length)
  const confirmedAt = slice.data?.timestamp

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <LiveChart
        title="Drawdown"
        subtitle="Peak-to-trough decline, measured within the retained window above"
        source="/api/portfolio/history"
        provenance="derived"
        state={state}
        message={message}
        lastConfirmedAt={confirmedAt}
        data={drawdownData}
        variant="area"
        color="var(--probex-negative)"
        yTickFormatter={(v) => `${v.toFixed(0)}%`}
        valueFormatter={(v) => `${v.toFixed(1)}%`}
      />
      <LiveChart
        title="Capital Growth"
        subtitle={windowLabel ?? 'Account equity across the engine\u2019s retained snapshot window'}
        source="/api/portfolio/history"
        state={state}
        message={message}
        lastConfirmedAt={confirmedAt}
        data={growthData}
        variant="line"
        color="var(--probex-primary)"
        yTickFormatter={(v) => formatCurrency(v, true)}
        valueFormatter={(v) => formatCurrency(v)}
      />
    </div>
  )
}
