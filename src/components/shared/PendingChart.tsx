'use client'

// PendingChart — shared recharts "awaiting backend" shell (first used in V3
// Phase 3's ConfidenceEvolution/ConsensusHistoryChart, extracted here so
// Phase 4's Portfolio charts don't duplicate it a third/fourth/fifth time).
// Full chart shell (grid, axes) renders at full visual weight; a flat
// placeholder series only shapes the axes — never real data — and an
// explicit caption states the series is pending. One ProvenanceBadge in the
// header states which endpoint activates it.

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { ProvenanceBadge } from './ProvenanceBadge'

const PLACEHOLDER = Array.from({ length: 8 }, (_, i) => ({ tick: `T-${7 - i}`, value: 50 }))

interface PendingChartProps {
  title:       string
  subtitle?:   string
  endpoint:    string
  /** 'area' draws a filled gradient band (e.g. value/confidence over time);
   *  'line' draws a plain dashed line (e.g. a running score). */
  variant?:    'area' | 'line'
  height?:     number
  /** Render inside a bordered card (default) or bare, when the caller
   *  supplies its own Card/ChartCard framing. */
  bare?:       boolean
}

export function PendingChart({ title, subtitle, endpoint, variant = 'area', height = 200, bare = false }: PendingChartProps) {
  const chart = (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={PLACEHOLDER} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          {variant === 'area' && (
            <defs>
              <linearGradient id={`pending-${endpoint}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--probex-text-disabled)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--probex-text-disabled)" stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          <CartesianGrid strokeDasharray="3 3" stroke="var(--probex-border)" vertical={false} />
          <XAxis dataKey="tick" tick={{ fill: 'var(--probex-text-disabled)', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: 'var(--probex-text-disabled)', fontSize: 10 }} tickLine={false} axisLine={false} width={34} tickFormatter={(v: number) => `${v}%`} />
          {variant === 'area' ? (
            <Area type="monotone" dataKey="value" stroke="var(--probex-text-disabled)" strokeWidth={1.5} strokeDasharray="4 4" fill={`url(#pending-${endpoint})`} isAnimationActive={false} />
          ) : (
            <Line type="monotone" dataKey="value" stroke="var(--probex-text-disabled)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-2xs font-semibold px-2.5 py-1 rounded" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)', color: 'var(--probex-text-disabled)' }}>
          Awaiting {title.toLowerCase()} — {endpoint}
        </span>
      </div>
    </div>
  )

  if (bare) return chart

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>{title}</h2>
          {subtitle && <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>{subtitle}</p>}
        </div>
        <ProvenanceBadge provenance="awaiting" detail={endpoint} />
      </div>
      <div className="p-4">{chart}</div>
    </div>
  )
}
