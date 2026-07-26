'use client'

// PaperTradingConsole — the Paper Trading page (/paper): session vitals,
// edge-bucket/hourly breakdowns, survival-state timeline, and the settled
// ledger, from /api/paper-stats, /api/paper/status, /api/trades/ledger.
// paper-stats.total_trades and paper/status.completed_trades disagree upstream;
// both are shown rather than silently reconciled.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard }   from '@/components/ui/StatCard'
import { Card }       from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { CapitalLedger } from '@/components/wallet/CapitalLedger'
import { PaperTradingControls } from './PaperTradingControls'
import type { BucketPerformanceStat } from '@/types/engine'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

export function PaperTradingConsole({ embedded = false }: EmbeddableProps = {}) {
  const statsSlice  = useApplicationStore((s) => s.engine.paperStats)
  const statusSlice = useApplicationStore((s) => s.engine.paperStatus)

  const p      = statsSlice.status === 'success' && statsSlice.data ? statsSlice.data.paperTrading : null
  const status = statusSlice.status === 'success' ? statusSlice.data : null

  return (
    <div className={pageShell(embedded, 'gap-4')}>
      {!embedded && (
        <PageHeader
          title="Paper Trading"
          subtitle="The engine's simulated trading session — capital, trades, and settlement, all in one place"
          actions={
            status ? (
              <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider" style={{ color: status.enabled ? 'var(--probex-positive)' : 'var(--probex-text-muted)' }}>
                <span className={status.enabled ? 'live-dot w-1.5 h-1.5' : 'w-1.5 h-1.5 rounded-full inline-block'} style={{ background: status.enabled ? 'var(--probex-positive)' : 'var(--probex-text-disabled)' }} aria-hidden="true" />
                {status.enabled ? 'Enabled' : 'Disabled'}
              </span>
            ) : undefined
          }
        />
      )}

      {statsSlice.status === 'error' && (
        <ErrorState title="Paper trading data unavailable" description={statsSlice.error?.message ?? 'The /api/paper-stats endpoint did not respond.'} fullPage={false} />
      )}

      {/* Controls render regardless of whether stats loaded — if the session is
          in a bad state, the ability to stop or reset it is exactly what's
          needed, so it must not be gated behind a successful stats fetch. */}
      <PaperTradingControls />

      {p && (
        <>
          {/* 1 · Session vitals */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard
              label="Capital"
              value={formatCurrency(p.currentCapital)}
              valueSize="lg"
              deltaLabel={`${formatSignedCurrency(p.currentCapital - p.initialCapital)} vs $${p.initialCapital.toFixed(0)} start`}
              valueColor={p.currentCapital >= p.initialCapital ? 'var(--probex-positive)' : 'var(--probex-negative)'}
            />
            <StatCard
              label="Session P&L"
              value={formatSignedCurrency(p.totalPnl)}
              valueColor={p.totalPnl > 0 ? 'var(--probex-positive)' : p.totalPnl < 0 ? 'var(--probex-negative)' : undefined}
            />
            <StatCard
              label="Total Trades"
              value={String(p.totalTrades)}
              deltaLabel={p.totalTrades > 0 ? `${p.wins}W / ${p.losses}L` : 'none yet'}
            />
            <StatCard
              label="Win Rate"
              value={p.totalTrades > 0 ? formatPercent(p.winRate) : '—'}
              valueColor={p.totalTrades > 0 ? (p.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)') : undefined}
            />
            <StatCard
              label="Pending"
              value={String(p.pending)}
              {...(p.pushes > 0 && { deltaLabel: `${p.pushes} pushes` })}
            />
            <StatCard
              label="Session Started"
              value={new Date(p.sessionStart).toLocaleDateString()}
              deltaLabel={new Date(p.sessionStart).toLocaleTimeString()}
            />
          </div>

          {/* 2 · Best / worst trade */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Avg. Win" value={p.avgWin !== 0 ? formatCurrency(p.avgWin) : '—'} valueColor={p.avgWin !== 0 ? 'var(--probex-positive)' : undefined} />
            <StatCard label="Avg. Loss" value={p.avgLoss !== 0 ? formatCurrency(p.avgLoss) : '—'} valueColor={p.avgLoss !== 0 ? 'var(--probex-negative)' : undefined} />
            <StatCard label="Largest Win" value={p.largestWin !== 0 ? formatCurrency(p.largestWin) : '—'} valueColor={p.largestWin !== 0 ? 'var(--probex-positive)' : undefined} />
            <StatCard label="Largest Loss" value={p.largestLoss !== 0 ? formatCurrency(p.largestLoss) : '—'} valueColor={p.largestLoss !== 0 ? 'var(--probex-negative)' : undefined} />
          </div>

          {/* 3 · Cross-source discrepancy note, shown honestly rather than hidden */}
          {status && status.completedTrades !== p.totalTrades && (
            <Card>
              <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
                <strong>Two backend counters disagree:</strong> /api/paper-stats reports {p.totalTrades} total trades, but
                /api/paper/status reports {status.completedTrades} completed ({status.pendingTrades} pending). Both are shown
                rather than picking one — this is a real discrepancy in the engine's own bookkeeping, not a frontend bug.
              </p>
            </Card>
          )}

          {/* 4 · Survival state timeline */}
          {p.survivalStates.length > 0 && (
            <Card className="flex flex-col gap-3">
              <h3 className="t-label">
                Survival State Timeline
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {p.survivalStates.map(([ts, state], i) => (
                  <div key={`${ts}-${i}`} className="flex items-center gap-2">
                    <span
                      className="text-2xs font-bold uppercase tracking-wider px-2 py-1 rounded"
                      style={{
                        background: `color-mix(in srgb, ${stateColorVar(state)} 14%, transparent)`,
                        color: stateColorVar(state),
                        border: `1px solid color-mix(in srgb, ${stateColorVar(state)} 24%, transparent)`,
                      }}
                    >
                      {state}
                    </span>
                    <span className="text-2xs tabular-nums" style={{ color: 'var(--probex-text-disabled)' }}>
                      {new Date(ts).toLocaleTimeString()}
                    </span>
                    {i < p.survivalStates.length - 1 && <span aria-hidden="true" style={{ color: 'var(--probex-text-disabled)' }}>→</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 5 · Edge bucket + hourly performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            <BucketTable title="By Edge Bucket" source="/api/paper-stats" buckets={p.edgeBuckets} />
            <BucketTable title="By Hour of Day" source="/api/paper-stats" buckets={p.hourlyPerformance} formatKey={(k) => `${k}:00`} />
          </div>
        </>
      )}

      {!p && statsSlice.status !== 'error' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {['Capital', 'Session P&L', 'Total Trades', 'Win Rate', 'Pending', 'Session Started'].map((label) => (
            <StatCard key={label} label={label} value="" isLoading />
          ))}
        </div>
      )}

      {/* 6 · Settled ledger — reuses the existing Wallet component rather than
         duplicating the table (same /api/trades/ledger source). */}
      <CapitalLedger />
    </div>
  )
}

function stateColorVar(state: string): string {
  const s = state.toUpperCase()
  if (s === 'HEALTHY') return 'var(--probex-positive)'
  if (s === 'CAUTION' || s === 'WOUNDED') return 'var(--probex-warning)'
  if (s === 'DANGER' || s === 'CRITICAL') return 'var(--probex-negative)'
  return 'var(--probex-text-muted)'
}
function BucketTable({ title, source, buckets, formatKey }: { title: string; source: string; buckets: Record<string, BucketPerformanceStat>; formatKey?: (key: string) => string }) {
  const entries = Object.entries(buckets)
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="t-label">{title}</h3>
        <ProvenanceBadge provenance="live" detail={source} />
      </div>
      {entries.length === 0 ? (
        <EmptyState size="sm" title="No data yet" description="Populates as trades settle in this bucket." />
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-4 gap-2 text-2xs font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--probex-text-disabled)' }}>
            <span>Bucket</span>
            <span className="text-right">Trades</span>
            <span className="text-right">Win Rate</span>
            <span className="text-right">P&L</span>
          </div>
          {entries.map(([key, stat]) => (
            <div key={key} className="grid grid-cols-4 gap-2 items-center px-1 py-1.5 rounded text-xs" style={{ background: 'var(--probex-surface-2)' }}>
              <span className="font-medium truncate" style={{ color: 'var(--probex-text-primary)' }}>{formatKey ? formatKey(key) : key}</span>
              <span className="text-right tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>{stat.wins + stat.losses}</span>
              <span className="text-right tabular-nums font-semibold" style={{ color: stat.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)' }}>{formatPercent(stat.winRate)}</span>
              <span className="text-right tabular-nums" style={{ color: stat.totalPnl >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)' }}>{formatSignedCurrency(stat.totalPnl)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
