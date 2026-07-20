'use client'

// MarketCharts — restored shell from V1 (git 0e3833a4). V1's probability/
// consensus/volume history charts required a per-market history endpoint
// that doesn't exist yet (MD-1 in the dependency matrix). Per the Phase 2
// directive, the complete widget renders — timeframe selector included —
// through AwaitingBackend, so the UI already feels finished; only the data
// activates later.

import { useEndpointAvailability } from '@/config/hooks/useEndpointAvailability'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { AwaitingBackend } from '@/components/shared/AwaitingBackend'

const TIMEFRAMES = ['1H', '1D', '7D', '30D'] as const

export function MarketCharts() {
  const history = useEndpointAvailability(ENDPOINTS.markets.volume)

  if (history.available) return null // will render live charts once MD-1 ships

  return (
    <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--probex-border)' }}>
      <AwaitingBackend
        title="Probability & Volume History"
        description="Per-market probability, edge, and volume charts over time — requires a per-market history endpoint the backend doesn't expose yet."
        endpoint="MD-1"
      >
        {/* Dimmed skeleton preview — non-interactive, never fake data */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            {TIMEFRAMES.map((tf) => (
              <span key={tf} className="text-2xs font-semibold px-2 py-1 rounded" style={{ background: 'var(--probex-surface-2)', color: 'var(--probex-text-muted)' }}>
                {tf}
              </span>
            ))}
          </div>
          <div className="h-48 rounded-lg" style={{ background: 'var(--probex-surface-2)' }} />
        </div>
      </AwaitingBackend>
    </div>
  )
}
