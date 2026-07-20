'use client'

// BiasBreakdown — restored V1 visual (git 0e3833a4): institutional vs. retail
// positioning. This concept (smart-money vs. retail volume split) has no
// backend source yet (CE-4). Full row shell renders at full visual weight —
// icons, labels, participation bar track — with only the actual figures
// marked pending, per the Phase 3 "truthful, never empty" directive.

import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'

export function BiasBreakdown() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Bias Breakdown</h2>
        <ProvenanceBadge provenance="awaiting" detail="CE-4" />
      </div>

      <div className="p-4 flex flex-col gap-3">
        <BiasRow label="Institutional" description="Smart money, hedge funds, registered advisors" icon="🏛" />
        <BiasRow label="Retail" description="Individual traders and independent participants" icon="👤" />

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
            <span>Institutional <AwaitingValue size="sm" className="inline" /></span>
            <span>Retail <AwaitingValue size="sm" className="inline" /></span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
            <div className="h-full rounded-full opacity-30" style={{ width: '50%', background: 'var(--probex-text-disabled)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function BiasRow({ label, description, icon }: { label: string; description: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}>
      <span className="text-lg flex-shrink-0" aria-hidden="true">{icon}</span>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-xs font-semibold" style={{ color: 'var(--probex-text-primary)' }}>{label}</span>
        <span className="text-2xs truncate" style={{ color: 'var(--probex-text-muted)' }}>{description}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <AwaitingValue size="md" />
        <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>vol share</span>
      </div>
    </div>
  )
}
