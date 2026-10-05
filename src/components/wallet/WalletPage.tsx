'use client'

// WalletPage — Portfolio › Capital & Ledger: where the engine's capital is
// right now, and every settlement that moved it.
//
// ─── What this is, and is not ────────────────────────────────────────────────
// There is no wallet on this engine. No deposits, withdrawals, fees or
// transfers exist on any endpoint, and in paper mode no money moves at all.
// What exists is an ACCOUNT LEDGER — /api/portfolio's balance and P&L — a
// starting capital (/api/paper-stats), open positions with their cost basis,
// and a settled-trade ledger in which every row's realized P&L is one
// movement of that balance. This page is built from exactly those, and says
// so. See lib/display/capital.ts.
//
// ─── What was wrong (2026-09-16) ─────────────────────────────────────────────
// "Account Balance $100.00" under a live dot read /api/execution/status —
// the REAL-order executor, which places nothing in paper mode and still holds
// the untouched initial bankroll — while the survival-tracked total in a
// smaller cell beneath it said $2,165.50. Available/Deployed was that $100
// against Σ position value. The "Capital Ledger" was Positions › Settled again
// with eight fixed columns and ghost rows. Profit targets duplicated Survival.
//
// ─── Hierarchy ───────────────────────────────────────────────────────────────
//   A  composition: cash · in positions · started with · net since start,
//      with the mode sentence that says what kind of account this is
//   B  movements: the settled-trade ledger with the balance after each,
//      derived from the initial capital and CHECKED against the reported
//      balance — the check's result is printed either way
//   C  exposure: what the open positions hold, linked to Positions
//   D  the other accounting records the engine publishes, and why they
//      differ (the executor's $100, the snapshot series' value)

import { useMemo } from 'react'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { parsePositionRows } from '@/lib/mappers/positions'
import { capitalMovements, reconcile } from '@/lib/display/capital'
import { marketIdentity } from '@/lib/display/positionDisplay'
import { formatEdgePct } from '@/lib/display/engine'
import { stamp, formatSeconds as formatHold } from '@/lib/display/time'
import { formatCurrency, formatSignedCurrency } from '@/lib/utils'
import { MARKET_DETAIL_PATH, ROUTES } from '@/config/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

const YES = 'var(--synatra-yes)'
const NO  = 'var(--synatra-no)'
const MAX_ROWS = 30


export function WalletPage({ embedded = false }: EmbeddableProps = {}) {
  const portfolioSlice = useApplicationStore((s) => s.engine.portfolio)
  const balanceSlice   = useApplicationStore((s) => s.engine.balance)
  const paperSlice     = useApplicationStore((s) => s.engine.paperStats)
  const positionsSlice = useApplicationStore((s) => s.engine.positions)
  const ledgerSlice    = useApplicationStore((s) => s.engine.tradesLedger)
  const executionSlice = useApplicationStore((s) => s.engine.executionStatus)
  const summarySlice   = useApplicationStore((s) => s.engine.portfolioSummary)
  const survivalSlice  = useApplicationStore((s) => s.engine.survival)

  const pf     = portfolioSlice.data ?? null
  const paper  = paperSlice.data?.paperTrading ?? null
  const ledger = ledgerSlice.data ?? null
  const mode   = pf?.mode ?? executionSlice.data?.mode ?? null

  const open = useMemo(() => {
    if (!positionsSlice.data) return null
    const parsed = parsePositionRows(positionsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [positionsSlice.data])
  const inPositions = open === null ? null : open.reduce((s, p) => s + (p.costBasis ?? 0), 0)

  // The paper session states it; the survival brain states the same figure
  // (initial_capital) and answers on a different cadence, so either suffices.
  const initial = paper?.initialCapital ?? survivalSlice.data?.initialCapital ?? null
  const cash = pf?.balance.current ?? null
  const net  = cash !== null && initial !== null ? cash - initial : null

  const movements = useMemo(
    () => (ledger && initial !== null ? capitalMovements(initial, ledger.ledger) : null),
    [ledger, initial],
  )
  const check = ledger && initial !== null && cash !== null ? reconcile(initial, ledger.ledger, cash, ledger.count) : null

  const pfCert = certaintyFromSlice(portfolioSlice, 5_000)

  return (
    <div className={pageShell(embedded, 'gap-5')}>
      {!embedded && (
        <PageHeader
          title="Capital & Ledger"
          subtitle="Where the engine's capital is right now, and every settlement that moved it"
        />
      )}

      {/* ── A · composition ─────────────────────────────────────────────── */}
      <section aria-labelledby="wl-capital" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 flex-wrap">
            <h2 id="wl-capital" className="t-section-title">Capital now</h2>
            <span className="t-description">
              {mode === 'paper'
                ? 'a paper account — no wallet, deposits or withdrawals; the balance moves only when a trade settles'
                : mode === 'live'
                  ? 'the engine’s account ledger — no deposit or withdrawal record exists on this engine'
                  : 'the engine’s account ledger'}
            </span>
            <Popover label="About the capital figures" trigger={(p) => <InfoButton what="the capital figures" {...p} />}>
              <PopoverTitle>An account ledger, not a wallet</PopoverTitle>
              <PopoverText>
                Cash is the balance the engine’s portfolio ledger reports. “In positions” is the
                cost basis of what is currently open. Started-with is the paper session’s
                initial capital, and the net figure is the difference — a derivation this page
                checks against the settled-trade ledger below.
              </PopoverText>
              <PopoverText>
                Nothing here is a bank or exchange balance. The engine publishes no deposits,
                withdrawals, fees or transfers; in paper mode no money moves at all.
              </PopoverText>
            </Popover>
          </span>
          <span className="t-metadata">/api/portfolio · /api/positions · /api/paper-stats</span>
        </div>

        <div className="flex items-start gap-x-8 gap-y-3 flex-wrap">
          {cash !== null ? (
            <Figure label="Cash" size="lg" title="balance.current from /api/portfolio" footnote={<span className="t-helper">{mode ?? 'engine'} account balance</span>} {...pfCert}>
              {formatCurrency(cash)}
            </Figure>
          ) : (
            <Figure label="Cash" size="lg" certainty="absent" absentReason={portfolioSlice.status === 'error' ? 'the portfolio ledger did not answer' : 'waiting for the portfolio ledger'}>——</Figure>
          )}
          {inPositions !== null && open !== null ? (
            <Figure label="In positions" size="md" title="Σ cost basis of open positions, /api/positions" footnote={<span className="t-helper">{open.length === 0 ? 'nothing open' : `${open.length} open · at cost`}</span>} {...certaintyFromSlice(positionsSlice, 5_000)}>
              {formatCurrency(inPositions)}
            </Figure>
          ) : (
            <Figure label="In positions" size="md" certainty="absent" absentReason={positionsSlice.status === 'error' ? 'positions did not answer' : 'waiting for positions'}>—</Figure>
          )}
          {initial !== null ? (
            <Figure label="Started with" size="md" title="initial_capital from /api/paper-stats" footnote={paper ? <span className="t-helper">session since {stamp(paper.sessionStart)}</span> : undefined} {...certaintyFromSlice(paperSlice, 5_000)}>
              {formatCurrency(initial)}
            </Figure>
          ) : (
            <Figure label="Started with" size="md" certainty="absent" absentReason="waiting for the paper session">—</Figure>
          )}
          {net !== null ? (
            <Figure
              label="Net since start"
              size="md"
              certainty="derived"
              title="cash − initial capital, computed on this screen"
              footnote={
                <span className="t-helper">
                  {pf && Math.abs(net - pf.pnl.realized) <= 0.005
                    ? `equals realized P&L ${formatSignedCurrency(pf.pnl.realized)}`
                    : pf ? `realized P&L reports ${formatSignedCurrency(pf.pnl.realized)}` : ''}
                </span>
              }
            >
              {formatSignedCurrency(net)}
            </Figure>
          ) : (
            <Figure label="Net since start" size="md" certainty="absent" absentReason="needs the balance and the initial capital">—</Figure>
          )}
          {pf && (
            <Figure label="Unrealized" size="md" tone={pf.pnl.unrealized > 0 ? 'var(--synatra-positive)' : pf.pnl.unrealized < 0 ? 'var(--synatra-negative)' : undefined} title="pnl.unrealized from /api/portfolio" footnote={<span className="t-helper">on open positions</span>} {...pfCert}>
              {formatSignedCurrency(pf.pnl.unrealized)}
            </Figure>
          )}
        </div>
      </section>

      {/* ── B · movements ───────────────────────────────────────────────── */}
      <section aria-labelledby="wl-movements" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-baseline gap-2 flex-wrap">
            <h2 id="wl-movements" className="t-section-title">Movements</h2>
            <span className="t-description">every settlement, newest first, with the balance after it</span>
          </span>
          <span className="flex items-baseline gap-3">
            <span className="t-metadata">
              /api/trades/ledger{ledger ? ` · ${ledger.count} settled` : ''}
              {certaintyFromSlice(ledgerSlice, 5_000).certainty === 'stale' && ' · stale'}
            </span>
            <Link href={ROUTES.POSITIONS} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>Positions →</Link>
          </span>
        </div>

        {/* The check, stated either way. A running balance the page derives is
            only worth showing if it can be held against the engine's own
            number — and if it cannot, the reader must be told, not shown a
            column that quietly disagrees with the figure above it. */}
        {check !== null && (
          <p className="t-helper m-0" style={check.kind === 'differs' ? { color: 'var(--synatra-warning)' } : undefined}>
            {check.kind === 'reconciles' && (
              <>Started with {formatCurrency(initial!)}, {ledger!.count} settlement{ledger!.count === 1 ? '' : 's'} totalling {formatSignedCurrency(check.sumPnl)} → {formatCurrency(check.endsAt)} — <span style={{ color: 'var(--synatra-positive)' }}>matches the reported balance</span>. <span className="t-metadata">Balance-after column is derived.</span></>
            )}
            {check.kind === 'differs' && (
              <>Started with {formatCurrency(initial!)} plus {formatSignedCurrency(check.sumPnl)} of settlements is {formatCurrency(check.endsAt)}, but the ledger reports {formatCurrency(check.reported)} — a {formatSignedCurrency(check.gap)} gap this page cannot explain. The balance-after column is derived and carries that gap.</>
            )}
            {check.kind === 'incomplete' && (
              <>Showing {check.shown} of {check.total} settlements — the running balance cannot be checked against the reported balance until the whole ledger is loaded.</>
            )}
          </p>
        )}

        {ledgerSlice.status === 'error' && !ledger ? (
          <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>The settled-trade ledger did not answer — what has moved the balance is unknown.</p>
        ) : movements === null ? (
          <p className="t-description">{ledger === null ? 'Waiting for the settled-trade ledger.' : 'Waiting for the initial capital.'}</p>
        ) : movements.length === 0 ? (
          <p className="t-description">No settlement has moved the balance yet — it still equals the starting capital.</p>
        ) : (
          <TableShell label="Capital movements">
            <Thead>
              <Th align="left" dense grow>Settlement</Th>
              <Th align="right" dense>Realized</Th>
              <Th align="right" dense>Balance after</Th>
              <Th align="right" dense hideBelow="sm">Stake</Th>
              <Th align="right" dense hideBelow="lg">Edge at entry</Th>
              <Th align="right" dense hideBelow="md">Held</Th>
              <Th align="right" dense hideBelow="md">Settled</Th>
            </Thead>
            <tbody>
              {movements.slice(0, MAX_ROWS).map(({ trade: t, balanceAfter }) => {
                const tone = t.won ? 'var(--synatra-positive)' : 'var(--synatra-negative)'
                const isYes = t.direction === 'yes'
                return (
                  <Tr key={`${t.marketId}-${t.closedAt}`} accent={tone}>
                    <Td align="left" dense grow>
                      <span className="flex items-baseline gap-2 min-w-0">
                        <span className="text-2xs font-black uppercase tracking-widest flex-shrink-0" style={{ color: isYes ? YES : NO }}>{t.direction}</span>
                        <Link href={MARKET_DETAIL_PATH(t.marketId)} className="focus-ring rounded-sm font-semibold truncate min-w-0" style={{ color: 'var(--synatra-text-primary)' }} title={t.marketId}>
                          {marketIdentity(t.assetSymbol, t.durationMinutes, t.marketId)}
                        </Link>
                        <span className="text-2xs font-semibold flex-shrink-0" style={{ color: tone }}>{t.won ? 'won' : 'lost'}</span>
                      </span>
                      <span className="md:hidden block font-mono text-2xs mt-0.5 truncate" style={{ color: 'var(--synatra-text-muted)' }}>
                        {stamp(t.closedAt)}<span className="sm:hidden"> · {formatCurrency(t.size)} staked</span>
                      </span>
                    </Td>
                    <Td align="right" dense>
                      <span className="font-mono font-semibold tabular-nums" style={{ color: tone }}>{formatSignedCurrency(t.pnl)}</span>
                    </Td>
                    <Td align="right" dense>
                      <span className="font-mono tabular-nums c-derived" title="Derived — initial capital plus every settlement up to this one">{formatCurrency(balanceAfter)}</span>
                    </Td>
                    <Td align="right" dense hideBelow="sm"><span className="font-mono tabular-nums" style={{ color: 'var(--synatra-text-secondary)' }}>{formatCurrency(t.size)}</span></Td>
                    <Td align="right" dense hideBelow="lg"><span className="font-mono tabular-nums" style={{ color: 'var(--synatra-text-muted)' }}>{formatEdgePct(t.edgePct)}</span></Td>
                    <Td align="right" dense hideBelow="md"><span className="font-mono tabular-nums" style={{ color: 'var(--synatra-text-muted)' }}>{formatHold(t.holdTimeSeconds)}</span></Td>
                    <Td align="right" dense hideBelow="md"><span className="font-mono tabular-nums text-2xs" style={{ color: 'var(--synatra-text-muted)' }}>{stamp(t.closedAt)}</span></Td>
                  </Tr>
                )
              })}
            </tbody>
          </TableShell>
        )}
        {movements !== null && movements.length > MAX_ROWS && (
          <p className="t-metadata">Most recent {MAX_ROWS} of {movements.length} shown; the check above covers all of them.</p>
        )}
      </section>

      {/* ── C · exposure ────────────────────────────────────────────────── */}
      <section aria-labelledby="wl-exposure" className="flex flex-col gap-2 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-baseline gap-2 flex-wrap">
            <h2 id="wl-exposure" className="t-section-title">Exposure</h2>
            <span className="t-description">what of the capital is out in the market</span>
          </span>
          <span className="t-metadata">/api/positions</span>
        </div>
        {open === null ? (
          <p className="t-description">{positionsSlice.status === 'error' ? 'Positions did not answer — exposure is unknown.' : 'Waiting for positions.'}</p>
        ) : open.length === 0 ? (
          <p className="t-description">Nothing deployed — all capital is cash. Exposure appears here the moment the engine opens a position.</p>
        ) : (
          <p className="t-description">
            {open.length} open position{open.length === 1 ? '' : 's'} holding {formatCurrency(inPositions ?? 0)} at cost
            {cash !== null && inPositions !== null && cash + inPositions > 0 && ` — ${Math.round((inPositions / (cash + inPositions)) * 100)}% of cash plus positions, derived`}.
            {' '}<Link href={ROUTES.POSITIONS} className="focus-ring font-semibold" style={{ color: 'var(--synatra-primary)' }}>Each position and its evidence →</Link>
          </p>
        )}
      </section>

      {/* ── D · the other records ───────────────────────────────────────── */}
      <section aria-labelledby="wl-records" className="flex flex-col gap-2 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <h2 id="wl-records" className="t-section-title">Other balance records</h2>
          <span className="t-description">what the engine’s other endpoints report, and why they differ</span>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-2 m-0">
          <Record
            label="/api/balance"
            value={balanceSlice.data ? formatCurrency(balanceSlice.data.balanceUsd) : balanceSlice.status === 'error' ? 'did not answer' : '—'}
            note={balanceSlice.data ? (balanceSlice.data.cacheFresh ? 'cache fresh' : `cached ${balanceSlice.data.cacheAgeSec ?? '?'}s ago`) : 'waiting'}
          />
          <Record
            label="/api/execution/status"
            value={executionSlice.data ? formatCurrency(executionSlice.data.balance) : executionSlice.status === 'error' ? 'did not answer' : '—'}
            note={mode === 'paper' ? 'the real-order executor — idle in paper mode, so it still holds the initial bankroll' : 'the real-order executor’s balance'}
          />
          <Record
            label="/api/portfolio/summary"
            value={summarySlice.data?.summary ? formatCurrency(summarySlice.data.summary.currentValue) : summarySlice.status === 'error' ? 'did not answer' : '—'}
            note={summarySlice.data?.summary ? `snapshot series, last ${stamp(summarySlice.data.summary.lastSnapshot)} — history, not the ledger` : 'waiting'}
          />
        </dl>
      </section>
    </div>
  )
}

function Record({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="t-metadata truncate">{label}</dt>
      <dd className="m-0 flex flex-col min-w-0">
        <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: 'var(--synatra-text-secondary)' }}>{value}</span>
        <span className="t-helper">{note}</span>
      </dd>
    </div>
  )
}
