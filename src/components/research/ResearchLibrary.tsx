'use client'

// ResearchLibrary — restored V1 visual (git 0e3833a4: ResearchReportCard +
// ResearchSidebar), gated behind AwaitingBackend since no research-content
// endpoint exists yet (research.list/get/categories). Category list is
// trimmed to BTC-relevant topics only — V1's ETF Monitor / Institutional
// Activity / Macro Signals / On-Chain Signals categories are dropped per the
// Phase 5 classification ("No Longer Appropriate For PROBEX"), so even this
// preview doesn't imply content PROBEX will never produce.
//
// Prose-shaped placeholders (title/summary lines) use Skeleton, not
// AwaitingValue — AwaitingValue is for short numeric/label values; long-form
// text placeholders read more honestly as a loading skeleton.

import { Skeleton } from '@/components/ui/LoadingState'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'

const CATEGORIES = ['BTC Outlook', 'Weekly Brief', 'Volatility Analysis', 'Market Structure', 'Segment Deep Dive']
const GHOST_CARDS = 6

export function ResearchLibrary() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Research Library</h2>
          <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>In-depth reports, weekly briefs, and market structure analysis</p>
        </div>
        <ProvenanceBadge provenance="awaiting" detail="research.list" />
      </div>

      <div className="flex gap-4 p-4">
        <aside className="hidden lg:flex flex-col gap-1.5 w-[180px] flex-shrink-0 opacity-40 pointer-events-none select-none" aria-hidden="true">
          {CATEGORIES.map((c) => (
            <span key={c} className="text-xs px-2.5 py-1.5 rounded-md" style={{ background: 'var(--probex-surface-2)', color: 'var(--probex-text-muted)' }}>{c}</span>
          ))}
        </aside>

        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: GHOST_CARDS }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2.5 p-4 rounded-xl" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}>
              <div className="flex items-center gap-2">
                <Skeleton height={16} width={80} />
                <Skeleton height={16} width={50} />
              </div>
              <Skeleton height={14} width="90%" />
              <Skeleton height={14} width="70%" />
              <div className="flex flex-col gap-1.5 pt-1">
                <Skeleton height={10} width="100%" />
                <Skeleton height={10} width="80%" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-2xs leading-relaxed px-4 pb-4" style={{ color: 'var(--probex-text-disabled)' }}>
        Long-form research and weekly briefs activate once a research-content endpoint ships — this becomes the full searchable, filterable library when it lands.
      </p>
    </div>
  )
}
