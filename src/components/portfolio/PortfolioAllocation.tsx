'use client'

// PortfolioAllocation — restored from V1 (git 0e3833a4). V1's third column
// broke positions down "by consensus category" (fabricated). V3 replaces it
// with a genuinely live breakdown: By P&L state — how much deployed capital
// currently sits in a profit vs. a loss position. Segment and side
// breakdowns were already truthful in V1 and are restored unchanged in spirit.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parsePositionRows, type PositionRow } from '@/lib/mappers/positions'
import { formatCurrency } from '@/lib/utils'
import { segmentLabel } from '@/lib/display/market'

const SEGMENT_COLORS = [
  'var(--probex-primary)', 'var(--probex-positive)', 'var(--probex-warning)',
  'var(--probex-yes)', 'var(--probex-no)', 'var(--probex-text-muted)',
]

export function PortfolioAllocation() {
  const positionsSlice = useApplicationStore((s) => s.engine.positions)

  const positions: PositionRow[] = useMemo(() => {
    if (!positionsSlice.data) return []
    const parsed = parsePositionRows(positionsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [positionsSlice.data])

  const total = positions.reduce((s, p) => s + (p.currentValue ?? 0), 0)

  const bySegment = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of positions) {
      const key = p.segment ?? 'unknown'
      map.set(key, (map.get(key) ?? 0) + (p.currentValue ?? 0))
    }
    return [...map.entries()].map(([segment, value]) => ({ segment, value, pct: total > 0 ? value / total : 0 })).sort((a, b) => b.value - a.value)
  }, [positions, total])

  const bySide = useMemo(() => {
    const yes = positions.filter((p) => p.side === 'yes')
    const no  = positions.filter((p) => p.side === 'no')
    const yesValue = yes.reduce((s, p) => s + (p.currentValue ?? 0), 0)
    const noValue  = no.reduce((s, p) => s + (p.currentValue ?? 0), 0)
    const yesPnl   = yes.reduce((s, p) => s + (p.unrealizedPnl ?? 0), 0)
    const noPnl    = no.reduce((s, p) => s + (p.unrealizedPnl ?? 0), 0)
    return { yes: { count: yes.length, value: yesValue, pnl: yesPnl }, no: { count: no.length, value: noValue, pnl: noPnl } }
  }, [positions])

  const byPnl = useMemo(() => {
    const profit = positions.filter((p) => (p.unrealizedPnl ?? 0) >= 0)
    const loss   = positions.filter((p) => (p.unrealizedPnl ?? 0) < 0)
    return {
      profit: { count: profit.length, value: profit.reduce((s, p) => s + (p.currentValue ?? 0), 0) },
      loss:   { count: loss.length, value: loss.reduce((s, p) => s + (p.currentValue ?? 0), 0) },
    }
  }, [positions])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* By Segment */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>By Segment</h3>
        {bySegment.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>No open positions</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bySegment.map((s, i) => (
              <div key={s.segment} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--probex-text-secondary)' }}>
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} aria-hidden="true" />
                    {segmentLabel(s.segment) ?? 'Unknown segment'}
                  </span>
                  <span style={{ color: 'var(--probex-text-primary)' }}>{formatCurrency(s.value)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
                  <div className="h-full rounded-full" style={{ width: `${s.pct * 100}%`, background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By Side */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>By Position Side</h3>
        <div className="flex h-3 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
          <div className="h-full" style={{ width: total > 0 ? `${(bySide.yes.value / total) * 100}%` : '0%', background: 'var(--probex-yes)' }} />
          <div className="h-full" style={{ width: total > 0 ? `${(bySide.no.value / total) * 100}%` : '0%', background: 'var(--probex-no)' }} />
        </div>
        <div className="flex flex-col gap-2.5 mt-1">
          <SideRow label="YES" color="var(--probex-yes)" count={bySide.yes.count} value={bySide.yes.value} pnl={bySide.yes.pnl} total={total} />
          <SideRow label="NO" color="var(--probex-no)" count={bySide.no.count} value={bySide.no.value} pnl={bySide.no.pnl} total={total} />
        </div>
        {total > 0 && (
          <p className="text-2xs leading-relaxed mt-1" style={{ color: 'var(--probex-text-disabled)' }}>
            {bySide.yes.value >= bySide.no.value
              ? 'Portfolio is net long — majority of exposure backs YES outcomes.'
              : 'Portfolio is net short — majority of exposure backs NO outcomes.'}
          </p>
        )}
      </div>

      {/* By P&L state — replaces V1's fabricated consensus-category breakdown */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>By P&amp;L State</h3>
        {positions.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>No open positions</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            <PnlRow label="In Profit" color="var(--probex-positive)" count={byPnl.profit.count} value={byPnl.profit.value} total={total} />
            <PnlRow label="In Loss" color="var(--probex-negative)" count={byPnl.loss.count} value={byPnl.loss.value} total={total} />
          </div>
        )}
      </div>
    </div>
  )
}

function SideRow({ label, color, count, value, pnl, total }: { label: string; color: string; count: number; value: number; pnl: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const isProfit = pnl >= 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xs font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: color, color: label === 'YES' ? '#050816' : '#fff' }}>{label}</span>
      <span className="text-xs flex-1" style={{ color: 'var(--probex-text-secondary)' }}>{count} positions · {formatCurrency(value)}</span>
      <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{pct.toFixed(0)}%</span>
      <span className="text-xs font-semibold tabular-nums w-16 text-right" style={{ color: isProfit ? 'var(--probex-positive)' : 'var(--probex-negative)' }}>{isProfit ? '+' : ''}{formatCurrency(pnl)}</span>
    </div>
  )
}

function PnlRow({ label, color, count, value, total }: { label: string; color: string; count: number; value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold" style={{ color }}>{label}</span>
        <span style={{ color: 'var(--probex-text-secondary)' }}>{count} pos · {formatCurrency(value)}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
