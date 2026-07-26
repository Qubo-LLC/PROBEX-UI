'use client'

// MarketsArchive — /api/markets/history/summary, the last integrated-but-
// unrendered endpoint (Phase 1 wired the service; this gives it a surface).
//
// This is a DIFFERENT dataset from the Markets tab. /api/markets returns only
// what the engine is scanning right now (typically 1–3 live 5-minute markets);
// this is the 100+ market historical archive, and it carries something the live
// list does not: min/max/avg for YES, NO, BTC price and volume across each
// market's observed lifetime. That range is the reason the archive is worth a
// tab — it shows how far a market actually travelled, not just where it ended.
//
// Fetched directly rather than through the store: it is a large payload that
// only matters when this tab is open, so polling it globally would be waste.

import { useEffect, useMemo, useState } from 'react'
import { services } from '@/lib/services'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { formatCurrency } from '@/lib/utils'
import type { MarketsSummary } from '@/types/engine'

type SortKey = 'recent' | 'volume' | 'range'

/** Widest YES-price swing a market saw — the archive's most telling column. */
const swing = (m: MarketsSummary['markets'][number]): number => m.yesPrice.max - m.yesPrice.min

export function MarketsArchive() {
  const [data, setData]       = useState<MarketsSummary | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy]   = useState<SortKey>('recent')

  useEffect(() => {
    let active = true
    services.engine
      .getMarketsSummary()
      .then((r) => { if (active) setData(r.data) })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Request failed') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const rows = useMemo(() => {
    const list = [...(data?.markets ?? [])]
    switch (sortBy) {
      case 'volume': return list.sort((a, b) => b.volume.total - a.volume.total)
      case 'range':  return list.sort((a, b) => swing(b) - swing(a))
      default:       return list.sort((a, b) => b.lastSnapshot - a.lastSnapshot)
    }
  }, [data, sortBy])

  if (loading) {
    return <p className="text-xs py-2" style={{ color: 'var(--probex-text-disabled)' }}>Loading market archive…</p>
  }
  if (error) {
    return <ErrorState title="Archive unavailable" description={error} fullPage={false} />
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No archived markets"
        description="The engine hasn't recorded any completed market histories yet."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs" style={{ color: 'var(--probex-text-muted)' }}>
          {rows.length} archived market{rows.length === 1 ? '' : 's'} — price ranges across each market&apos;s observed lifetime
        </p>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-md overflow-hidden" style={{ border: '1px solid var(--probex-border-default)' }} role="group" aria-label="Sort archive">
            {([['recent', 'Recent'], ['volume', 'Volume'], ['range', 'Swing']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                aria-pressed={sortBy === key}
                className="px-3 py-1 text-2xs font-semibold cursor-pointer transition-colors duration-150 focus-ring"
                style={sortBy === key
                  ? { background: 'var(--probex-accent)', color: '#fff' }
                  : { background: 'transparent', color: 'var(--probex-text-muted)' }}
              >
                {label}
              </button>
            ))}
          </div>
          <ProvenanceBadge provenance="live" detail="/api/markets/history/summary" />
        </div>
      </div>

      <TableShell label="Archived markets">
        <Thead>
          <Th align="left">Market</Th>
          <Th align="right">YES close</Th>
          <Th align="right">YES range</Th>
          <Th align="right">BTC range</Th>
          <Th align="right">Volume</Th>
          <Th align="right">Snapshots</Th>
          <Th align="right">Last seen</Th>
        </Thead>
        <tbody>
          {rows.slice(0, 100).map((m) => (
            <Tr key={m.marketId}>
              <Td align="left">
                <span className="truncate block max-w-[300px]" style={{ color: 'var(--probex-text-secondary)' }} title={m.question}>
                  {m.question}
                </span>
              </Td>
              <Td align="right">
                <span className="tabular-nums font-semibold" style={{ color: 'var(--probex-text-primary)' }}>
                  {m.yesPrice.current.toFixed(1)}¢
                </span>
              </Td>
              <Td align="right">
                <span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                  {m.yesPrice.min.toFixed(1)}–{m.yesPrice.max.toFixed(1)}¢
                </span>
              </Td>
              <Td align="right">
                <span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                  ${m.btcPrice.min.toFixed(0)}–${m.btcPrice.max.toFixed(0)}
                </span>
              </Td>
              <Td align="right"><span className="tabular-nums">{formatCurrency(m.volume.total)}</span></Td>
              <Td align="right"><span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>{m.snapshotCount}</span></Td>
              <Td align="right">
                <span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                  {new Date(m.lastSnapshot).toLocaleTimeString()}
                </span>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>

      {rows.length > 100 && (
        <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
          Showing the first 100 of {rows.length}.
        </p>
      )}
    </div>
  )
}
