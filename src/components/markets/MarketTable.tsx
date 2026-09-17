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
import { marketLifecycle, formatCloseTime, closeTimestamp, lifecycleLabel } from '@/lib/display/marketLifecycle'
import { WatchlistButton } from '@/components/shared/WatchlistButton'
import { EmptyState } from '@/components/ui/EmptyState'

interface MarketTableProps {
  markets:   MarketRow[]
  edgeMap:   Map<string, EdgeRow>
  onSelect?: (marketId: string) => void
  /** Phase 6A: tighter row height for tape-like surfaces (Live Feed). The
   *  Markets catalog keeps the default density. */
  dense?:    boolean
  /**
   * Omit the Status column. Overview's observed-markets board is tier-3 event
   * markets, and — verified on the live payload 2026-09-11 — none of them carry
   * `closes_at`, so the column could only ever render "—" eight times. A column
   * with no data is not information withheld; it is noise removed. Off by
   * default so the Markets catalog, whose rows can include closing windows,
   * keeps it.
   */
  hideStatus?: boolean
  /**
   * Render an empty edge as a quiet dash instead of a "No active edge" pill.
   * On a board where the engine has an edge on none of the visible rows, eight
   * identical grey pills say nothing eight times; one glance at a column of
   * dashes says the same thing once. Off by default.
   */
  quietEmptyEdge?: boolean
}

export function MarketTable({
  markets, edgeMap, onSelect, dense = false, hideStatus = false, quietEmptyEdge = false,
}: MarketTableProps) {
  if (markets.length === 0) {
    return <EmptyState size="sm" title="No markets match your filters" description="Try a different segment or search term." />
  }

  return (
    <TableShell label="Bitcoin prediction markets">
      {/* ─── The ledger grammar, shared with the engine field ────────────
          One elastic title column (`grow`) and fixed numeric gutters, with the
          supplementary columns HIDING below a breakpoint rather than forcing
          a horizontal scroll: at 375px this table scrolled sideways while the
          engine ledger directly above it folded its columns into a sub-line —
          two table systems on one page. Edge and Status fold below sm and
          Volume below md; whatever folded is restated under the title so
          nothing essential leaves the narrow layout. */}
      <Thead>
        <Th align="left" dense={dense} grow>Market</Th>
        <Th align="left" dense={dense} hideBelow="sm">Edge</Th>
        <Th align="right" dense={dense}>YES</Th>
        <Th align="right" dense={dense} hideBelow="md">Volume</Th>
        {!hideStatus && <Th align="left" dense={dense} hideBelow="sm">Status</Th>}
        <Th align="center" dense={dense}>Watch</Th>
      </Thead>
      <tbody>
        {markets.map((m) => {
          const edge = edgeMap.get(m.id)
          const category = segmentLabel(m.segment)
          const life = marketLifecycle(m.closesAt)
          const closed = life === 'closed'
          return (
            <Tr key={m.id}>
              <Td align="left" dense={dense} grow>
                <button
                  type="button"
                  onClick={onSelect ? () => onSelect(m.id) : undefined}
                  className="text-left font-medium focus-ring rounded block w-full"
                  style={{
                    // A resolved market reads at secondary weight. It stays
                    // openable — its history is still worth reading — but it
                    // must not present as a live candidate.
                    color: closed ? 'var(--probex-text-secondary)' : 'var(--probex-text-primary)',
                    cursor: onSelect ? 'pointer' : 'default', background: 'transparent', border: 0, padding: 0,
                    // Event-market questions run to ~90 characters. Two lines
                    // keeps the whole question readable in the elastic column
                    // at every width; a single-line truncation cut the part
                    // that distinguishes "…by 25 bps" from "…by 50+ bps".
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}
                  title={m.title}
                >
                  {m.title}
                </button>
                {category && !dense && (
                  <div className="text-2xs mt-0.5 hidden sm:block" style={{ color: 'var(--probex-text-muted)' }}>{category}</div>
                )}
                {/* What the folded columns carried, restated once beneath the
                    title. Only the facts that exist for this row: an edge if
                    the engine has one, the volume, the lifecycle when the
                    column is shown at all. */}
                <span className="md:hidden flex items-center gap-x-2 gap-y-0.5 flex-wrap mt-1 text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
                  {edge && <span className="sm:hidden"><EdgeBadge edge={edge} size="sm" /></span>}
                  {m.volume24h !== null && (
                    <span className="font-mono tabular-nums">Vol {formatVolume(m.volume24h)}</span>
                  )}
                  {!hideStatus && life !== 'unknown' && (
                    <span className="sm:hidden font-mono tabular-nums" title={closeTimestamp(m.closesAt)}>
                      {lifecycleLabel(life)} · {formatCloseTime(m.closesAt)}
                    </span>
                  )}
                </span>
              </Td>
              <Td align="left" dense={dense} hideBelow="sm">
                {quietEmptyEdge && !edge
                  ? <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }} aria-label="No active edge">—</span>
                  : <EdgeBadge edge={edge} />}
              </Td>
              <Td align="right" dense={dense}>
                {m.probability !== null
                  ? <ProbabilityValue probability={m.probability} size="sm" />
                  : <span style={{ color: 'var(--probex-text-disabled)' }}>—</span>}
              </Td>
              <Td align="right" dense={dense} hideBelow="md">
                <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                  {m.volume24h !== null ? formatVolume(m.volume24h) : '—'}
                </span>
              </Td>
              {!hideStatus && <Td align="left" dense={dense} hideBelow="sm">
                {/* Word plus colour, never colour alone. */}
                <span
                  className="inline-flex items-center gap-1.5 whitespace-nowrap"
                  title={closeTimestamp(m.closesAt)}
                >
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                    style={{
                      background:
                        life === 'open' ? 'var(--probex-status-live)'
                        : life === 'closing' ? 'var(--probex-status-stale)'
                        : 'var(--probex-text-disabled)',
                    }}
                  />
                  <span className="text-2xs font-semibold" style={{ color: closed ? 'var(--probex-text-muted)' : 'var(--probex-text-secondary)' }}>
                    {life === 'unknown' ? '—' : lifecycleLabel(life)}
                  </span>
                  <span className="text-2xs font-mono tabular-nums" style={{ color: 'var(--probex-text-disabled)' }}>
                    {formatCloseTime(m.closesAt)}
                  </span>
                </span>
              </Td>}
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
