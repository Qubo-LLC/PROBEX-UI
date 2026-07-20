'use client'

// HistoricalSnapshots — restored V1 visual (git 0e3833a4): point-in-time
// consensus readings across the recent window. No consensus-history endpoint
// exists yet (CE-3). Renders a fully-shaped 5-row list (real row structure,
// real spacing, real chip styling) with each field marked pending — so the
// widget reads as "populated, waiting for data" rather than blank.

import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'

const GHOST_ROWS = ['5m ago', '15m ago', '30m ago', '1h ago', '2h ago']

export function HistoricalSnapshots() {
  return (
    <div className="rounded-xl overflow-hidden h-full flex flex-col" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Historical Snapshots</h2>
          <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>Consensus state at key points in the recent window</p>
        </div>
        <ProvenanceBadge provenance="awaiting" detail="CE-3" />
      </div>

      <div className="flex flex-col px-4">
        {GHOST_ROWS.map((label, i) => (
          <div
            key={label}
            className="flex items-center gap-3 py-2.5"
            style={i < GHOST_ROWS.length - 1 ? { borderBottom: '1px solid var(--probex-border)' } : undefined}
          >
            <span className="text-2xs font-semibold w-14 flex-shrink-0" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
            <AwaitingValue size="md" className="w-12 flex-shrink-0" />
            <AwaitingValue size="sm" className="w-12 flex-shrink-0" />
            <span className="text-2xs font-semibold px-2 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--probex-surface-2)', color: 'var(--probex-text-disabled)' }}>
              pending
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
