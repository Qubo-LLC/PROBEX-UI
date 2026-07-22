'use client'

// LiveChart — the real-data counterpart to PendingChart, sharing its exact
// visual grammar (same grid/axis styling, same card wrapper) so a widget's
// appearance doesn't change the moment its backing endpoint goes live —
// only the ProvenanceBadge and the series itself do. Introduced 2026-07-22
// when /api/consensus/history and /api/portfolio/history both went live,
// replacing 5 separate PendingChart placeholders (ConfidenceEvolution,
// ConsensusHistoryChart, PortfolioValueChart, PnLChart, WinRateChart) —
// one real primitive instead of duplicating chart-shell code five times.

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { ProvenanceBadge, type Provenance } from './ProvenanceBadge'
import { EmptyState } from '@/components/ui/EmptyState'

export interface LiveChartPoint {
  tick:  string | number
  value: number
}

interface LiveChartProps {
  title:      string
  subtitle?:  string
  /** Endpoint path shown in the ProvenanceBadge, e.g. "/api/consensus/history". */
  source:     string
  /** 'live' (direct from the endpoint) or 'derived' (computed client-side
   *  from a live series, e.g. a drawdown curve). Defaults to 'live'. */
  provenance?: Provenance
  data:       LiveChartPoint[]
  variant?:   'area' | 'line'
  height?:    number
  bare?:      boolean
  color?:     string
  yTickFormatter?: (v: number) => string
  valueFormatter?: (v: number) => string
  emptyTitle?: string
  emptyDescription?: string
}

export function LiveChart({
  title, subtitle, source, provenance = 'live', data, variant = 'area', height = 200, bare = false,
  color = 'var(--probex-primary)',
  yTickFormatter = (v) => String(v),
  valueFormatter = (v) => String(v),
  emptyTitle = 'No history yet',
  emptyDescription = 'This chart populates as the session accumulates data.',
}: LiveChartProps) {
  const gradientId = `live-${title.replace(/\s+/g, '-').toLowerCase()}`

  const chart = data.length === 0 ? (
    <div style={{ height }} className="flex items-center justify-center">
      <EmptyState size="sm" title={emptyTitle} description={emptyDescription} />
    </div>
  ) : (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        {variant === 'area' && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
        )}
        <CartesianGrid strokeDasharray="3 3" stroke="var(--probex-border)" vertical={false} />
        <XAxis dataKey="tick" tick={{ fill: 'var(--probex-text-disabled)', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={{ fill: 'var(--probex-text-disabled)', fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={yTickFormatter} />
        <Tooltip
          contentStyle={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border-default)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: 'var(--probex-text-muted)' }}
          formatter={(v: number) => valueFormatter(v)}
        />
        {variant === 'area' ? (
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#${gradientId})`} isAnimationActive={false} />
        ) : (
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )

  if (bare) return chart

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>{title}</h2>
          {subtitle && <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>{subtitle}</p>}
        </div>
        <ProvenanceBadge provenance={provenance} detail={source} />
      </div>
      <div className="p-4">{chart}</div>
    </div>
  )
}
