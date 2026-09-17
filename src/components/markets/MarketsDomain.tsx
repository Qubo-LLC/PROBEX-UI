'use client'

// Markets domain — API group "Statistics & Data" (market-facing half).
//
//   Live      → /api/markets           the engine's current scan
//   Watchlist → the browser-local starred ids, held against every record
//   Archive   → /api/markets/history/summary, the recorded markets
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
import type { TabDef } from '@/components/ui/Tabs'

export function MarketsDomain() {
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const edgesSlice   = useApplicationStore((s) => s.engine.edges)
  const watchlist    = usePreferencesStore((s) => s.watchlist)

  const liveCount    = marketsSlice.status === 'success' ? marketsSlice.data?.count ?? 0 : 0
  const watchedCount = Object.keys(watchlist).length
  const readAt       = marketsSlice.lastUpdatedAt
  const scanWord     = marketsSlice.status === 'error' && !marketsSlice.data ? 'scan unavailable'
                     : marketsSlice.isStale ? 'scan stale'
                     : readAt !== null ? `scan read ${new Date(readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                     : 'waiting for the scan'

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
      subtitle="The engine’s current scan, the markets starred in this browser, and the recorded archive"
      tabs={tabs}
      // Two "LIVE" badges used to sit here — one of them over an empty scan.
      // What is true is when the scan was last read, and whether it answered;
      // that is what the header says, in words.
      actions={
        <span className="t-metadata" title={`/api/markets · /api/edges${edgesSlice.status === 'error' ? ' (edges did not answer)' : ''}`}>
          {scanWord}
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
