'use client'

// PerformanceAnalytics — Capital Growth (totalValue) and Drawdown (derived
// peak-to-trough %) from /api/portfolio/history.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
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

  const growthData: LiveChartPoint[] = useMemo(
    () => history.map((p) => ({ tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: p.totalValue })),
    [history],
  )
  const drawdownData = useMemo(() => toDrawdownSeries(history), [history])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <LiveChart
        title="Drawdown"
        subtitle="Peak-to-trough capital decline over time"
        source="/api/portfolio/history"
        provenance="derived"
        data={drawdownData}
        variant="area"
        color="var(--probex-negative)"
        yTickFormatter={(v) => `${v.toFixed(0)}%`}
        valueFormatter={(v) => `${v.toFixed(1)}%`}
      />
      <LiveChart
        title="Capital Growth"
        subtitle="Account equity curve since session start"
        source="/api/portfolio/history"
        data={growthData}
        variant="line"
        color="var(--probex-primary)"
        yTickFormatter={(v) => formatCurrency(v, true)}
        valueFormatter={(v) => formatCurrency(v)}
      />
    </div>
  )
}
