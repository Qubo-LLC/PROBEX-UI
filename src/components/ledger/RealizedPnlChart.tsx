'use client'

// RealizedPnlChart — cumulative realized P&L across settled sleeve trades.
//
// The series is built client-side (lib/mappers/ledger.ts, buildCumulativeRealizedSeries)
// from the SAME settled-trade records the table above renders — never a
// manufactured curve from a single summary figure. provenance='derived' names
// that honestly: these points were computed here, not read as a series from
// any endpoint. If the ledger has fewer than 2 settled trades there is no
// meaningful curve to draw, and the caller (TradeLedgerTable) does not mount
// this component at all rather than show a one-point "chart".

import { useMemo } from 'react'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import type { CumulativePnlPoint } from '@/lib/mappers/ledger'
import { formatSignedCurrency } from '@/lib/utils'
import { stamp } from '@/lib/display/time'

export function RealizedPnlChart({ series }: { series: CumulativePnlPoint[] }) {
  const data: LiveChartPoint[] = useMemo(
    () => series.map((p) => ({ tick: stamp(p.tsMs), value: p.cumulativePnl })),
    [series],
  )
  const latest = series.at(-1) ?? null

  return (
    <LiveChart
      title="Cumulative realized P&L"
      subtitle="Settled sleeve trades, in close order"
      source="/sleeves/trades/ledger (derived)"
      provenance="derived"
      data={data}
      variant="line"
      height={160}
      windowSize={0}
      color={latest !== null && latest.cumulativePnl < 0 ? 'var(--synatra-negative)' : 'var(--synatra-positive)'}
      valueFormatter={(v) => formatSignedCurrency(v)}
      yTickFormatter={(v) => formatSignedCurrency(v, true)}
      {...(latest !== null ? { currentValue: formatSignedCurrency(latest.cumulativePnl), lastConfirmedAt: latest.tsMs } : {})}
      summary={
        latest !== null
          ? `Cumulative realized profit and loss across ${series.length} settled trades, ending at ${formatSignedCurrency(latest.cumulativePnl)}.`
          : 'No settled trades to chart.'
      }
    />
  )
}
