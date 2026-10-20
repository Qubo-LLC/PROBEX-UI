'use client'

// Equity curves per sleeve and combined, one point per booked fill, settlement
// and profit-lock sweep (equity at cost: allocation + realized PnL − reserve).
// With a real-sizer view selected, that view's own curve is shown instead.

import { useMemo } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { CurvePoint, Runway } from '@/types/runway'
import { VIEW_LABELS, type SizingView } from './RunwayGroup'

const COLORS: Record<string, string> = {
  CRYPTO: 'var(--synatra-primary)',
  EVENTS: 'var(--synatra-warning)',
  HOUSE: 'var(--synatra-positive)',
  COMBINED: 'var(--synatra-text-secondary)',
}

/** Merge several step series onto one time axis, carrying each series' last value forward. */
export function mergeCurves(series: Record<string, CurvePoint[]>): Array<Record<string, number>> {
  const times = Array.from(new Set(Object.values(series).flatMap((pts) => pts.map((p) => p.tsMs)))).sort((a, b) => a - b)
  const last: Record<string, number | undefined> = {}
  const idx: Record<string, number> = Object.fromEntries(Object.keys(series).map((k) => [k, 0]))
  return times.map((t) => {
    const row: Record<string, number> = { t }
    for (const [k, pts] of Object.entries(series)) {
      let i = idx[k] ?? 0
      for (let p = pts[i]; p !== undefined && p.tsMs <= t; p = pts[++i]) last[k] = p.equity
      idx[k] = i
      const v = last[k]
      if (v !== undefined) row[k] = v
    }
    return row
  })
}

export function EquityCurves({ runway, view }: { runway: Runway; view: SizingView }) {
  const series = useMemo(() => {
    if (view !== 'research') {
      const v = runway.views[view]
      return v ? { [VIEW_LABELS[view]]: v.curve } : {}
    }
    return runway.equityCurves
  }, [runway, view])
  const data = useMemo(() => mergeCurves(series), [series])
  const keys = Object.keys(series)

  if (data.length === 0) {
    return <p className="t-description mt-4">No booked events yet — the curve starts with the first fill.</p>
  }
  return (
    <div className="mt-5" style={{ height: 220 }} aria-label="Equity curves">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--synatra-border)" strokeDasharray="2 4" />
          <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} scale="time"
                 tickFormatter={(t: number) => new Date(t).toISOString().slice(11, 16)} fontSize={11} />
          <YAxis width={56} fontSize={11} tickFormatter={(v: number) => formatCurrency(v)} domain={['auto', 'auto']} />
          <Tooltip labelFormatter={(t: number) => new Date(t).toISOString().replace('T', ' ').slice(0, 19) + 'Z'}
                   formatter={(v: number) => formatCurrency(v)} />
          <Legend />
          {keys.map((k) => (
            <Line key={k} type="stepAfter" dataKey={k} dot={false} isAnimationActive={false}
                  stroke={COLORS[k] ?? 'var(--synatra-primary)'} strokeWidth={k === 'COMBINED' ? 2 : 1.5} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
