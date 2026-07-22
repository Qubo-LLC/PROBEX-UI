'use client'

// TrendingMarkets — restored from V1's "Trending Now" table (git 0e3833a4),
// sorted by 24h volume. Uses the shared DataTable primitives (M6) rather than
// a bespoke table, matching the Live Feed / Positions consoles.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseMarketRows } from '@/lib/mappers/markets'
import { formatCompact, formatPercent } from '@/lib/utils'
import { SectionHeader } from './SectionHeader'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { TableSkeleton } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Card } from '@/components/ui/Card'

const MAX_TRENDING = 8

export function TrendingMarkets() {
  const marketsSlice = useApplicationStore((s) => s.engine.markets)

  const marketRows = useMemo(
    () => (marketsSlice.data ? parseMarketRows(marketsSlice.data) : null),
    [marketsSlice.data],
  )

  const trending = useMemo(() => {
    if (marketRows?.kind !== 'rows') return []
    return [...marketRows.rows]
      .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
      .slice(0, MAX_TRENDING)
  }, [marketRows])

  return (
    <section>
      <SectionHeader title="Trending Now" subtitle="The busiest markets by 24h volume" />

      {marketsSlice.status === 'loading' && <TableSkeleton columns={4} rows={5} />}

      {marketsSlice.status === 'error' && (
        <ErrorState
          title="Markets unavailable"
          description={marketsSlice.error?.message ?? 'The /api/markets endpoint did not respond.'}
          fullPage={false}
        />
      )}

      {marketRows?.kind === 'unrecognized' && (
        <Card>
          <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
            The engine reports {marketRows.count} active market{marketRows.count === 1 ? '' : 's'}, but the
            item format doesn’t match the agreed schema yet. (Backend contract P0-01.)
          </p>
        </Card>
      )}

      {marketRows?.kind === 'empty' && (
        <EmptyState size="sm" title="No trending markets yet" description="Volume data will appear here once the engine's scanner returns candidates." />
      )}

      {trending.length > 0 && (
        <TableShell label="Trending markets by 24h volume">
          <Thead>
            <Th align="left">Market</Th>
            <Th align="right">Probability</Th>
            <Th align="right">Volume 24h</Th>
            <Th align="right">Closes</Th>
          </Thead>
          <tbody>
            {trending.map((m) => (
              <Tr key={m.id}>
                <Td align="left"><span className="font-medium" style={{ color: 'var(--probex-text-primary)' }}>{m.title}</span></Td>
                <Td align="right">
                  <span className="font-mono tabular-nums font-bold" style={{ color: 'var(--probex-primary)' }}>
                    {m.probability !== null ? formatPercent(m.probability) : '—'}
                  </span>
                </Td>
                <Td align="right">
                  <span className="font-mono tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                    {m.volume24h !== null ? `$${formatCompact(m.volume24h)}` : '—'}
                  </span>
                </Td>
                <Td align="right">
                  <span className="font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                    {m.closesAt !== null ? new Date(m.closesAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </section>
  )
}
