'use client'

// Markets domain — API group "Statistics & Data" (market-facing half).
//
//   Live      → /api/markets           what the engine is scanning right now
//   Watchlist → client-side selection over the same live set
//   Archive   → /api/markets/history/summary, the 100+ market history
//
// Live and Archive are deliberately separate tabs rather than one merged list:
// they are different datasets with different meanings, and presenting archived
// markets as "scanning right now" would be a lie (see docs/API_AUDIT.md §0.1a).

import { useApplicationStore } from '@/store/applicationStore'
import { usePreferencesStore } from '@/store/preferencesStore'
import { DomainPage } from '@/components/layout/DomainPage'
import { MarketsPage } from './MarketsPage'
import { MarketsArchive } from './MarketsArchive'
import { WatchlistPage } from '@/components/watchlist/WatchlistPage'
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import type { TabDef } from '@/components/ui/Tabs'

export function MarketsDomain() {
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const edgesSlice   = useApplicationStore((s) => s.engine.edges)
  const watchlist    = usePreferencesStore((s) => s.watchlist)

  const liveCount    = marketsSlice.status === 'success' ? marketsSlice.data?.count ?? 0 : 0
  const watchedCount = Object.keys(watchlist).length

  const tabs: TabDef[] = [
    { id: 'live',      label: 'Live',      count: liveCount },
    { id: 'watchlist', label: 'Watchlist', count: watchedCount },
    { id: 'archive',   label: 'Archive' },
  ]

  return (
    // Markets is an intelligence surface: it answers which markets matter, not
    // which endpoint produced the row. Every badge keeps its word and moves the
    // path to its tooltip and accessible name. One declaration covers all three
    // views, because they render inside this component.
    <ProvenanceScope detail="tooltip">
    <DomainPage
      title="Markets"
      subtitle="Bitcoin 5-minute markets — live scanning, your watchlist, and the historical archive"
      tabs={tabs}
      actions={
        <span className="flex items-center gap-3">
          {/* Lineage tracks THIS endpoint, not the app as a whole: a
              markets-only outage must not sit under a green LIVE badge. */}
          <ProvenanceBadge
            provenance={marketsSlice.status === 'error' ? 'unreachable' : 'live'}
            detail="/api/markets"
            state={marketsSlice}
          />
          <ProvenanceBadge provenance="live" detail="/api/edges" state={edgesSlice} />
        </span>
      }
      render={(active) => {
        if (active === 'watchlist') return <WatchlistPage embedded />
        if (active === 'archive')   return <MarketsArchive />
        return <MarketsPage embedded />
      }}
    />
    </ProvenanceScope>
  )
}
