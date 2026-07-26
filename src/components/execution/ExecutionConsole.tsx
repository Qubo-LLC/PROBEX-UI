'use client'

// ExecutionConsole — execution quality console (/execution).
//
// Operator questions, in order (PROBEX_PRODUCT_SPEC.md §4):
//   1. What has the engine traded, and with what result? → trading record
//   2. How fast and reliable is execution?               → latency + retries
//   3. Is anything throttling it?                        → rate limiters + backoff
//   4. Are resolutions being tracked?                    → resolution tracker
//
// Source: /api/execution/status — the SOURCE OF TRADING TRUTH (spec §6.2).
// Truth rules: latency metrics render only after the first execution; a
// zero-retry session reads "no retries needed", not an empty chart.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { StatCard }   from '@/components/ui/StatCard'
import { Card }       from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmergencyStopPanel } from './EmergencyStopPanel'
import { ManualOrderPanel } from './ManualOrderPanel'
import { OrdersTable } from './OrdersTable'
import { ErrorState } from '@/components/ui/ErrorState'
import type { RateLimitBucket, ExecutionPolicy, PaperStats, PaperStatus } from '@/types/engine'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

export function ExecutionConsole({ embedded = false }: EmbeddableProps = {}) {
  const slice = useApplicationStore((s) => s.engine.executionStatus)
  const ex    = slice.data

  const policySlice = useApplicationStore((s) => s.engine.executionPolicy)
  const policy      = policySlice.status === 'success' ? policySlice.data : null
  const paperSlice  = useApplicationStore((s) => s.engine.paperStats)
  const paper       = paperSlice.status === 'success' ? paperSlice.data : null
  const paperStatusSlice = useApplicationStore((s) => s.engine.paperStatus)
  const paperStatus      = paperStatusSlice.status === 'success' ? paperStatusSlice.data : null

  return (
    <div className={pageShell(embedded, 'gap-4')}>
      {!embedded && (
        <PageHeader
          title="Execution"
          subtitle="Execution engine quality — trading record, latency, reliability, throttling"
        />
      )}

      {/* Manual controls sit above the telemetry: when an operator opens this
          page to intervene, the halt control should be the first thing reached,
          not something to scroll past the metrics for. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <EmergencyStopPanel />
        <ManualOrderPanel />
      </div>

      <OrdersTable />

      {slice.status === 'loading' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {['Balance', 'Total Trades', 'Win Rate', 'Total P&L', 'Positions'].map((label) => (
            <StatCard key={label} label={label} value="" isLoading />
          ))}
        </div>
      )}

      {slice.status === 'error' && (
        <ErrorState
          title="Execution status unavailable"
          description={slice.error?.message ?? 'The /api/execution/status endpoint did not respond.'}
          fullPage={false}
        />
      )}

      {ex && (
        <>
          {!ex.available && (
            <Card>
              <p className="text-xs font-semibold" style={{ color: 'var(--probex-warning)' }}>
                The execution engine reports itself unavailable — figures below are its last known state.
              </p>
            </Card>
          )}

          {/* 1 · Trading record */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            <StatCard
              label="Balance"
              value={formatCurrency(ex.balance)}
              deltaLabel={ex.mode === 'paper' ? 'Paper account' : 'Live account'}
            />
            <StatCard
              label="Total Trades"
              value={String(ex.totalTrades)}
              deltaLabel={
                ex.totalTrades > 0
                  ? `${ex.wins}W / ${ex.losses}L`
                  : 'No trades this session'
              }
            />
            {ex.totalTrades > 0 && (
              <StatCard
                label="Win Rate"
                value={formatPercent(ex.winRate)}
                valueColor={ex.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)'}
                deltaLabel={`${ex.wins}W / ${ex.losses}L`}
              />
            )}
            <StatCard
              label="Total P&L"
              value={formatSignedCurrency(ex.totalPnl)}
              valueColor={
                ex.totalPnl > 0 ? 'var(--probex-positive)'
                : ex.totalPnl < 0 ? 'var(--probex-negative)' : undefined
              }
            />
            <StatCard
              label="Positions"
              value={String(ex.activePositions)}
              deltaLabel={`active · ${ex.closedPositions} closed`}
            />
          </div>

          {/* 2 · Latency + reliability */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            <Card className="flex flex-col gap-3">
              <h3 className="t-label">
                Execution Latency
              </h3>
              {ex.totalTrades > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  <LatencyStat label="Average" ms={ex.avgExecutionMs} />
                  <LatencyStat label="Fastest" ms={ex.fastestTradeMs} />
                  <LatencyStat label="Slowest" ms={ex.slowestTradeMs} />
                </div>
              ) : (
                <p className="text-xs py-3" style={{ color: 'var(--probex-text-disabled)' }}>
                  No executions yet this session — latency is measured per trade and
                  will appear with the first fill.
                </p>
              )}
            </Card>

            <Card className="flex flex-col gap-3">
              <h3 className="t-label">
                Order Reliability
              </h3>
              {ex.retryStats.totalRetries > 0 ? (
                <div className="flex flex-col gap-1.5 text-xs">
                  <ReliabilityRow label="Total retries"        value={ex.retryStats.totalRetries} />
                  <ReliabilityRow label="Recovered by retry"   value={ex.retryStats.successfulRetries} tone="positive" />
                  <ReliabilityRow label="Failed after retries" value={ex.retryStats.failedAfterRetries} tone="negative" />
                  <div className="h-px my-1" style={{ background: 'var(--probex-border)' }} aria-hidden="true" />
                  <ReliabilityRow label="Network errors"       value={ex.retryStats.networkErrors} />
                  <ReliabilityRow label="Balance errors"       value={ex.retryStats.balanceErrors} />
                  <ReliabilityRow label="Invalid-order errors" value={ex.retryStats.invalidOrderErrors} />
                </div>
              ) : (
                <p className="text-xs py-3" style={{ color: 'var(--probex-text-disabled)' }}>
                  No order retries recorded — every submission this session succeeded
                  first time (or no orders have been submitted yet).
                </p>
              )}
            </Card>
          </div>

          {/* 3 · Rate limiters + backoff */}
          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="t-label">
                Rate Limiters
              </h3>
              <span
                className="text-2xs font-semibold"
                style={{ color: ex.backoff.active ? 'var(--probex-warning)' : 'var(--probex-text-muted)' }}
              >
                {ex.backoff.active
                  ? `429 backoff ACTIVE · ${ex.backoff.recent429s5min} hits in 5 min`
                  : `Backoff idle · ${ex.backoff.total429s} × 429 lifetime`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <BucketGauge bucket={ex.rateLimitBuckets.market} />
              <BucketGauge bucket={ex.rateLimitBuckets.price} />
              <BucketGauge bucket={ex.rateLimitBuckets.order} />
            </div>
          </Card>

          {/* 4 · Resolution tracker */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="t-label">
                Resolution Tracker
              </h3>
              <span
                className="flex items-center gap-1.5 text-2xs font-semibold"
                style={{ color: ex.resolutionStats.isRunning ? 'var(--probex-positive)' : 'var(--probex-negative)' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: ex.resolutionStats.isRunning ? 'var(--probex-positive)' : 'var(--probex-negative)' }}
                  aria-hidden="true"
                />
                {ex.resolutionStats.isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            {ex.resolutionStats.totalResolved > 0 ? (
              <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                <span>{ex.resolutionStats.totalResolved} resolved</span>
                <span style={{ color: 'var(--probex-positive)' }}>{ex.resolutionStats.wins} wins</span>
                <span style={{ color: 'var(--probex-negative)' }}>{ex.resolutionStats.losses} losses</span>
                <span>{ex.resolutionStats.autoClosed} auto-closed</span>
                <span style={{ color: ex.resolutionStats.resolutionErrors > 0 ? 'var(--probex-negative)' : undefined }}>
                  {ex.resolutionStats.resolutionErrors} errors
                </span>
                <span>{ex.resolutionStats.trackedPositions} currently tracked</span>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
                {ex.resolutionStats.trackedPositions > 0
                  ? `Tracking ${ex.resolutionStats.trackedPositions} open position${ex.resolutionStats.trackedPositions === 1 ? '' : 's'} — none resolved yet.`
                  : 'No positions have reached resolution this session.'}
              </p>
            )}
          </Card>

          {/* 5 · Paper session (from /api/paper-stats + /api/paper/status) */}
          {paper && <PaperSessionCard paper={paper} paperStatus={paperStatus} />}

          {/* 6 · Execution policy (from /api/execution/policy, read-only) */}
          {policy && <ExecutionPolicyCard policy={policy} />}
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LatencyStat({ label, ms }: { label: string; ms: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>
        {Math.round(ms).toLocaleString()}<span className="text-xs font-medium" style={{ color: 'var(--probex-text-muted)' }}>ms</span>
      </span>
    </div>
  )
}

function ReliabilityRow({ label, value, tone }: { label: string; value: number; tone?: 'positive' | 'negative' }) {
  const color =
    value === 0 ? 'var(--probex-text-muted)'
    : tone === 'positive' ? 'var(--probex-positive)'
    : tone === 'negative' ? 'var(--probex-negative)'
    : 'var(--probex-text-primary)'
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--probex-text-secondary)' }}>{label}</span>
      <span className="font-semibold tabular-nums" style={{ color }}>{value.toLocaleString()}</span>
    </div>
  )
}

/**
 * Per-bucket gauge: wait-rate bar (the saturation signal) + request counters.
 * Wait rate > 90% = red, > 50% = amber — the operator's cue that the engine
 * is throttling itself (see P0-02 in the backend dependency report).
 */
function BucketGauge({ bucket }: { bucket: RateLimitBucket }) {
  const waitRate = bucket.waitRatePct
  const barColor =
    waitRate > 90 ? 'var(--probex-negative)'
    : waitRate > 50 ? 'var(--probex-warning)'
    : 'var(--probex-positive)'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold" style={{ color: 'var(--probex-text-secondary)' }}>{bucket.name}</span>
        <span className="tabular-nums font-bold" style={{ color: barColor }}>
          {waitRate.toFixed(1)}% waited
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--probex-surface-2)' }}
        role="progressbar"
        aria-valuenow={Math.round(waitRate)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${bucket.name} wait rate`}
      >
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, waitRate)}%`, background: barColor }} />
      </div>
      <div className="flex items-center justify-between text-2xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
        <span>{bucket.totalRequests.toLocaleString()} requests · {bucket.ratePerSec.toFixed(2)}/s cap</span>
        <span>avg wait {Math.round(bucket.avgWaitMs).toLocaleString()}ms</span>
      </div>
    </div>
  )
}

/**
 * Paper-trading session summary (/api/paper-stats). Shown only in paper mode;
 * a fresh session with zero trades reads as "no trades resolved yet", never as
 * a wall of zeroes pretending to be performance.
 */
function PaperSessionCard({ paper, paperStatus }: { paper: PaperStats; paperStatus: PaperStatus | null }) {
  const p = paper.paperTrading
  const net = p.currentCapital - p.initialCapital
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="t-label">
          Paper Session
        </h3>
        <span className="text-2xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
          started {new Date(p.sessionStart).toLocaleString()}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Capital"
          value={formatCurrency(p.currentCapital)}
          deltaLabel={`${formatSignedCurrency(net)} vs start`}
          valueColor={net > 0 ? 'var(--probex-positive)' : net < 0 ? 'var(--probex-negative)' : undefined}
        />
        <StatCard
          label="Session P&L"
          value={formatSignedCurrency(p.totalPnl)}
          valueColor={p.totalPnl > 0 ? 'var(--probex-positive)' : p.totalPnl < 0 ? 'var(--probex-negative)' : undefined}
        />
        <StatCard
          label="Trades"
          value={String(p.totalTrades)}
          deltaLabel={p.totalTrades > 0 ? `${p.wins}W / ${p.losses}L` : 'none yet'}
        />
        <StatCard
          label="Win Rate"
          value={p.totalTrades > 0 ? formatPercent(p.winRate) : '—'}
          valueColor={p.totalTrades > 0 ? (p.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)') : undefined}
          {...(p.pending > 0
            ? { deltaLabel: `${p.pending} pending` }
            : p.pushes > 0
              ? { deltaLabel: `${p.pushes} pushes` }
              : {})}
        />
      </div>
      {p.totalTrades === 0 && (
        <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
          No paper trades have resolved yet this session — figures populate as the engine
          opens and settles positions.
        </p>
      )}
      {paperStatus && (
        <div className="flex items-center gap-4 text-2xs pt-1" style={{ borderTop: '1px solid var(--probex-border)', color: 'var(--probex-text-muted)' }}>
          <span>Paper trading {paperStatus.enabled ? 'enabled' : 'disabled'}</span>
          <span>{paperStatus.pendingTrades} pending</span>
          <span>{paperStatus.completedTrades} completed (/api/paper/status)</span>
          {paperStatus.completedTrades !== p.totalTrades && (
            <span style={{ color: 'var(--probex-warning)' }} title="This session's paper-stats total_trades reports a different count than /api/paper/status — two distinct backend counters, not an error.">
              ≠ {p.totalTrades} from paper-stats
            </span>
          )}
        </div>
      )}
    </Card>
  )
}

/**
 * Execution policy (/api/execution/policy) — the engine's read-only order-flow
 * pipeline, risk limits, and self-reported limitations. This never places
 * orders; it explains HOW an order would be built if an edge cleared the filter.
 */
function ExecutionPolicyCard({ policy }: { policy: ExecutionPolicy }) {
  const r = policy.riskLimits
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="t-label">
          Execution Policy
        </h3>
        <span
          className="text-2xs font-semibold px-2 py-0.5 rounded"
          style={{
            background: policy.liveTradingEnabled ? 'var(--probex-negative-dim)' : 'var(--probex-surface-2)',
            color:      policy.liveTradingEnabled ? 'var(--probex-negative)' : 'var(--probex-text-secondary)',
          }}
        >
          {policy.mode.toUpperCase()} · LIVE TRADING {policy.liveTradingEnabled ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* Risk limits */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <PolicyStat label="Max positions"  value={String(r.maxConcurrentPositions)} />
        <PolicyStat label="Max bet"         value={`${r.maxBetPercent}%`} />
        <PolicyStat label="Kelly fraction"  value={r.kellyFraction.toFixed(2)} />
        <PolicyStat label="Min order"       value={formatCurrency(r.minimumOrderSizeUsd)} />
        <PolicyStat label="Max latency"     value={`${r.maxLatencyMs}ms`} />
      </div>

      {/* Order flow pipeline */}
      <div className="flex flex-col gap-1.5">
        <span className="t-label">
          Order Flow
        </span>
        <ol className="flex flex-wrap items-center gap-1.5">
          {policy.orderFlow.map((step, i) => (
            <li key={step} className="flex items-center gap-1.5">
              <span
                className="text-2xs font-medium px-2 py-1 rounded tabular-nums"
                style={{ background: 'var(--probex-surface-2)', color: 'var(--probex-text-secondary)' }}
              >
                <span style={{ color: 'var(--probex-text-disabled)' }}>{i + 1}.</span> {step.replace(/_/g, ' ')}
              </span>
              {i < policy.orderFlow.length - 1 && (
                <span aria-hidden="true" style={{ color: 'var(--probex-text-disabled)' }}>→</span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* Known limitations */}
      {policy.knownLimitations.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="t-label">
            Known Limitations
          </span>
          <ul className="flex flex-col gap-1">
            {policy.knownLimitations.map((note) => (
              <li key={note} className="text-2xs leading-relaxed pl-3 relative" style={{ color: 'var(--probex-text-disabled)' }}>
                <span className="absolute left-0" aria-hidden="true">·</span>{note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function PolicyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <span className="text-base font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{value}</span>
    </div>
  )
}
