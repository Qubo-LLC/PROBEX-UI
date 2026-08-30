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
// Data sources are unchanged: /api/execution/status and /api/positions, both
// already polled. No new requests, no new fields.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { Panel, Focal, Row, RowGroup, Meter, PanelPending } from '@/components/ui/Panel'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

const pnlColor = (v: number) =>
  v > 0 ? 'var(--probex-positive)' : v < 0 ? 'var(--probex-negative)' : undefined

export function PortfolioMetrics() {
  const executionSlice = useApplicationStore((s) => s.engine.executionStatus)
  const positionsSlice = useApplicationStore((s) => s.engine.positions)

  const ex = executionSlice.status === 'success' ? executionSlice.data : null
  const pos = positionsSlice.status === 'success' ? positionsSlice.data : null

  return (
    <section aria-label="Capital summary" className="grid grid-cols-1 md:grid-cols-3 gap-3">

      {/* 1 · What the account is worth */}
      <Panel title="Account Value" provenance="live" source="/api/execution/status">
        {!ex ? (
          <PanelPending note="Awaiting the execution engine's balance." />
        ) : (
          <>
            <Focal
              value={formatCurrency(ex.balance)}
              unit={ex.mode === 'paper' ? 'paper account' : 'live account'}
            />
            <RowGroup>
              <Row label="Open positions" value={pos ? String(pos.count) : '—'} />
              <Row label="Closed" value={`${ex.closedPositions}`} />
              <Row
                label="Total trades"
                value={
                  ex.totalTrades === 0
                    ? '0'
                    : <>
                        {ex.totalTrades}
                        <span style={{ color: 'var(--probex-text-disabled)', fontWeight: 400 }}>
                          {' · '}{Math.round(ex.avgExecutionMs)}ms avg
                        </span>
                      </>
                }
              />
            </RowGroup>
          </>
        )}
      </Panel>

      {/* 2 · What trading has actually banked */}
      <Panel title="Realized Performance" provenance="live" source="/api/execution/status">
        {!ex ? (
          <PanelPending note="Awaiting the trading record." />
        ) : (
          <>
            <Focal
              value={formatSignedCurrency(ex.totalPnl)}
              unit="realized"
              color={pnlColor(ex.totalPnl)}
              caption={
                ex.totalTrades === 0 ? (
                  <span className="t-helper">No closed trades yet — nothing has been realized.</span>
                ) : undefined
              }
            />
            {ex.totalTrades > 0 && (
              <Meter
                value={clamp01(ex.winRate)}
                color={ex.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)'}
                ariaLabel="Win rate"
              />
            )}
            <RowGroup>
              <Row
                label="Win rate"
                value={ex.totalTrades > 0 ? formatPercent(ex.winRate) : '—'}
                color={ex.totalTrades > 0 && ex.winRate >= 0.5 ? 'var(--probex-positive)' : undefined}
              />
              <Row label="Wins" value={`${ex.wins}`} color={ex.wins > 0 ? 'var(--probex-positive)' : undefined} />
              <Row label="Losses" value={`${ex.losses}`} color={ex.losses > 0 ? 'var(--probex-negative)' : undefined} />
            </RowGroup>
          </>
        )}
      </Panel>

      {/* 3 · What is still at risk */}
      <Panel title="Open Exposure" provenance="live" source="/api/positions">
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
                value={ex ? formatSignedCurrency(ex.totalPnl + pos.totalUnrealizedPnl) : '—'}
                color={ex ? pnlColor(ex.totalPnl + pos.totalUnrealizedPnl) : undefined}
                title="Realized plus unrealized — derived, not reported by the engine"
              />
              <Row
                label="Account mode"
                value={ex ? ex.mode : '—'}
                color={ex?.mode === 'live' ? 'var(--probex-negative)' : undefined}
              />
            </RowGroup>
          </>
        )}
      </Panel>
    </section>
  )
}
