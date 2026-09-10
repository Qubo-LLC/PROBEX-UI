'use client'

// PortfolioMetrics — the capital summary that opens the Portfolio page.
//
// Portfolio's question is "HOW IS CAPITAL AND PERFORMANCE EVOLVING?", so the
// summary is split along the axis that question implies: what the account is
// worth now, what trading has actually banked, and what is still at risk.
//
// ─── What this replaces ──────────────────────────────────────────────────────
// Six StatCards in a row (Portfolio Value, Unrealized P&L, Realized P&L, Win
// Rate, Open Positions, Total Trades), each 216×128px holding a single figure —
// 1296px of width for six numbers, on a page that then stacked five more
// StatCards below. Same six figures now sit in three panels alongside the
// context that makes them mean something (win/loss split, closed count,
// execution latency, position count), which the StatCard shape had nowhere to
// put except a one-line `deltaLabel`.
//
// ─── Accounting source (Stage 6) ─────────────────────────────────────────────
// Capital and realized P&L now come from /api/portfolio, the PERSISTED ledger.
// They previously came from /api/execution/status, which is scoped to the
// current engine process: measured 2026-09-09 it reported balance 100.00 and
// total_pnl 0.00 while the account actually held 13.13 after 186 closed trades
// realizing −86.87. This panel said "nothing has been realized" over an 85%
// drawdown.
//
// The process-scoped figures are not discarded — they are the honest answer to
// "what has this engine process done since it started", which is a real
// question after a restart. They keep their own panel, named for their scope.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { Panel, Focal, Row, RowGroup, Meter, PanelPending } from '@/components/ui/Panel'
import { StatusChip } from '@/components/ui/StatusChip'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Survival states that the account holder needs told, not buried. The union
 *  is HEALTHY | CAUTION | WOUNDED | DANGER | CRITICAL | DEAD; the last four are
 *  the ones that change what a reader should do. 'RECOVERY' was in an earlier
 *  draft of this check and is not a member of the union at all. */
const DEGRADED_SURVIVAL = new Set(['WOUNDED', 'DANGER', 'CRITICAL', 'DEAD'])

const pnlColor = (v: number) =>
  v > 0 ? 'var(--probex-positive)' : v < 0 ? 'var(--probex-negative)' : undefined

export function PortfolioMetrics() {
  const executionSlice = useApplicationStore((s) => s.engine.executionStatus)
  const positionsSlice = useApplicationStore((s) => s.engine.positions)
  const portfolioSlice = useApplicationStore((s) => s.engine.portfolio)

  const ex = executionSlice.status === 'success' ? executionSlice.data : null
  const pos = positionsSlice.status === 'success' ? positionsSlice.data : null
  const pf = portfolioSlice.status === 'success' ? portfolioSlice.data : null

  // Does the engine process disagree with the ledger? If so the page says so
  // outright rather than letting two panels quietly contradict each other.
  const scopeDivergence =
    pf !== null && ex !== null &&
    (Math.abs(pf.balance.current - ex.balance) > 0.01 || pf.performance.totalTrades !== ex.totalTrades)

  return (
    <section aria-label="Capital summary" className="grid grid-cols-1 md:grid-cols-3 gap-3">

      {/* 1 · What the account is worth — the persisted ledger, not this process */}
      <Panel title="Account Value" provenance="live" source="/api/portfolio" slice={portfolioSlice}>
        {!pf ? (
          <PanelPending note="Awaiting the portfolio ledger." />
        ) : (
          <>
            <Focal
              value={formatCurrency(pf.balance.current)}
              unit={pf.mode === 'paper' ? 'paper account' : 'live account'}
              caption={
                DEGRADED_SURVIVAL.has(pf.survival.state) ? (
                  <span className="t-helper">
                    Survival state {pf.survival.state} — {pf.survival.capitalPct.toFixed(1)}% of starting capital.
                  </span>
                ) : undefined
              }
            />
            <RowGroup>
              <Row label="Open positions" value={`${pf.positions.activeCount}`} />
              <Row label="Total trades" value={`${pf.performance.totalTrades}`} />
              <Row
                label="Capital remaining"
                value={`${pf.survival.capitalPct.toFixed(1)}%`}
                color={
                  pf.survival.capitalPct < 25 ? 'var(--probex-negative)'
                  : pf.survival.capitalPct < 60 ? 'var(--probex-warning)' : undefined
                }
              />
            </RowGroup>
          </>
        )}
      </Panel>

      {/* 2 · What trading has actually banked, across the account's life */}
      <Panel title="Realized Performance" provenance="live" source="/api/portfolio" slice={portfolioSlice}>
        {!pf ? (
          <PanelPending note="Awaiting the trading record." />
        ) : (
          <>
            <Focal
              value={formatSignedCurrency(pf.pnl.realized)}
              unit="realized"
              color={pnlColor(pf.pnl.realized)}
              caption={
                pf.performance.totalTrades === 0 ? (
                  <span className="t-helper">No closed trades yet — nothing has been realized.</span>
                ) : undefined
              }
            />
            {pf.performance.totalTrades > 0 && (
              <Meter
                value={clamp01(pf.performance.winRate)}
                color={pf.performance.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)'}
                ariaLabel="Win rate"
              />
            )}
            <RowGroup>
              <Row
                label="Win rate"
                value={pf.performance.totalTrades > 0 ? formatPercent(pf.performance.winRate) : '—'}
                color={pf.performance.totalTrades > 0 && pf.performance.winRate >= 0.5 ? 'var(--probex-positive)' : undefined}
              />
              <Row label="Wins" value={`${pf.performance.wins}`} color={pf.performance.wins > 0 ? 'var(--probex-positive)' : undefined} />
              <Row label="Losses" value={`${pf.performance.losses}`} color={pf.performance.losses > 0 ? 'var(--probex-negative)' : undefined} />
            </RowGroup>
            {/* A 70% win rate alongside a large realized loss is not a
                contradiction worth hiding — it is the shape of this strategy,
                and stating it prevents the reader mistrusting both numbers. */}
            {pf.performance.winRate >= 0.5 && pf.pnl.realized < 0 && (
              <p className="t-helper">
                Winning more often than losing while still down overall — losses are larger than wins.
              </p>
            )}
          </>
        )}
      </Panel>

      {/* 3 · What is still at risk */}
      <Panel title="Open Exposure" provenance="live" source="/api/positions" slice={positionsSlice}>
        {!pos ? (
          <PanelPending note="Awaiting open-position state." />
        ) : (
          <>
            <Focal
              value={formatSignedCurrency(pos.totalUnrealizedPnl)}
              unit="unrealized"
              color={pnlColor(pos.totalUnrealizedPnl)}
              caption={
                pos.count === 0 ? (
                  <span className="t-helper">Flat — no capital deployed right now.</span>
                ) : undefined
              }
            />
            <RowGroup>
              <Row label="Positions held" value={`${pos.count}`} />
              <Row
                label="Combined P&L"
                value={pf ? formatSignedCurrency(pf.pnl.total) : '—'}
                color={pf ? pnlColor(pf.pnl.total) : undefined}
                title="Realized plus unrealized, as reported by /api/portfolio"
              />
              <Row
                label="Account mode"
                value={pf ? pf.mode : ex ? ex.mode : '—'}
                color={(pf?.mode ?? ex?.mode) === 'live' ? 'var(--probex-negative)' : undefined}
              />
            </RowGroup>
          </>
        )}
      </Panel>

      {/* 4 · The current engine process, explicitly scoped.
          These are the figures the three panels above used to show. They are
          not wrong — they are narrower: every one resets when the engine
          restarts. Shown only once they actually disagree with the ledger,
          so a healthy session doesn't carry a redundant fourth panel. */}
      {scopeDivergence && ex && (
        <Panel
          title="This Engine Process"
          provenance="live"
          source="/api/execution/status"
          slice={executionSlice}
          className="md:col-span-3"
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <StatusChip tone="warning">Session scope</StatusChip>
            <span className="text-xs" style={{ color: 'var(--probex-text-secondary)' }}>
              Since the engine last started: <strong className="tabular-nums">{ex.totalTrades}</strong> trades,{' '}
              <strong className="tabular-nums">{formatSignedCurrency(ex.totalPnl)}</strong> realized,{' '}
              balance <strong className="tabular-nums">{formatCurrency(ex.balance)}</strong>.
            </span>
          </div>
          <p className="t-helper">
            These counters are scoped to the running process and reset on restart, which is why they
            differ from the account figures above. The panels above report the persisted ledger.
          </p>
        </Panel>
      )}
    </section>
  )
}
