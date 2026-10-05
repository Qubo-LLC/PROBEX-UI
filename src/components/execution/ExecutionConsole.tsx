'use client'

// ExecutionConsole — the state of the order-execution subsystem.
//
// Operator questions, in order:
//   A  What mode is it in, and can it send anything?      → posture
//   B  What has it done this process, and how fast?       → figures
//   C  Is anything throttling or tracking?                → limiters, backoff,
//                                                           resolution tracker
//   D  How would it build an order, and what does it say  → policy: the
//      about itself?                                        engine's own step
//                                                           list and caveats
//   —  Manual intervention                                 → the mutation panels
//
// ─── What this subsystem is, and is not ──────────────────────────────────────
// /api/execution/status describes the REAL-order executor. Its counters are
// scoped to the current engine process (they reset on restart — measured
// 2026-09-09: 0 trades here against 3 in the paper session), and in paper
// mode it submits nothing at all, so every counter is legitimately zero and
// its `balance` is the untouched initial bankroll. The paper session is a
// different record and has its own tab; settlements live on Capital & Ledger.
// The previous console rendered the executor's balance under the heading
// "Account" and a "Paper Session" panel here as well as on the Paper tab.
//
// Nothing here explains WHY an order happened; the wire has no such record.

import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { useWriteGate } from '@/config/hooks/useWriteGate'
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'
import { formatCurrency } from '@/lib/utils'
import { formatAge } from '@/lib/display/freshness'
import { executionPosture } from '@/lib/display/execution'
import { ROUTES } from '@/config/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusChip } from '@/components/ui/StatusChip'
import { ErrorState } from '@/components/ui/ErrorState'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'
import { EmergencyStopPanel } from './EmergencyStopPanel'
import { ManualOrderPanel } from './ManualOrderPanel'
import { OrdersTable } from './OrdersTable'
import type { ExecutionPolicy, RateLimitBucket } from '@/types/engine'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

/** /api/execution/status polls at MEDIUM cadence (ApplicationStateLoader). */
const STATUS_POLL_MS = 5_000

export function ExecutionConsole({ embedded = false }: EmbeddableProps = {}) {
  const slice  = useApplicationStore((s) => s.engine.executionStatus)
  const orders = useApplicationStore((s) => s.engine.executionOrders)
  const policySlice = useApplicationStore((s) => s.engine.executionPolicy)
  const ex     = slice.data
  const policy = policySlice.data
  const gate   = useWriteGate()

  const posture = executionPosture(policy, ex?.available ?? null, gate.reason)
  const cert = certaintyFromSlice(slice, STATUS_POLL_MS)
  const paperMode = policy?.mode === 'paper' && !policy.liveTradingEnabled

  return (
    <ProvenanceScope detail="tooltip">
    <div className={pageShell(embedded, 'gap-5')}>
      {!embedded && (
        <PageHeader title="Execution" subtitle="The order-execution subsystem — its mode, its counters, and how it would build an order" />
      )}

      {/* ── A · posture ──────────────────────────────────────────────────── */}
      <section aria-label="Execution mode" className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="t-label">Execution mode</span>
          <StatusChip tone={posture.tone} dot={false}>{posture.word}</StatusChip>
          {policy && (
            <span className="t-helper">live trading {policy.liveTradingEnabled ? 'ENABLED' : 'DISABLED'} · /api/execution/policy</span>
          )}
        </div>
        <p className="text-sm font-medium leading-relaxed m-0" style={{ color: 'var(--synatra-text-primary)' }}>{posture.sentence}</p>
        {gate.detail !== null && gate.reason !== 'permitted' && <p className="t-helper m-0">Manual order flow: {gate.detail}</p>}
        {paperMode && (
          <p className="t-helper m-0">
            The paper session’s record is on the{' '}
            <Link href={`${ROUTES.EXECUTION}?view=paper`} className="focus-ring font-semibold" style={{ color: 'var(--synatra-primary)' }}>Paper Trading tab →</Link>
            {' '}and its settlements on{' '}
            <Link href={`${ROUTES.PORTFOLIO}?view=capital`} className="focus-ring font-semibold" style={{ color: 'var(--synatra-primary)' }}>Capital &amp; Ledger →</Link>.
          </p>
        )}
      </section>

      {/* ── B · this process ─────────────────────────────────────────────── */}
      <section aria-labelledby="ex-process" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 flex-wrap">
            <h2 id="ex-process" className="t-section-title">This process</h2>
            <span className="t-description">the executor’s own counters — they reset when the engine restarts</span>
            <Popover label="About the executor's counters" trigger={(p) => <InfoButton what="the executor's counters" {...p} />}>
              <PopoverTitle>Process-scoped, subsystem-scoped</PopoverTitle>
              <PopoverText>
                These count what the real-order executor has done since the engine process
                started. In paper mode it submits nothing, so zero here is expected and is not the
                paper session’s record. Its balance is its own bankroll figure, not the account —
                the account is on Capital &amp; Ledger.
              </PopoverText>
            </Popover>
          </span>
          <span className="t-metadata">/api/execution/status · /api/execution/orders</span>
        </div>

        {slice.status === 'error' && !ex ? (
          <ErrorState title="The execution subsystem did not answer" description={slice.error?.message ?? 'No response from /api/execution/status.'} fullPage={false} />
        ) : !ex ? (
          <p className="t-description">Waiting for /api/execution/status.</p>
        ) : (
          <>
            {!ex.available && (
              <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>The subsystem reports itself unavailable — the figures are its last known state.</p>
            )}
            <div className="flex items-start gap-x-8 gap-y-3 flex-wrap">
              {orders.data ? (
                <Figure label="Orders" size="md" title="total_count from /api/execution/orders" footnote={<span className="t-helper">{orders.data.activeCount} active · {orders.data.closedCount} closed</span>} {...certaintyFromSlice(orders, STATUS_POLL_MS)}>
                  {orders.data.totalCount}
                </Figure>
              ) : (
                <Figure label="Orders" size="md" certainty="absent" absentReason={orders.status === 'error' ? 'orders did not answer' : 'waiting for orders'}>—</Figure>
              )}
              <Figure label="Trades" size="md" title="total_trades — fills this process" footnote={<span className="t-helper">{ex.totalTrades > 0 ? `${ex.wins} won · ${ex.losses} lost` : paperMode ? 'none — nothing is submitted in paper mode' : 'none this process'}</span>} {...cert}>
                {ex.totalTrades}
              </Figure>
              {ex.totalTrades > 0 ? (
                <Figure label="Fill latency" size="md" title="avg_execution_ms" footnote={<span className="t-helper">{Math.round(ex.fastestTradeMs)}–{Math.round(ex.slowestTradeMs)} ms range</span>} {...cert}>
                  {Math.round(ex.avgExecutionMs)} ms
                </Figure>
              ) : (
                <Figure label="Fill latency" size="md" certainty="absent" absentReason="measured per fill — none yet">—</Figure>
              )}
              <Figure label="Retries" size="md" tone={ex.retryStats.totalRetries > 0 ? 'var(--synatra-warning)' : undefined} title="retry_stats.total_retries" footnote={<span className="t-helper">{ex.retryStats.totalRetries > 0 ? `${ex.retryStats.successfulRetries} recovered · ${ex.retryStats.failedAfterRetries} failed` : 'no submission has needed one'}</span>} {...cert}>
                {ex.retryStats.totalRetries}
              </Figure>
              <Figure
                label="Executor bankroll"
                size="md"
                title="status.balance — the executor's own balance figure, not the account"
                footnote={<span className="t-helper">{paperMode ? 'untouched in paper mode' : `cached ${Math.round(ex.balanceCacheAgeSec)}s ago`} · not the account</span>}
                {...cert}
              >
                {formatCurrency(ex.balance)}
              </Figure>
            </div>
            {(ex.retryStats.networkErrors > 0 || ex.retryStats.balanceErrors > 0 || ex.retryStats.invalidOrderErrors > 0) && (
              <p className="t-helper m-0" style={{ color: 'var(--synatra-warning)' }}>
                Errors this process: {ex.retryStats.networkErrors} network · {ex.retryStats.balanceErrors} balance · {ex.retryStats.invalidOrderErrors} invalid-order.
              </p>
            )}
          </>
        )}
      </section>

      {/* ── C · throttling and tracking ──────────────────────────────────── */}
      {ex && (
        <section aria-labelledby="ex-limits" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span className="flex items-baseline gap-2 flex-wrap">
              <h2 id="ex-limits" className="t-section-title">Throttling and tracking</h2>
              <span className="t-description">the engine’s own rate limiters, its 429 backoff, and the resolution tracker</span>
            </span>
            <span className="t-metadata">/api/execution/status</span>
          </div>

          <p className="t-helper m-0" style={ex.backoff.active ? { color: 'var(--synatra-warning)' } : undefined}>
            <span className="t-label mr-2">Backoff</span>
            {ex.backoff.active
              ? `active${ex.backoff.until !== null ? ` until ${new Date(ex.backoff.until).toLocaleTimeString()}` : ''} · ${ex.backoff.recent429s5min} × 429 in the last 5 min`
              : `idle · ${ex.backoff.total429s} × 429 recorded this process`}
          </p>
          <p className="t-helper m-0">
            <span className="t-label mr-2">Resolution tracker</span>
            <span style={{ color: ex.resolutionStats.isRunning ? 'var(--synatra-positive)' : 'var(--synatra-negative)' }}>{ex.resolutionStats.isRunning ? 'running' : 'stopped'}</span>
            {' · '}{ex.resolutionStats.trackedPositions} tracked · {ex.resolutionStats.totalResolved} resolved
            {ex.resolutionStats.totalResolved > 0 && ` (${ex.resolutionStats.wins} won · ${ex.resolutionStats.losses} lost · ${ex.resolutionStats.autoClosed} auto-closed)`}
            {ex.resolutionStats.resolutionErrors > 0 && <span style={{ color: 'var(--synatra-negative)' }}> · {ex.resolutionStats.resolutionErrors} errors</span>}
          </p>

          <TableShell label="Rate limiters">
            <Thead>
              <Th align="left" dense grow>Limiter</Th>
              <Th align="right" dense>Requests</Th>
              <Th align="right" dense>Waited</Th>
              <Th align="right" dense hideBelow="sm">Avg wait</Th>
              <Th align="right" dense hideBelow="md">Cap</Th>
              <Th align="right" dense hideBelow="md">Tokens</Th>
            </Thead>
            <tbody>
              {([ex.rateLimitBuckets.market, ex.rateLimitBuckets.price, ex.rateLimitBuckets.order] as RateLimitBucket[]).map((b) => {
                const tone = b.waitRatePct > 90 ? 'var(--synatra-negative)' : b.waitRatePct > 50 ? 'var(--synatra-warning)' : undefined
                return (
                  <Tr key={b.name} accent={tone}>
                    <Td align="left" dense grow>
                      <span className="font-mono font-medium" style={{ color: 'var(--synatra-text-primary)' }}>{b.name}</span>
                      <span className="md:hidden block font-mono text-2xs mt-0.5" style={{ color: 'var(--synatra-text-muted)' }}>{b.ratePerSec.toFixed(2)}/s cap · {b.currentTokens.toFixed(1)}/{b.capacity} tokens</span>
                    </Td>
                    <Td align="right" dense><span className="font-mono tabular-nums">{b.totalRequests.toLocaleString()}</span></Td>
                    <Td align="right" dense><span className="font-mono tabular-nums font-semibold" style={{ color: tone ?? 'var(--synatra-text-secondary)' }}>{b.waitRatePct.toFixed(1)}%</span></Td>
                    <Td align="right" dense hideBelow="sm"><span className="font-mono tabular-nums" style={{ color: 'var(--synatra-text-muted)' }}>{Math.round(b.avgWaitMs)} ms</span></Td>
                    <Td align="right" dense hideBelow="md"><span className="font-mono tabular-nums" style={{ color: 'var(--synatra-text-muted)' }}>{b.ratePerSec.toFixed(2)}/s</span></Td>
                    <Td align="right" dense hideBelow="md"><span className="font-mono tabular-nums" style={{ color: 'var(--synatra-text-muted)' }}>{b.currentTokens.toFixed(1)}/{b.capacity}</span></Td>
                  </Tr>
                )
              })}
            </tbody>
          </TableShell>
          <p className="t-metadata">market_fetch is the market fetcher’s limiter, price_fetch the price feed’s, order_submit the executor’s — all three are reported by the execution subsystem.</p>
        </section>
      )}

      {/* ── D · policy ───────────────────────────────────────────────────── */}
      <section aria-labelledby="ex-policy" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-baseline gap-2 flex-wrap">
            <h2 id="ex-policy" className="t-section-title">How an order would be built</h2>
            <span className="t-description">the engine’s own step list, limits and caveats — read-only, never places orders</span>
          </span>
          <span className="t-metadata">/api/execution/policy{policySlice.data ? ` · ${formatAge(Date.now() - policySlice.data.timestamp)}` : ''}</span>
        </div>
        {policy ? <PolicyLedger policy={policy} /> : policySlice.status === 'error'
          ? <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>The policy endpoint did not answer.</p>
          : <p className="t-description">Waiting for /api/execution/policy.</p>}
      </section>

      {/* ── Manual intervention — outside every data guard: the halt control
             must stay reachable when the status endpoint is the broken thing. */}
      <section aria-label="Manual intervention" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex flex-col gap-1">
          <h2 className="t-section-title">Manual intervention</h2>
          <p className="t-description">
            Operator overrides. The engine trades on its own; everything below acts against it, and each control states what it will do before it does it.
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

// ─── D · policy ledger ────────────────────────────────────────────────────────

function PolicyLedger({ policy }: { policy: ExecutionPolicy }) {
  const r = policy.riskLimits
  const t = policy.orderTemplate
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 list-none m-0 p-0">
        {policy.orderFlow.map((step, i) => (
          <li key={step} className="flex items-center gap-1.5 text-2xs">
            <span className="font-mono" style={{ color: 'var(--synatra-text-secondary)' }}>
              <span style={{ color: 'var(--synatra-text-disabled)' }}>{i + 1} </span>{step.replace(/_/g, ' ')}
            </span>
            {i < policy.orderFlow.length - 1 && <span aria-hidden="true" style={{ color: 'var(--synatra-text-disabled)' }}>→</span>}
          </li>
        ))}
      </ol>

      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-2 m-0">
        <Fact label="Max positions" value={String(r.maxConcurrentPositions)} />
        <Fact label="Max bet" value={`${r.maxBetPercent}% of bankroll`} />
        <Fact label="Kelly fraction" value={r.kellyFraction.toFixed(2)} />
        <Fact label="Min order" value={formatCurrency(r.minimumOrderSizeUsd)} />
        <Fact label="Max latency" value={`${r.maxLatencyMs} ms`} />
      </dl>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 m-0">
        <Fact label="Order template" value={`${t.side} · ${t.orderType} · price buffer ${t.priceBuffer}`} />
        <Fact label="Token selection" value={t.tokenSelection} mono={false} />
        <Fact label="YES price" value={t.yesPrice} />
        <Fact label="NO price" value={t.noPrice} />
      </dl>

      {policy.knownLimitations.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="t-label">The engine’s own caveats</span>
          <ul className="flex flex-col gap-1 list-none m-0 p-0">
            {policy.knownLimitations.map((note) => (
              <li key={note} className="t-helper pl-3 relative"><span className="absolute left-0" aria-hidden="true">·</span>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Fact({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="t-label truncate">{label}</dt>
      <dd className={`m-0 text-xs break-words ${mono ? 'font-mono tabular-nums' : ''}`} style={{ color: 'var(--synatra-text-secondary)' }}>{value}</dd>
    </div>
  )
}
