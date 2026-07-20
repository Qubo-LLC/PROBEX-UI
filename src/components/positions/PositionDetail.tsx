'use client'

// PositionDetail — restored from V1's PositionDetails (git 0e3833a4). V1's
// "Consensus Snapshot" (fabricated score/bias) and "Entry Thesis" (a
// generated narrative — there was never a real thesis to show) are dropped.
// In their place: Edge Alignment, a genuinely live check of whether the
// engine's CURRENT edge for this market agrees with the side already taken —
// the same real signal used throughout Positions/Portfolio/Consensus.

import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import type { PositionRow } from '@/lib/mappers/positions'
import type { EdgeRow } from '@/lib/mappers/edges'
import { MARKET_DETAIL_PATH } from '@/config/constants'
import { segmentLabel } from '@/lib/display/market'

export function PositionDetail({ position, edge, onClose }: { position: PositionRow; edge: EdgeRow | undefined; onClose: () => void }) {
  const router = useRouter()
  const isYes = position.side === 'yes'
  const sideColor = isYes ? 'var(--probex-yes)' : 'var(--probex-no)'
  const isProfit = (position.unrealizedPnl ?? 0) >= 0
  const pnlColor = isProfit ? 'var(--probex-positive)' : 'var(--probex-negative)'

  const alignment: 'aligned' | 'contrarian' | 'no-signal' = !edge ? 'no-signal' : edge.direction === position.side ? 'aligned' : 'contrarian'
  const alignmentMeta = {
    aligned:    { label: 'Aligned with the engine', color: 'var(--probex-positive)' },
    contrarian: { label: 'Contrary to the engine’s current edge', color: 'var(--probex-warning)' },
    'no-signal': { label: 'No active edge on this market', color: 'var(--probex-text-muted)' },
  }[alignment]

  return (
    <div className="rounded-xl overflow-hidden animate-fade-in-up" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border-default)' }}>
      <div className="flex items-start justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded flex-shrink-0" style={{ background: sideColor, color: isYes ? '#050816' : '#fff' }}>{position.side.toUpperCase()}</span>
          <h2 className="text-sm font-semibold truncate" style={{ color: 'var(--probex-text-primary)' }}>{position.marketTitle ?? position.id}</h2>
        </div>
        <button onClick={onClose} className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center cursor-pointer" style={{ color: 'var(--probex-text-muted)' }} aria-label="Close position details">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <section>
          <SectionLabel>Position Summary</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricCell label="Contracts" value={position.contracts !== null ? position.contracts.toLocaleString() : '—'} />
            <MetricCell label="Entry Price" value={position.entryPrice !== null ? `${position.entryPrice}¢` : '—'} />
            <MetricCell label="Current Price" value={position.currentPrice !== null ? `${position.currentPrice}¢` : '—'} valueColor={sideColor} />
            <MetricCell label="Stake" value={position.costBasis !== null ? formatCurrency(position.costBasis) : '—'} />
            <MetricCell label="Current Value" value={position.currentValue !== null ? formatCurrency(position.currentValue) : '—'} />
            <MetricCell label="Unrealized P&L" value={position.unrealizedPnl !== null ? `${isProfit ? '+' : ''}${formatCurrency(position.unrealizedPnl)}` : '—'} valueColor={pnlColor} />
            <MetricCell label="Return" value={position.unrealizedPnlPct !== null ? `${isProfit ? '+' : ''}${(position.unrealizedPnlPct * 100).toFixed(1)}%` : '—'} valueColor={pnlColor} />
            <MetricCell label="Opened" value={position.openedAt !== null ? new Date(position.openedAt).toLocaleString() : '—'} />
          </div>
        </section>

        <section>
          <SectionLabel>Market</SectionLabel>
          <button
            onClick={() => position.marketId && router.push(MARKET_DETAIL_PATH(position.marketId))}
            disabled={!position.marketId}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-lg text-left disabled:cursor-not-allowed"
            style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)', cursor: position.marketId ? 'pointer' : undefined }}
          >
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-medium truncate" style={{ color: 'var(--probex-text-primary)' }}>{position.marketTitle ?? position.id}</span>
              <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{segmentLabel(position.segment) ?? 'Segment unknown'}</span>
            </div>
            {position.marketId && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0" style={{ color: 'var(--probex-text-muted)' }} aria-hidden="true"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
            )}
          </button>
        </section>

        <section>
          <SectionLabel>Edge Alignment</SectionLabel>
          <div className="rounded-lg p-3 flex items-center justify-between gap-3" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}>
            <span className="text-xs font-semibold" style={{ color: alignmentMeta.color }}>{alignmentMeta.label}</span>
            {edge && <span className="text-xs font-bold tabular-nums" style={{ color: alignmentMeta.color }}>{edge.edgePct.toFixed(1)}% edge</span>}
          </div>
        </section>

        {position.entryPrice !== null && position.currentPrice !== null && (
          <section>
            <SectionLabel>Current Performance</SectionLabel>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--probex-text-muted)' }}>Probability Move</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>{position.entryPrice}¢ → <span style={{ color: sideColor }}>{position.currentPrice}¢</span></span>
              </div>
              <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
                <div className="absolute h-full rounded-full" style={{ width: `${Math.max(position.entryPrice, position.currentPrice)}%`, background: `${sideColor}33` }} />
                <div className="absolute h-full rounded-full" style={{ width: `${Math.min(position.entryPrice, position.currentPrice)}%`, background: sideColor }} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <h3 className="text-2xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--probex-text-muted)' }}>{children}</h3>
}

function MetricCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-2 rounded-lg" style={{ background: 'var(--probex-surface-2)' }}>
      <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color: valueColor ?? 'var(--probex-text-primary)' }}>{value}</span>
    </div>
  )
}
