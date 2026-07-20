'use client'

// WatchlistPage — V3 Phase 5 restoration (git 0e3833a4: WatchlistView),
// rebuilt on the real preferencesStore (localStorage, Phase 2) instead of
// V1's sessionStorage-backed useWatchlist. Reuses the shared MarketCard/
// MarketTable/WatchlistButton built for the Markets catalog rather than
// V1's separate WatchlistCard/WatchlistTable — removing a market from the
// watchlist is just toggling the same star again, no separate "remove" UI.
//
// Polymarket's 5-minute markets rotate constantly (the same fact that
// shapes Market Detail's "no longer active" state), so a watched market can
// legitimately vanish from the live envelope. Rather than silently drop it
// or misreport it as an error, watched ids not found in the current
// envelope are shown in their own "No longer active" section.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { usePreferencesStore } from '@/store/preferencesStore'
import { parseMarketRows, type MarketRow } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { MARKET_DETAIL_PATH, ROUTES } from '@/config/constants'
import { MarketCard } from '@/components/markets/MarketCard'
import { MarketTable } from '@/components/markets/MarketTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

type ViewMode = 'grid' | 'table'

export function WatchlistPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const edgesSlice = useApplicationStore((s) => s.engine.edges)
  const watchlist = usePreferencesStore((s) => s.watchlist)

  const watchedIds = useMemo(() => Object.keys(watchlist), [watchlist])

  const allMarkets: MarketRow[] = useMemo(() => {
    if (!marketsSlice.data) return []
    const parsed = parseMarketRows(marketsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [marketsSlice.data])

  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  const { active, inactiveIds } = useMemo(() => {
    const byId = new Map(allMarkets.map((m) => [m.id, m]))
    const active: MarketRow[] = []
    const inactiveIds: string[] = []
    for (const id of watchedIds) {
      const m = byId.get(id)
      if (m) active.push(m)
      else inactiveIds.push(id)
    }
    return { active, inactiveIds }
  }, [watchedIds, allMarkets])

  const onSelect = (marketId: string) => router.push(MARKET_DETAIL_PATH(marketId))

  return (
    <div className="page-container flex flex-col gap-5 pb-8 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--probex-text-primary)' }}>Watchlist</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--probex-text-muted)' }}>
            {watchedIds.length === 0 ? "Markets you're following closely" : `${watchedIds.length} market${watchedIds.length === 1 ? '' : 's'} you're following closely`}
          </p>
        </div>
        {watchedIds.length > 0 && (
          <div className="flex rounded-md overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--probex-border-default)' }} role="group" aria-label="View mode">
            {(['grid', 'table'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                aria-pressed={viewMode === m}
                aria-label={`${m} view`}
                className="flex items-center justify-center w-8 h-8 cursor-pointer transition-colors duration-100"
                style={{
                  background: viewMode === m ? 'var(--probex-primary-dim)' : 'transparent',
                  color: viewMode === m ? 'var(--probex-primary)' : 'var(--probex-text-muted)',
                  borderRight: m === 'grid' ? '1px solid var(--probex-border-default)' : 'none',
                }}
              >
                {m === 'grid' ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {watchedIds.length === 0 ? (
        <EmptyState
          size="lg"
          title="Your watchlist is empty"
          description="Add markets from the Markets page by clicking the star icon on any market card or table row."
          action={<button onClick={() => router.push(ROUTES.MARKETS)} className="btn-primary px-5 py-2 text-sm">Browse Markets</button>}
        />
      ) : (
        <>
          {marketsSlice.status === 'error' && (
            <ErrorState title="Markets unavailable" description={marketsSlice.error?.message ?? 'The /api/markets endpoint did not respond.'} fullPage={false} />
          )}

          {marketsSlice.status === 'loading' ? (
            <EmptyState size="sm" title="Waiting for market data" description="Your watched markets will appear here once /api/markets resolves." />
          ) : (
            <>
              {active.length > 0 && (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {active.map((m) => <MarketCard key={m.id} market={m} edge={edgeMap.get(m.id)} onClick={onSelect} />)}
                  </div>
                ) : (
                  <MarketTable markets={active} edgeMap={edgeMap} onSelect={onSelect} />
                )
              )}

              {inactiveIds.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>No Longer Active</h2>
                  <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
                    {inactiveIds.length} watched market{inactiveIds.length === 1 ? '' : 's'} {inactiveIds.length === 1 ? 'is' : 'are'} no longer in the current 5-minute cycle — Polymarket markets rotate continuously, so this is expected, not an error.
                  </p>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
