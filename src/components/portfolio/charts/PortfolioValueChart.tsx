'use client'

// PortfolioValueChart — originally P2-01 (no backend). 2026-07-22:
// /api/portfolio/history is live (107 snapshots observed) — rendered via the
// shared LiveChart primitive.

import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import { formatCurrency } from '@/lib/utils'

export function PortfolioValueChart({ height = 200 }: { height?: number }) {
  const slice = useApplicationStore((s) => s.engine.portfolioHistory)
  const data: LiveChartPoint[] = slice.status === 'success' && slice.data
    ? slice.data.history.map((p) => ({ tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: p.totalValue }))
    : []

  return (
    <LiveChart
      title="Portfolio Value"
      source="/api/portfolio/history"
      data={data}
      variant="area"
      height={height}
      bare
      color="var(--probex-primary)"
      yTickFormatter={(v) => formatCurrency(v, true)}
      valueFormatter={(v) => formatCurrency(v)}
    />
  )
}
