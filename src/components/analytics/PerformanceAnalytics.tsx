'use client'

// PerformanceAnalytics — Capital Growth (totalValue) and Drawdown (derived
// peak-to-trough %) from /api/portfolio/history.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import { chartStateFromSlice, staleBySeriesAge } from '@/components/shared/ChartFrame'
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
  // Chronological, whatever order the wire uses. /api/portfolio/history
  // returns snapshots NEWEST FIRST (verified 2026-09-15: 23:31 → 22:35), and
  // both series were plotted in wire order — so the time axis ran backwards
  // and the running-peak drawdown was computed against the future: the
  // oldest snapshot ($100.00, the retention boundary) rendered as a −100%
  // drawdown from a peak it had not yet reached. Sorting once here fixes the
  // axis, the drawdown and the window caption together.
  const history = useMemo(
    () => (slice.status === 'success' && slice.data ? [...slice.data.history].sort((a, b) => a.ts - b.ts) : []),
    [slice.status, slice.data],
  )

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
  const { state: sliceState, message } = chartStateFromSlice(slice, history.length)
  // Confirmed as of the newest SNAPSHOT, not the poll that fetched it.
  const confirmedAt = history.length > 0 ? history[history.length - 1]!.ts : undefined
  const state = staleBySeriesAge(sliceState, confirmedAt)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <LiveChart
        title="Drawdown"
        subtitle="Peak-to-trough decline, measured within the retained window above"
        source="/api/portfolio/history"
        provenance="derived"
        state={state}
        message={message}
        {...(confirmedAt !== undefined ? { lastConfirmedAt: confirmedAt } : {})}
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
        {...(confirmedAt !== undefined ? { lastConfirmedAt: confirmedAt } : {})}
        data={growthData}
        variant="line"
        color="var(--probex-primary)"
        yTickFormatter={(v) => formatCurrency(v, true)}
        valueFormatter={(v) => formatCurrency(v)}
      />
    </div>
  )
}
