'use client'

// ExecutionConsole — execution quality console (/execution).
//
// Operator questions, in order (PROBEX_PRODUCT_SPEC.md §4):
//   1. What has the engine traded, and with what result? → trading record
//   2. How fast and reliable is execution?               → latency + retries
//   3. Is anything throttling it?                        → rate limiters + backoff
//   4. Are resolutions being tracked?                    → resolution tracker
//
// ─── Counter scope (Stage 7) ─────────────────────────────────────────────────
// /api/execution/status was described here as "the SOURCE OF TRADING TRUTH".
// The Stage 6 forensic work disproved that: its counters are scoped to the
// current engine PROCESS and reset on restart. Measured 2026-09-09 it reported
// total_trades 0 / total_pnl 0.00 while /api/paper-stats reported 3 trades and
// −17.52 in the same session. Nothing here is relabelled as lifetime or total
// unless the backend guarantees that meaning — which, for this endpoint, it
// does not.
//
// Truth rules: latency metrics render only after the first execution; a
// zero-retry session reads "no retries needed", not an empty chart.

import { useApplicationStore } from '@/store/applicationStore'
import { useWriteGate } from '@/config/hooks/useWriteGate'
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'
import type { ServiceState } from '@/lib/services/response'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { Card }       from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusChip } from '@/components/ui/StatusChip'
import { Panel, Focal, Row, RowGroup, Meter, PanelPending } from '@/components/ui/Panel'
import { EmergencyStopPanel } from './EmergencyStopPanel'
import { ManualOrderPanel } from './ManualOrderPanel'
import { OrdersTable } from './OrdersTable'
import { ErrorState } from '@/components/ui/ErrorState'
import type { RateLimitBucket, ExecutionPolicy, PaperStats, PaperStatus } from '@/types/engine'
import type { WriteGateReason } from '@/lib/display/writeGate'
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
  // The same gate the order controls obey — read here so the page can STATE the
  // execution posture rather than leaving it implied by a disabled button.
  const gate = useWriteGate()

  return (
    // Execution reports state; the endpoint that served each reading is lineage,
    // not headline content. Seven raw paths rendered as body text before this.
    <ProvenanceScope detail="tooltip">
    <div className={pageShell(embedded, 'gap-4')}>
      {!embedded && (
        <PageHeader
          title="Execution"
          subtitle="Execution engine quality — trading record, latency, reliability, throttling"
        />
      )}

      {/* 0 · Execution posture — the first thing the page says.
          Every value is a real field: policy.mode, policy.liveTradingEnabled,
          executionStatus.available, and the write gate's own reason. */}
      <ExecutionModeBand
        policy={policy}
        available={ex?.available ?? null}
        gateReason={gate.reason}
        gateDetail={gate.detail}
      />

      {slice.status === 'loading' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {['Trading Record', 'Account', 'Throughput'].map((label) => (
            <Panel key={label} title={label}>
              <PanelPending note="Awaiting the execution engine." />
            </Panel>
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

          {/* 1 · Trading record.
              Was five StatCards; Win Rate additionally disappeared entirely
              before the first trade, so the row silently changed from five
              columns to four and every card shifted. Panels keep their frame
              and withhold the figure instead. */}
          <section aria-label="Trading record" className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Scoped title and unit. "Total P&L" on a counter that resets with
                the process is the exact mislabel the brief forbids — and this
                one read $0.00 while the paper session below showed −$17.52. */}
            <Panel
              title="Engine Process Record"
              subtitle="Resets when the engine restarts"
              provenance="live"
              source="/api/execution/status"
              slice={slice}
            >
              <Focal
                value={formatSignedCurrency(ex.totalPnl)}
                unit="P&L this process"
                color={
                  ex.totalPnl > 0 ? 'var(--probex-positive)'
                  : ex.totalPnl < 0 ? 'var(--probex-negative)' : undefined
                }
                caption={
                  ex.totalTrades === 0
                    ? <span className="t-helper">
                        No trades executed since the engine last started. Settled history lives on
                        Positions and the paper session below.
                      </span>
                    : undefined
                }
              />
              {ex.totalTrades > 0 && (
                <Meter
                  value={Math.max(0, Math.min(1, ex.winRate))}
                  color={ex.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)'}
                  ariaLabel="Win rate"
                />
              )}
              <RowGroup>
                <Row label="Trades this process" value={`${ex.totalTrades}`} title="Scoped to the current engine process — not the account's lifetime count" />
                <Row
                  label="Win rate"
                  value={ex.totalTrades > 0 ? formatPercent(ex.winRate) : '—'}
                  color={ex.totalTrades > 0 && ex.winRate >= 0.5 ? 'var(--probex-positive)' : undefined}
                />
                <Row label="Record" value={ex.totalTrades > 0 ? `${ex.wins}W · ${ex.losses}L` : '—'} />
              </RowGroup>
            </Panel>

            <Panel
              title="Account"
              provenance="live"
              source="/api/execution/status"
              slice={slice}
              action={
                <StatusChip tone={ex.mode === 'live' ? 'danger' : 'info'} dot={false}>
                  {ex.mode}
                </StatusChip>
              }
            >
              <Focal
                value={formatCurrency(ex.balance)}
                unit={ex.mode === 'paper' ? 'paper balance, this process' : 'live balance, this process'}
              />
              <RowGroup>
                <Row label="Open positions" value={`${ex.activePositions}`} />
                <Row label="Closed" value={`${ex.closedPositions}`} />
                <Row
                  label="Balance age"
                  value={`${Math.round(ex.balanceCacheAgeSec)}s`}
                  title="How stale the cached balance figure is"
                />
              </RowGroup>
            </Panel>

            <Panel title="Throughput" provenance="live" source="/api/execution/status" slice={slice}>
              <Focal
                value={ex.totalTrades > 0 ? `${Math.round(ex.avgExecutionMs)}` : '—'}
                unit={ex.totalTrades > 0 ? 'ms average fill' : 'no fills yet'}
                caption={
                  ex.totalTrades === 0
                    ? <span className="t-helper">Latency is measured per trade.</span>
                    : undefined
                }
              />
              <RowGroup>
                <Row label="Fastest" value={ex.totalTrades > 0 ? `${Math.round(ex.fastestTradeMs)}ms` : '—'} />
                <Row label="Slowest" value={ex.totalTrades > 0 ? `${Math.round(ex.slowestTradeMs)}ms` : '—'} />
                <Row
                  label="Retries"
                  value={`${ex.retryStats.totalRetries}`}
                  color={ex.retryStats.totalRetries > 0 ? 'var(--probex-warning)' : undefined}
                />
              </RowGroup>
            </Panel>
          </section>

          {/* 2 · Latency + reliability */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            <Card className="flex flex-col gap-3">
              <h3 className="t-card-title">
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
              <h3 className="t-card-title">
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
              <h3 className="t-card-title">
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
              <h3 className="t-card-title">
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
          {paper && <PaperSessionCard paper={paper} paperStatus={paperStatus} slice={paperSlice} />}

          {/* 6 · Execution policy (from /api/execution/policy, read-only) */}
          {policy && <ExecutionPolicyCard policy={policy} />}

        </>
      )}

      {/* 7 · Manual intervention — LAST in reading order, and OUTSIDE the
          `{ex && …}` guard above.
          Rank is the only thing Stage 7 changed about these panels: behaviour,
          gating and confirmation copy are untouched, and crucially they remain
          reachable when /api/execution/status is unavailable. An operator
          reaching for the halt control is most likely to do so when something is
          already wrong — which is exactly when the status endpoint may be the
          broken thing. EmergencyStopPanel is built for that case: it withholds
          the blast-radius figures when position state is unknown and keeps the
          button live, because the engine may still be holding capital. */}
      <section aria-label="Manual intervention" className="flex flex-col gap-3 pt-2">
        <div className="flex flex-col gap-1">
          <h2 className="t-section-title">Manual Intervention</h2>
          <p className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            Operator overrides. The engine trades on its own; everything below acts against it, and
            each control states what it will do before it does it.
            {gate.detail !== null && ` ${gate.detail}`}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          <EmergencyStopPanel />
          <ManualOrderPanel />
        </div>
        <OrdersTable />
      </section>
    </div>
    </ProvenanceScope>
  )
}

/**
 * Execution posture, stated in words.
 *
 * The brief's requirement is that a reader is never left uncertain whether the
 * engine is paper, live, disabled, unavailable or degraded. Colour alone cannot
 * carry that, so every state here is a sentence with an explicit mode word; the
 * chip tone only reinforces it.
 *
 * Sources, all real: /api/execution/policy (mode, live_trading_enabled),
 * /api/execution/status (available), and the write gate's own reason — which is
 * already the authority the order controls obey, so the page and the buttons
 * can never disagree.
 */
function ExecutionModeBand({
  policy, available, gateReason, gateDetail,
}: {
  policy: ExecutionPolicy | null
  available: boolean | null
  gateReason: WriteGateReason
  gateDetail: string | null
}) {
  // Unknown is not "paper". Until the policy has been read, the band says so.
  const mode = policy?.mode ?? null
  const liveEnabled = policy?.liveTradingEnabled ?? null

  const posture: { word: string; tone: 'positive' | 'warning' | 'danger' | 'neutral'; sentence: string } =
    gateReason === 'engine-unreachable'
      ? { word: 'UNAVAILABLE', tone: 'danger',
          sentence: 'The execution engine is unreachable. No execution state can be confirmed and no order can be sent.' }
    : mode === null || liveEnabled === null
      ? { word: 'UNCONFIRMED', tone: 'warning',
          sentence: 'The engine has not yet reported its execution mode. Nothing below is confirmed until it does.' }
    : mode === 'live' || liveEnabled === true
      ? { word: 'LIVE', tone: 'danger',
          sentence: 'The engine is configured for LIVE trading — orders it places risk real capital.' }
    : available === false
      ? { word: 'PAPER · ENGINE DISABLED', tone: 'warning',
          sentence: 'The engine is in PAPER mode and live trading is disabled, but the execution subsystem reports itself unavailable — figures below are its last known state.' }
      : { word: 'PAPER', tone: 'positive',
          sentence: 'The engine is in PAPER mode and live trading is disabled. Every order below is simulated; no real capital is at risk.' }

  return (
    <section
      aria-label="Execution mode"
      className="rounded-lg px-4 py-3 flex flex-col gap-2"
      style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border-default)' }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="t-label">Execution mode</span>
        <StatusChip tone={posture.tone} dot={false}>{posture.word}</StatusChip>
        {liveEnabled !== null && (
          <span className="text-2xs font-semibold" style={{ color: 'var(--probex-text-muted)' }}>
            live trading {liveEnabled ? 'ENABLED' : 'DISABLED'}
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--probex-text-secondary)' }}>
        {posture.sentence}
      </p>
      {gateDetail !== null && gateReason !== 'permitted' && (
        <p className="t-helper">Manual order flow: {gateDetail}</p>
      )}
    </section>
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
// `slice` is threaded from the parent rather than re-subscribed: the badge must
// describe the freshness of the SAME read these figures came from.
function PaperSessionCard({ paper, paperStatus, slice }: { paper: PaperStats; paperStatus: PaperStatus | null; slice: ServiceState<PaperStats> }) {
  const p = paper.paperTrading
  const net = p.currentCapital - p.initialCapital
  return (
    <Panel
      title="Paper Session"
      provenance="live"
      source="/api/paper-stats"
      slice={slice}
      action={
        <span className="text-2xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
          started {new Date(p.sessionStart).toLocaleString()}
        </span>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <div className="flex flex-col gap-3">
          <Focal
            value={formatCurrency(p.currentCapital)}
            unit={`${formatSignedCurrency(net)} vs start`}
            color={net > 0 ? 'var(--probex-positive)' : net < 0 ? 'var(--probex-negative)' : undefined}
          />
          {p.totalTrades > 0 && (
            <Meter
              value={Math.max(0, Math.min(1, p.winRate))}
              color={p.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)'}
              ariaLabel="Paper session win rate"
            />
          )}
        </div>
        <RowGroup>
          <Row
            label="Session P&L"
            value={formatSignedCurrency(p.totalPnl)}
            color={p.totalPnl > 0 ? 'var(--probex-positive)' : p.totalPnl < 0 ? 'var(--probex-negative)' : undefined}
          />
          <Row label="Trades" value={p.totalTrades > 0 ? `${p.totalTrades} · ${p.wins}W ${p.losses}L` : '0'} />
          <Row
            label="Win rate"
            value={p.totalTrades > 0 ? formatPercent(p.winRate) : '—'}
            color={p.totalTrades > 0 && p.winRate >= 0.5 ? 'var(--probex-positive)' : undefined}
          />
          {p.pending > 0 && <Row label="Pending" value={`${p.pending}`} />}
          {p.pushes > 0 && <Row label="Pushes" value={`${p.pushes}`} />}
        </RowGroup>
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
    </Panel>
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
        <h3 className="t-card-title">
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
