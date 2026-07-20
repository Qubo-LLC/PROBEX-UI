'use client'

// PortfolioInsights — restored from V1 (git 0e3833a4). V1's "Highest
// Consensus" / "Most Contrarian" rows depended on fabricated per-position
// consensus scores and are dropped; Largest Position, Best/Worst Performer,
// and Risk Concentration were already genuinely computable from real
// position data and are restored unchanged. Rows click through to Market
// Detail using the position's real marketId (Phase 4 mapper extension).

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { parsePositionRows, type PositionRow } from '@/lib/mappers/positions'
import { formatCurrency } from '@/lib/utils'
import { segmentLabel } from '@/lib/display/market'
import { MARKET_DETAIL_PATH } from '@/config/constants'

export function PortfolioInsights() {
  const router = useRouter()
  const positionsSlice = useApplicationStore((s) => s.engine.positions)

  const positions: PositionRow[] = useMemo(() => {
    if (!positionsSlice.data) return []
    const parsed = parsePositionRows(positionsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [positionsSlice.data])

  const insights = useMemo(() => {
    if (positions.length === 0) return null
    const withValue = positions.filter((p) => p.currentValue !== null)
    const withPct   = positions.filter((p) => p.unrealizedPnlPct !== null)
    if (withValue.length === 0 || withPct.length === 0) return null

    const largest = [...withValue].sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0))[0]!
    const best    = [...withPct].sort((a, b) => (b.unrealizedPnlPct ?? 0) - (a.unrealizedPnlPct ?? 0))[0]!
    const worst   = [...withPct].sort((a, b) => (a.unrealizedPnlPct ?? 0) - (b.unrealizedPnlPct ?? 0))[0]!

    const bySegment = new Map<string, number>()
    for (const p of positions) bySegment.set(p.segment ?? 'unknown', (bySegment.get(p.segment ?? 'unknown') ?? 0) + (p.currentValue ?? 0))
    const total = [...bySegment.values()].reduce((s, v) => s + v, 0)
    const [topSegment, topValue] = [...bySegment.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0]
    const topSegmentPct = total > 0 ? topValue / total : 0

    return { largest, best, worst, topSegment, topSegmentPct }
  }, [positions])

  if (!insights) {
    return (
      <div className="rounded-xl p-4" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
        <p className="text-xs" style={{ color: 'var(--probex-text-muted)' }}>No open positions to summarize.</p>
      </div>
    )
  }

  const { largest, best, worst, topSegment, topSegmentPct } = insights
  const navigate = (marketId: string | null) => { if (marketId) router.push(MARKET_DETAIL_PATH(marketId)) }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Portfolio Insights</h2>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InsightRow label="Largest Position" title={largest.marketTitle ?? largest.id} value={formatCurrency(largest.currentValue ?? 0)} valueColor="var(--probex-text-primary)" onClick={largest.marketId ? () => navigate(largest.marketId) : undefined} />
        <InsightRow label="Best Performer" title={best.marketTitle ?? best.id} value={`+${((best.unrealizedPnlPct ?? 0) * 100).toFixed(1)}%`} valueColor="var(--probex-positive)" onClick={best.marketId ? () => navigate(best.marketId) : undefined} />
        <InsightRow label="Worst Performer" title={worst.marketTitle ?? worst.id} value={`${((worst.unrealizedPnlPct ?? 0) * 100).toFixed(1)}%`} valueColor={(worst.unrealizedPnlPct ?? 0) < 0 ? 'var(--probex-negative)' : 'var(--probex-positive)'} onClick={worst.marketId ? () => navigate(worst.marketId) : undefined} />
        {topSegment && (
          <InsightRow label="Risk Concentration" title={`${segmentLabel(topSegment) ?? 'Unknown'} segment`} value={`${Math.round(topSegmentPct * 100)}%`} valueColor={topSegmentPct > 0.4 ? 'var(--probex-warning)' : 'var(--probex-text-secondary)'} />
        )}
      </div>
    </div>
  )
}

function InsightRow({ label, title, value, valueColor, onClick }: { label: string; title: string; value: string; valueColor: string; onClick?: (() => void) | undefined }) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`flex items-center justify-between gap-3 p-2.5 rounded-lg text-left focus-ring ${onClick ? 'cursor-pointer transition-all duration-150 hover:border-[var(--probex-border-active)] hover:-translate-y-0.5' : ''}`}
      style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-2xs uppercase tracking-wider" style={{ color: 'var(--probex-text-disabled)' }}>{label}</span>
        <span className="text-xs font-medium truncate" style={{ color: 'var(--probex-text-secondary)' }}>{title}</span>
      </div>
      <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: valueColor }}>{value}</span>
    </Wrapper>
  )
}
