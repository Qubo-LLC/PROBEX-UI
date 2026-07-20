'use client'

// MarketTable — restored from V1 (git 0e3833a4), rebuilt on the shared
// DataTable primitives (M6) instead of a bespoke table shell. Consensus/
// Sentiment/Confidence columns (V1, fabricated) are replaced by one live
// Edge column + Recommendation column, both driven by real /api/edges data.

import { segmentLabel } from '@/lib/display/market'
import type { MarketRow } from '@/lib/mappers/markets'
import type { EdgeRow } from '@/lib/mappers/edges'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { ProbabilityValue } from '@/components/shared/ProbabilityValue'
import { EdgeBadge } from '@/components/shared/EdgeBadge'
import { RecommendationBadge } from '@/components/shared/RecommendationBadge'
import { WatchlistButton } from '@/components/shared/WatchlistButton'
import { EmptyState } from '@/components/ui/EmptyState'

interface MarketTableProps {
  markets:   MarketRow[]
  edgeMap:   Map<string, EdgeRow>
  onSelect?: (marketId: string) => void
  /** Phase 6A: tighter row height for tape-like surfaces (Live Feed). The
   *  Markets catalog keeps the default density. */
  dense?:    boolean
}

export function MarketTable({ markets, edgeMap, onSelect, dense = false }: MarketTableProps) {
  if (markets.length === 0) {
    return <EmptyState size="sm" title="No markets match your filters" description="Try a different segment or search term." />
  }

  return (
    <TableShell label="Bitcoin prediction markets">
      <Thead>
        <Th align="left" dense={dense}>Market</Th>
        <Th align="left" dense={dense}>Edge</Th>
        <Th align="left" dense={dense}>Signal</Th>
        <Th align="right" dense={dense}>Probability</Th>
        <Th align="right" dense={dense}>Volume</Th>
        <Th align="center" dense={dense}>Watch</Th>
      </Thead>
      <tbody>
        {markets.map((m) => {
          const edge = edgeMap.get(m.id)
          const category = segmentLabel(m.segment)
          return (
            <Tr key={m.id}>
              <Td align="left" dense={dense}>
                <button
                  type="button"
                  onClick={onSelect ? () => onSelect(m.id) : undefined}
                  className="text-left font-medium focus-ring rounded"
                  style={{ color: 'var(--probex-text-primary)', cursor: onSelect ? 'pointer' : 'default', background: 'transparent', border: 0, padding: 0 }}
                >
                  {m.title}
                </button>
                {category && !dense && (
                  <div className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>{category}</div>
                )}
              </Td>
              <Td align="left" dense={dense}><EdgeBadge edge={edge} /></Td>
              <Td align="left" dense={dense}><RecommendationBadge recommendation={edge?.recommendation ?? null} /></Td>
              <Td align="right" dense={dense}>
                {m.probability !== null
                  ? <ProbabilityValue probability={m.probability} size="sm" />
                  : <span style={{ color: 'var(--probex-text-disabled)' }}>—</span>}
              </Td>
              <Td align="right" dense={dense}>
                <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                  {m.volume24h !== null ? formatVolume(m.volume24h) : '—'}
                </span>
              </Td>
              <Td align="center" dense={dense}><WatchlistButton marketId={m.id} /></Td>
            </Tr>
          )
        })}
      </tbody>
    </TableShell>
  )
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${Math.round(v)}`
}
