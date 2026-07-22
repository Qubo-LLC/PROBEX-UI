'use client'

// PnLChart — originally P2-01 (no backend). 2026-07-22: /api/portfolio/history
// carries realized_pnl per snapshot — rendered via the shared LiveChart
// primitive.

import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import { formatCurrency, formatSignedCurrency } from '@/lib/utils'

export function PnLChart({ height = 200 }: { height?: number }) {
  const slice = useApplicationStore((s) => s.engine.portfolioHistory)
  const data: LiveChartPoint[] = slice.status === 'success' && slice.data
    ? slice.data.history.map((p) => ({ tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: p.realizedPnl }))
    : []

  return (
    <LiveChart
      title="Daily & Cumulative P&L"
      source="/api/portfolio/history"
      data={data}
      variant="line"
      height={height}
      bare
      color="var(--probex-positive)"
      yTickFormatter={(v) => formatCurrency(v, true)}
      valueFormatter={(v) => formatSignedCurrency(v)}
    />
  )
}
