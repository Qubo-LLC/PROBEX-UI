'use client'

// PositionsConsole — the engine's open positions (/dashboard/positions).
//
// Sources: /api/positions (envelope + items) and /api/execution/status
// (closed count + resolution record). Replaces the mock-backed PositionsView.
//
// Truth rules: envelope figures (count, total unrealized P&L) render even
// while item schemas are unconfirmed; unrecognized items are reported, not
// guessed at; the settled-history section states plainly that the backend
// keeps no trade ledger yet (P2-02).

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parsePositionRows } from '@/lib/mappers/positions'
import { formatCurrency, formatSignedCurrency, formatDelta } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard }   from '@/components/ui/StatCard'
import { Card }       from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'

export function PositionsConsole() {
  const positions = useApplicationStore((s) => s.engine.positions)
  const execution = useApplicationStore((s) => s.engine.executionStatus)

  const pos = positions.data
  const ex  = execution.data

  const rows = useMemo(
    () => (pos ? parsePositionRows(pos) : null),
    [pos],
  )

  return (
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader
        title="Positions"
        subtitle="Capital currently deployed by the engine, and how resolutions have gone"
      />

      {positions.status === 'loading' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['Open Positions', 'Unrealized P&L', 'Closed', 'Resolutions'].map((label) => (
            <StatCard key={label} label={label} value="" isLoading />
          ))}
        </div>
      )}

      {positions.status === 'error' && (
        <ErrorState
          title="Positions unavailable"
          description={positions.error?.message ?? 'The /api/positions endpoint did not respond.'}
          fullPage={false}
        />
      )}

      {pos && (
        <>
          {/* Summary vitals — envelope + execution truth */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Open Positions"
              value={String(pos.count)}
              deltaLabel={pos.count === 0 ? 'no capital deployed' : 'currently held'}
            />
            <StatCard
              label="Unrealized P&L"
              value={formatSignedCurrency(pos.totalUnrealizedPnl)}
              valueColor={
                pos.totalUnrealizedPnl > 0 ? 'var(--probex-positive)'
                : pos.totalUnrealizedPnl < 0 ? 'var(--probex-negative)' : undefined
              }
              deltaLabel="across open positions"
            />
            {ex && (
              <StatCard
                label="Closed"
                value={String(ex.closedPositions)}
                deltaLabel="this session"
              />
            )}
            {ex && (
              <StatCard
                label="Resolutions"
                value={
                  ex.resolutionStats.totalResolved > 0
                    ? `${ex.resolutionStats.wins}W / ${ex.resolutionStats.losses}L`
                    : ex.resolutionStats.isRunning ? 'Tracking' : 'Stopped'
                }
                valueColor={
                  ex.resolutionStats.totalResolved > 0
                    ? (ex.resolutionStats.wins >= ex.resolutionStats.losses ? 'var(--probex-positive)' : 'var(--probex-negative)')
                    : undefined
                }
                deltaLabel={
                  ex.resolutionStats.totalResolved > 0
                    ? `${ex.resolutionStats.autoClosed} auto-closed`
                    : `${ex.resolutionStats.trackedPositions} tracked`
                }
              />
            )}
          </div>

          {/* Open positions table */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>
              Open Positions
            </h2>

            {rows?.kind === 'empty' && (
              <EmptyState
                size="sm"
                title="No open positions"
                description="The engine has no capital deployed right now. Positions open automatically when an edge clears the strategy filter."
              />
            )}

            {rows?.kind === 'unrecognized' && (
              <Card>
                <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
                  The engine reports {rows.count} open position{rows.count === 1 ? '' : 's'},
                  but the item format doesn’t match the agreed schema yet — rows are not
                  displayed to avoid showing wrong values. (Backend contract P0-01.)
                </p>
              </Card>
            )}

            {rows?.kind === 'rows' && (
              <TableShell label="Open positions">
                <Thead>
                  <Th align="left">Market</Th>
                  <Th align="center">Side</Th>
                  <Th align="right">Contracts</Th>
                  <Th align="right">Entry → Now</Th>
                  <Th align="right">Cost / Value</Th>
                  <Th align="right">Unrealized P&L</Th>
                  <Th align="right">Opened</Th>
                </Thead>
                <tbody>
                  {rows.rows.map((p) => (
                    <Tr key={p.id}>
                      <Td align="left"><span className="font-medium" style={{ color: 'var(--probex-text-primary)' }}>{p.marketTitle ?? p.id}</span></Td>
                      <Td align="center">
                        <span
                          className="text-2xs font-bold uppercase rounded px-1.5 py-0.5"
                          style={{
                            color:      p.side === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)',
                            background: 'var(--probex-surface-2)',
                          }}
                        >
                          {p.side}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                          {p.contracts !== null ? p.contracts.toLocaleString() : '—'}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                          {p.entryPrice !== null && p.currentPrice !== null ? `${p.entryPrice}¢ → ${p.currentPrice}¢` : '—'}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                          {p.costBasis !== null && p.currentValue !== null
                            ? `${formatCurrency(p.costBasis)} / ${formatCurrency(p.currentValue)}`
                            : '—'}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="tabular-nums font-bold" style={{
                          color: p.unrealizedPnl === null ? 'var(--probex-text-muted)'
                            : p.unrealizedPnl > 0 ? 'var(--probex-positive)'
                            : p.unrealizedPnl < 0 ? 'var(--probex-negative)' : 'var(--probex-text-primary)',
                        }}>
                          {p.unrealizedPnl !== null
                            ? `${formatSignedCurrency(p.unrealizedPnl)}${p.unrealizedPnlPct !== null ? ` (${formatDelta(p.unrealizedPnlPct)})` : ''}`
                            : '—'}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
                          {p.openedAt !== null ? new Date(p.openedAt).toLocaleTimeString() : '—'}
                        </span>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </section>

          {/* Settled history — honest about the persistence gap */}
          <Card>
            <p className="text-2xs leading-relaxed" style={{ color: 'var(--probex-text-disabled)' }}>
              Settled-position history is not available: the engine keeps no trade
              ledger yet, and in-memory state resets on restart. A persistent trade
              history endpoint is on the backend roadmap (P2-02) — this section
              becomes the full blotter when it lands.
            </p>
          </Card>
        </>
      )}
    </div>
  )
}
