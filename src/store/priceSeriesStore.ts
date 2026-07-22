'use client'

// priceSeriesStore — client-side accumulation of the engine's price feed into a
// real, honest market series. /api/price-history returns a short rolling buffer;
// this store MERGES the polled points over the session (deduped by second,
// capped) so the Overview hero can draw a continuous live curve from OBSERVED
// prices — no data is invented. Session-only (not persisted): history rebuilds
// live rather than being faked from storage.
//
// Feed-agnostic: ingest() accepts points from ANY source. Today the polling
// layer feeds it; a future WebSocket feeds the SAME method — the chart never
// needs to change when the transport does.

import { create } from 'zustand'

/** One observed price sample. `time` is epoch SECONDS (lightweight-charts unit). */
export interface Sample { time: number; price: number }

const MAX_SAMPLES = 5400   // ~3h at a 2s cadence — bounded memory

interface PriceSeriesState {
  samples: Sample[]
  ingest: (points: Array<{ ts: number; price: number }>) => void
}

export const usePriceSeriesStore = create<PriceSeriesState>((set) => ({
  samples: [],
  ingest: (points) =>
    set((s) => {
      if (points.length === 0) return s
      const map = new Map<number, number>()
      for (const x of s.samples) map.set(x.time, x.price)
      for (const p of points) {
        const time = Math.floor(p.ts / 1000) // ms → s
        if (Number.isFinite(time) && Number.isFinite(p.price)) map.set(time, p.price)
      }
      const merged = [...map.entries()]
        .map(([time, price]) => ({ time, price }))
        .sort((a, b) => a.time - b.time)
      const capped = merged.length > MAX_SAMPLES ? merged.slice(merged.length - MAX_SAMPLES) : merged

      const prev = s.samples
      const a = capped[capped.length - 1]
      const b = prev[prev.length - 1]
      if (capped.length === prev.length && a && b && a.time === b.time && a.price === b.price) return s

      return { samples: capped }
    }),
}))
