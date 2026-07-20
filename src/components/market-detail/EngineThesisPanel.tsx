'use client'

// EngineThesisPanel — V3 redesign of V1's MarketThesisPanel (git 0e3833a4).
// The "Consensus: X/100" metric (fabricated) is replaced by the market's
// live Edge Strength; every other metric (YES price, volume, liquidity,
// open interest, days to close) was already truthfully derivable from the
// market item and is restored unchanged. Thesis + resolution criteria
// render only when the engine actually provided that text — never invented.

import { formatCompact, probabilityColorVar } from '@/lib/utils'
import type { MarketRow } from '@/lib/mappers/markets'
import type { EdgeRow } from '@/lib/mappers/edges'

interface EngineThesisPanelProps {
  market: MarketRow
  edge:   EdgeRow | undefined
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-lg" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}>
      <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color: accent ?? 'var(--probex-text-primary)' }}>{value}</span>
    </div>
  )
}

export function EngineThesisPanel({ market, edge }: EngineThesisPanelProps) {
  const daysLeft = market.closesAt !== null
    ? Math.max(0, Math.ceil((market.closesAt - Date.now()) / 86_400_000))
    : null

  const metrics: Array<{ label: string; value: string; accent?: string }> = []
  if (market.probability !== null) {
    metrics.push({ label: 'YES Price', value: `${Math.round(market.probability * 100)}¢`, accent: probabilityColorVar(market.probability) })
  }
  if (edge) {
    metrics.push({ label: 'Edge Strength', value: `${edge.edgePct.toFixed(1)}%`, accent: edge.direction === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)' })
  }
  if (market.volume24h !== null) metrics.push({ label: '24h Volume', value: `$${formatCompact(market.volume24h)}` })
  if (market.openInterest !== null) metrics.push({ label: 'Open Interest', value: `$${formatCompact(market.openInterest)}` })
  if (market.liquidity !== null) metrics.push({ label: 'Liquidity', value: `$${formatCompact(market.liquidity)}` })
  if (daysLeft !== null) metrics.push({ label: 'Resolves In', value: `${daysLeft}d` })

  return (
    <div className="px-6 py-5 flex flex-col gap-5" style={{ borderBottom: '1px solid var(--probex-border)' }}>
      {metrics.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-2.5" style={{ color: 'var(--probex-text-primary)' }}>Key Metrics</h3>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            {metrics.map((m) => <Metric key={m.label} {...m} />)}
          </div>
        </div>
      )}

      {market.description && (
        <div>
          <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--probex-text-primary)' }}>Market Thesis</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--probex-text-secondary)' }}>{market.description}</p>
        </div>
      )}

      {market.resolutionCriteria && (
        <div>
          <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--probex-text-primary)' }}>Resolution</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--probex-text-muted)' }}>{market.resolutionCriteria}</p>
        </div>
      )}
    </div>
  )
}
