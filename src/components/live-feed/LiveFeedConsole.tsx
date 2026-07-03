'use client'

// LiveFeedConsole — the real-time surface of the cockpit (/dashboard/live).
//
// Replaces the simulated-WebSocket LiveMarketsView. Everything here is real
// engine data refreshed by the ApplicationStateLoader polling tiers
// (price/stats every 2s, markets/edges every 5s) — no mock stream, no
// fabricated ticks (PROBEX_PRODUCT_SPEC.md §4, §5).
//
//   1. Feed status + BTC price stream  → the genuinely sub-second data
//   2. Current market cycle            → /api/markets (5-minute candidates)
//   3. Edge alerts                     → /api/edges

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { useEnginePriceChart } from '@/config/hooks/useServices'
import { parseMarketRows } from '@/lib/mappers/markets'
import { parseEdgeRows }   from '@/lib/mappers/edges'
import { formatPercent }   from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card }       from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PriceCard }  from '@/components/shared/PriceCard'
import { EdgeTable }  from '@/components/shared/EdgeTable'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'

export function LiveFeedConsole() {
  const stats   = useApplicationStore((s) => s.engine.stats)
  const markets = useApplicationStore((s) => s.engine.markets)
  const edges   = useApplicationStore((s) => s.engine.edges)
  const chart   = useEnginePriceChart()

  const marketRows = useMemo(
    () => (markets.data ? parseMarketRows(markets.data) : null),
    [markets.data],
  )
  const edgeRows = useMemo(
    () => (edges.data ? parseEdgeRows(edges.data) : null),
    [edges.data],
  )

  const feed = stats.data
    ? { connected: stats.data.feedConnected, latencyMs: stats.data.feedLatencyMs }
    : null

  return (
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader
        title="Live Feed"
        subtitle="Real-time engine data — price stream, current market cycle, edge alerts"
        actions={
          feed && (
            <span className="flex items-center gap-1.5 text-xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: feed.connected ? 'var(--probex-positive)' : 'var(--probex-negative)' }}
                aria-hidden="true"
              />
              {feed.connected ? `Feed live · ${Math.round(feed.latencyMs)}ms` : 'Feed disconnected'}
            </span>
          )
        }
      />

      {/* 1 · Price stream */}
      {chart.data ? (
        <PriceCard chart={chart.data} feed={feed} />
      ) : chart.status === 'error' ? (
        <ErrorState
          title="Price stream unavailable"
          description={chart.error?.message ?? 'The /api/price-history endpoint did not respond.'}
          fullPage={false}
        />
      ) : null}

      {/* 2 · Current market cycle */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>
          Current Market Cycle
          {markets.data && markets.data.count > 0 ? ` (${markets.data.count})` : ''}
        </h2>

        {markets.status === 'loading' && (
          <p className="text-xs py-2" style={{ color: 'var(--probex-text-disabled)' }}>
            Waiting for /api/markets — the engine’s market fetcher can take several
            seconds under rate limiting.
          </p>
        )}

        {markets.status === 'error' && (
          <ErrorState
            title="Market cycle unavailable"
            description={markets.error?.message ?? 'The /api/markets endpoint did not respond.'}
            fullPage={false}
          />
        )}

        {marketRows?.kind === 'empty' && (
          <EmptyState
            size="sm"
            title="No qualifying markets this cycle"
            description="The engine scans Polymarket 5-minute BTC markets continuously. Candidates appear here the moment the fetcher returns them."
          />
        )}

        {marketRows?.kind === 'unrecognized' && (
          <Card>
            <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
              The engine reports {marketRows.count} active market{marketRows.count === 1 ? '' : 's'},
              but the item format doesn’t match the agreed schema yet — rows are not
              displayed to avoid showing wrong values. (Backend contract P0-01.)
            </p>
          </Card>
        )}

        {marketRows?.kind === 'rows' && (
          <TableShell label="Active 5-minute markets">
            <Thead>
              <Th align="left">Market</Th>
              <Th align="right">YES Probability</Th>
              <Th align="right">YES / NO</Th>
              <Th align="right">Closes</Th>
              <Th align="center">Status</Th>
            </Thead>
            <tbody>
              {marketRows.rows.map((m) => (
                <Tr key={m.id}>
                  <Td align="left"><span className="font-medium" style={{ color: 'var(--probex-text-primary)' }}>{m.title}</span></Td>
                  <Td align="right">
                    <span className="tabular-nums font-bold" style={{ color: 'var(--probex-primary)' }}>
                      {m.probability !== null ? formatPercent(m.probability) : '—'}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                      {m.yesPrice !== null && m.noPrice !== null ? `${m.yesPrice}¢ / ${m.noPrice}¢` : '—'}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                      {m.closesAt !== null ? new Date(m.closesAt).toLocaleTimeString() : '—'}
                    </span>
                  </Td>
                  <Td align="center">
                    <span className="text-2xs uppercase font-semibold" style={{ color: 'var(--probex-text-muted)' }}>
                      {m.status ?? '—'}
                    </span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </section>

      {/* 3 · Edge alerts */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>
          Edge Alerts
          {edges.data && edges.data.count > 0 ? ` (${edges.data.count})` : ''}
        </h2>
        {edges.status === 'error' ? (
          <ErrorState
            title="Edges unavailable"
            description={edges.error?.message ?? 'The /api/edges endpoint did not respond.'}
            fullPage={false}
          />
        ) : edgeRows ? (
          <EdgeTable
            result={edgeRows}
            emptyTitle="No active edge alerts"
            emptyDescription="When the engine detects a mispricing worth trading, the edge appears here in the same 5-second polling cycle."
          />
        ) : null}
      </section>
    </div>
  )
}
