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
import type { TabDef } from '@/components/ui/Tabs'

export function MarketsDomain() {
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const watchlist    = usePreferencesStore((s) => s.watchlist)

  const liveCount    = marketsSlice.status === 'success' ? marketsSlice.data?.count ?? 0 : 0
  const watchedCount = Object.keys(watchlist).length

  const tabs: TabDef[] = [
    { id: 'live',      label: 'Live',      count: liveCount },
    { id: 'watchlist', label: 'Watchlist', count: watchedCount },
    { id: 'archive',   label: 'Archive' },
  ]

  return (
    <DomainPage
      title="Markets"
      subtitle="Bitcoin 5-minute markets — live scanning, your watchlist, and the historical archive"
      tabs={tabs}
      render={(active) => {
        if (active === 'watchlist') return <WatchlistPage embedded />
        if (active === 'archive')   return <MarketsArchive />
        return <MarketsPage embedded />
      }}
    />
  )
}
