'use client'

// RelatedMarkets — restored from V1 (git 0e3833a4), 3 tabs preserved. "Same
// Segment" and "Trending" are derived client-side from the live markets
// envelope (same technique as Overview's Trending section). "Similar
// Markets" genuinely requires a similarity endpoint that doesn't exist yet
// (markets.related, awaiting-backend) — that tab renders its complete
// widget through AwaitingBackend rather than being silently dropped.

import { useMemo, useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { useEndpointAvailability } from '@/config/hooks/useEndpointAvailability'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { parseMarketRows, type MarketRow } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { MarketCard } from '@/components/markets/MarketCard'
import { AwaitingBackend } from '@/components/shared/AwaitingBackend'
import { EmptyState } from '@/components/ui/EmptyState'

type Tab = 'similar' | 'segment' | 'trending'
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'similar',  label: 'Similar Markets' },
  { id: 'segment',  label: 'Same Segment' },
  { id: 'trending', label: 'Trending' },
]
const MAX_RELATED = 4

interface RelatedMarketsProps {
  currentMarketId: string
  segment:         string | null
  onSelect:        (marketId: string) => void
}

export function RelatedMarkets({ currentMarketId, segment, onSelect }: RelatedMarketsProps) {
  const [tab, setTab] = useState<Tab>('segment')
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const edgesSlice    = useApplicationStore((s) => s.engine.edges)
  const similarAvailable = useEndpointAvailability(ENDPOINTS.markets.related)

  const allRows = useMemo(() => {
    if (!marketsSlice.data) return []
    const parsed = parseMarketRows(marketsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [marketsSlice.data])

  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  const rows: MarketRow[] = useMemo(() => {
    if (tab === 'segment') {
      return allRows.filter((m) => m.id !== currentMarketId && m.segment === segment).slice(0, MAX_RELATED)
    }
    if (tab === 'trending') {
      return [...allRows]
        .filter((m) => m.id !== currentMarketId)
        .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
        .slice(0, MAX_RELATED)
    }
    return []
  }, [tab, allRows, currentMarketId, segment])

  return (
    <div className="mx-6 my-5 rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div className="px-4 pt-3">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--probex-text-primary)' }}>Related Markets</h2>
          <div className="flex" role="tablist" aria-label="Related markets tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className="text-xs font-medium px-3 py-2 cursor-pointer transition-colors duration-100 whitespace-nowrap focus-ring"
                style={{ color: tab === t.id ? 'var(--probex-primary)' : 'var(--probex-text-muted)', borderBottom: tab === t.id ? '2px solid var(--probex-primary)' : '2px solid transparent', marginBottom: -1 }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3">
        {tab === 'similar' && !similarAvailable.available ? (
          <AwaitingBackend
            bare
            title="Similar Markets"
            description="Markets the engine considers thematically similar to this one — requires a market-similarity endpoint."
            endpoint="markets.related"
          />
        ) : rows.length === 0 ? (
          <EmptyState size="sm" title="No related markets found" description={tab === 'segment' ? 'No other markets share this segment right now.' : 'No other markets are trending right now.'} />
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {rows.map((m) => <MarketCard key={m.id} market={m} edge={edgeMap.get(m.id)} onClick={onSelect} />)}
          </div>
        )}
      </div>
    </div>
  )
}
