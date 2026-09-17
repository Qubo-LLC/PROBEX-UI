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
//
// 2026-09-17: these are RECORDS. The table used to carry a "Live" provenance
// badge (no state behind it) and a clock-only "Last seen" that made Sunday's
// last snapshot read as this morning's; the badge is gone, the caption names
// the newest record with its date, and the columns fold on the shared ledger
// grammar instead of scrolling sideways at phone width.

import { useEffect, useMemo, useState } from 'react'
import { services } from '@/lib/services'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { formatCurrency } from '@/lib/utils'
import { stamp } from '@/lib/display/time'
import { MARKET_DETAIL_PATH } from '@/config/constants'
import Link from 'next/link'
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

  const newest = useMemo(() => (data?.markets ?? []).reduce<number | null>((n, m) => (n === null || m.lastSnapshot > n ? m.lastSnapshot : n), null), [data])

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
        title="No recorded markets"
        description="The engine holds no market snapshots yet."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs" style={{ color: 'var(--probex-text-muted)' }}>
          {rows.length} recorded market{rows.length === 1 ? '' : 's'} — price ranges across each market&apos;s observed lifetime
          {newest !== null && <span className="t-metadata"> · newest record {stamp(newest)} · records, not current markets</span>}
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
                  ? { background: 'var(--probex-primary)', color: 'var(--probex-bg)' }
                  : { background: 'transparent', color: 'var(--probex-text-muted)' }}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="t-metadata">/api/markets/history/summary</span>
        </div>
      </div>

      {/* The ledger grammar: one elastic identity column, numeric gutters,
          supplementary columns hiding below a breakpoint and restated under
          the question, never a sideways scroll. */}
      <TableShell label="Recorded markets">
        <Thead>
          <Th align="left" dense grow>Market</Th>
          <Th align="right" dense>Last YES</Th>
          <Th align="right" dense hideBelow="md">YES range</Th>
          <Th align="right" dense hideBelow="lg">BTC range</Th>
          <Th align="right" dense hideBelow="sm">Volume</Th>
          <Th align="right" dense hideBelow="lg">Snapshots</Th>
          <Th align="right" dense hideBelow="sm">Last record</Th>
        </Thead>
        <tbody>
          {rows.slice(0, 100).map((m) => (
            <Tr key={m.marketId}>
              <Td align="left" dense grow>
                <Link href={MARKET_DETAIL_PATH(m.marketId)} className="focus-ring rounded-sm font-semibold block truncate" style={{ color: 'var(--probex-text-primary)' }} title={m.question}>
                  {m.question}
                </Link>
                <span className="lg:hidden flex items-center gap-x-2 gap-y-0.5 flex-wrap mt-0.5 font-mono text-2xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                  <span className="sm:hidden">last record {stamp(m.lastSnapshot)}</span>
                  <span className="md:hidden">YES {m.yesPrice.min.toFixed(1)}–{m.yesPrice.max.toFixed(1)}¢</span>
                  <span>BTC ${m.btcPrice.min.toFixed(0)}–${m.btcPrice.max.toFixed(0)}</span>
                  <span>{m.snapshotCount} snapshot{m.snapshotCount === 1 ? '' : 's'}</span>
                  <span className="sm:hidden">vol {formatCurrency(m.volume.total)}</span>
                </span>
              </Td>
              <Td align="right" dense>
                <span className="tabular-nums font-semibold" style={{ color: 'var(--probex-text-primary)' }} title="The archive’s last snapshot of yes_price">
                  {m.yesPrice.current.toFixed(1)}¢
                </span>
              </Td>
              <Td align="right" dense hideBelow="md">
                <span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                  {m.yesPrice.min.toFixed(1)}–{m.yesPrice.max.toFixed(1)}¢
                </span>
              </Td>
              <Td align="right" dense hideBelow="lg">
                <span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                  ${m.btcPrice.min.toFixed(0)}–${m.btcPrice.max.toFixed(0)}
                </span>
              </Td>
              <Td align="right" dense hideBelow="sm"><span className="tabular-nums">{formatCurrency(m.volume.total)}</span></Td>
              <Td align="right" dense hideBelow="lg"><span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>{m.snapshotCount}</span></Td>
              <Td align="right" dense hideBelow="sm">
                <span className="tabular-nums text-2xs" style={{ color: 'var(--probex-text-muted)' }} title={new Date(m.lastSnapshot).toLocaleString()}>
                  {stamp(m.lastSnapshot)}
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
