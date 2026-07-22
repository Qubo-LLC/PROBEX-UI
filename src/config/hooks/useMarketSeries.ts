'use client'

// useMarketSeries — accumulates the polled BTC price feed (via
// useEnginePriceChart) into the session price series and returns a continuous
// line of OBSERVED prices for the Overview hero's live curve. The chart mode is
// intentionally line-only here: the Overview prioritises trend/direction, while
// candlesticks belong on Markets / Market Detail (derivable from the same
// samples when that data lands).
//
// Feed-agnostic: swapping polling → WebSocket later means feeding ingest() from
// the socket instead — this hook and the chart do not change.

import { useEffect, useMemo } from 'react'
import { usePriceSeriesStore } from '@/store/priceSeriesStore'
import { useEnginePriceChart } from './useServices'

export interface LiveMarketSeries {
  /** Observed price samples as chart points ({ time: sec, value: price }). */
  points:  Array<{ time: number; value: number }>
  hasData: boolean
  up:      boolean
}

export function useMarketSeries(): LiveMarketSeries {
  const chart   = useEnginePriceChart()
  const ingest  = usePriceSeriesStore((s) => s.ingest)
  const samples = usePriceSeriesStore((s) => s.samples)

  useEffect(() => {
    const pts = chart.data?.points
    if (pts && pts.length) ingest(pts.map((p) => ({ ts: p.ts, price: p.price })))
  }, [chart.data, ingest])

  const points = useMemo(() => samples.map((s) => ({ time: s.time, value: s.price })), [samples])

  return { points, hasData: points.length > 1, up: (chart.data?.priceChange ?? 0) >= 0 }
}
