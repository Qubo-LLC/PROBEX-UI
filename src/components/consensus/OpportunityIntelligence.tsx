'use client'

// OpportunityIntelligence — new to V3 (not a V1 restore). The engine's
// currently-detected edges, ranked by magnitude rather than detection time
// (Live Feed's Edge Alerts is chronological; this is "what does the engine
// like most right now"). Doubles as a picker: selecting a row sets the page's
// focus market, tying Opportunity Intelligence to the MarketSelector above it
// via the shared uiStore.focusMarketId. Reuses EdgeTable rather than building
// a second table primitive — this page's framing (ranked, clickable) is the
// only thing that differs.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEdgeRows } from '@/lib/mappers/edges'
import type { ParseResult } from '@/lib/mappers/parse'
import type { EdgeRow } from '@/lib/mappers/edges'
import { EdgeTable } from '@/components/shared/EdgeTable'
import { ErrorState } from '@/components/ui/ErrorState'

const TOP_N = 5

export function OpportunityIntelligence({ onSelectMarket }: { onSelectMarket: (marketId: string) => void }) {
  const edgesSlice = useApplicationStore((s) => s.engine.edges)

  const ranked: ParseResult<EdgeRow> | null = useMemo(() => {
    if (!edgesSlice.data) return null
    const parsed = parseEdgeRows(edgesSlice.data)
    if (parsed.kind !== 'rows') return parsed
    return { kind: 'rows', rows: [...parsed.rows].sort((a, b) => b.edgePct - a.edgePct).slice(0, TOP_N) }
  }, [edgesSlice.data])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
        <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>Opportunity Intelligence</h2>
        <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>Ranked by edge magnitude, not detection time</span>
      </div>

      {edgesSlice.status === 'error' ? (
        <ErrorState
          title="Opportunities unavailable"
          description={edgesSlice.error?.message ?? 'The /api/edges endpoint did not respond.'}
          fullPage={false}
        />
      ) : ranked ? (
        <EdgeTable
          result={ranked}
          emptyTitle="Nothing clears the threshold right now"
          emptyDescription="The engine is scanning every 5-minute Bitcoin market. When an edge clears the survival brain's threshold, it appears here first — ranked by strength."
          onSelectMarket={onSelectMarket}
        />
      ) : null}
    </div>
  )
}
