'use client'

// TradeLedgerTable — individual completed sleeve trades: searchable,
// filterable, sortable, with a row-detail expansion. Financial Performance &
// Trade Transparency redesign.
//
// ─── Why this exists ─────────────────────────────────────────────────────────
// The per-trade ledger contract (src/types/ledger.ts, getLedgerPage()) has
// real, confirmed fields — market, direction, entry/exit price and time,
// size, realized P&L, outcome — and sat with zero UI consumers until now. The
// Overview's headline trade count/win-rate are pre-aggregated engine
// counters; this table is the actual records behind them.
//
// ─── Simulated, not live ─────────────────────────────────────────────────────
// /sleeves/trades/ledger is the engine's sleeve (paper, research-sizing) book.
// There is currently no wired path to individual LIVE trade records anywhere
// in the app — only live aggregate counters (ExecutionStatus), no per-trade
// detail. Labelled Simulated throughout; never presented as real order flow.
//
// ─── Scope honesty ────────────────────────────────────────────────────────────
// The deployed engine has no cursor — it returns at most `limit` most-recent
// settled records and cannot page further back. There is no pretending
// otherwise with fake "Next page" controls; describeSummaryScope() states
// the real boundary.

import { useMemo, useState, type ReactNode } from 'react'
import { useEngineLedgerPage } from '@/config/hooks/useServices'
import { buildCumulativeRealizedSeries, winRateBreakdown, describeSummaryScope } from '@/lib/mappers/ledger'
import { searchLoaded, statusLabel, relationshipFor, describePaging } from '@/lib/display/ledgerView'
import { ENGINE_HISTORY_MAX } from '@/lib/display/historyScope'
import type { LedgerItem } from '@/types/ledger'
import { TableShell, Thead, Th, Tr, Td, ExpansionRow } from '@/components/shared/DataTable'
import { SimulatedNote } from '@/components/shared/SimulatedNote'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { RealizedPnlChart } from './RealizedPnlChart'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { stamp, formatSeconds } from '@/lib/display/time'

// The engine's own hard cap (422 above this) — not a UI choice, see
// lib/display/historyScope.ts. A dedicated ledger page can afford the full
// request; the globally-polled store hook (useEngineTradesLedger) stays at
// its smaller UI-sized limit.
const LIMIT = ENGINE_HISTORY_MAX
const COLS = 7

type DirectionFilter = 'all' | 'yes' | 'no'
type ResultFilter = 'all' | 'won' | 'lost'
type SortKey = 'closedAt' | 'pnl'

export function TradeLedgerTable() {
  const slice = useEngineLedgerPage(LIMIT, 60_000)
  const [search, setSearch] = useState('')
  const [direction, setDirection] = useState<DirectionFilter>('all')
  const [result, setResult] = useState<ResultFilter>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('closedAt')
  const [sortDesc, setSortDesc] = useState(true)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const page = slice.status === 'success' ? slice.data : null
  // Every item returned by the deployed engine is already settled, but the
  // contract allows 'open' (engine branch) — a completed-trade table must
  // never count an open position as a closed trade.
  const settled = useMemo(() => (page?.items ?? []).filter((i) => i.status === 'settled'), [page])

  const fromMs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
  const toMs   = toDate   ? new Date(`${toDate}T23:59:59.999`).getTime() : null

  const filtered = useMemo(() => {
    // searchLoaded (lib/display/ledgerView.ts) also labels this correctly as
    // search over LOADED records only, not the full session.
    let rows = searchLoaded(settled, search)
    if (direction !== 'all') rows = rows.filter((i) => i.direction === direction)
    if (result !== 'all') rows = rows.filter((i) => (result === 'won' ? i.won === true : i.won === false))
    if (fromMs !== null) rows = rows.filter((i) => i.closedAt !== null && i.closedAt >= fromMs)
    if (toMs !== null) rows = rows.filter((i) => i.closedAt !== null && i.closedAt <= toMs)
    return [...rows].sort((a, b) => {
      const av = sortKey === 'pnl' ? (a.pnl ?? 0) : (a.closedAt ?? 0)
      const bv = sortKey === 'pnl' ? (b.pnl ?? 0) : (b.closedAt ?? 0)
      return sortDesc ? bv - av : av - bv
    })
  }, [settled, search, direction, result, fromMs, toMs, sortKey, sortDesc])

  const stats = useMemo(() => winRateBreakdown(settled), [settled])
  const series = useMemo(() => buildCumulativeRealizedSeries(settled), [settled])
  const hasActiveFilter = Boolean(search || direction !== 'all' || result !== 'all' || fromDate || toDate)

  if (slice.status === 'loading') {
    return <p className="t-description">Loading trade ledger…</p>
  }
  if (slice.status === 'error') {
    return <ErrorState title="Trade ledger unavailable" description={slice.error?.message ?? 'The engine did not answer /api/sleeves/trades/ledger.'} fullPage={false} />
  }
  if (page && !page.available) {
    return <EmptyState size="sm" title="Not yet computed" description="The endpoint is live, but the engine has not produced a ledger yet." />
  }

  return (
    <div className="flex flex-col gap-4">
      <SimulatedNote />

      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="t-metadata">
            {stats.wins} won · {stats.losses} lost{stats.pushes > 0 ? ` · ${stats.pushes} push` : ''}
            {stats.winRate !== null && ` · ${formatPercent(stats.winRate)} win rate`}
          </span>
          <span className="t-helper">{describeSummaryScope(page?.summaryScope ?? null)}</span>
        </div>
        {page && (
          <span className="t-helper">{describePaging(page.paging, settled.length, null)}</span>
        )}
        {/* The win rate/count above are computed from the records actually
            loaded on this page. Overview's headline trade count is the
            engine's own running counter (Runway.sleeves[].counts), which can
            cover more history than this page can retrieve — the two numbers
            are allowed to differ, and forcing them to match would misstate
            one of them. Stated once, here, rather than reconciled silently. */}
        <span className="t-helper">
          The Overview page's trade count is the engine's own running counter and may include trades
          older than what this page can retrieve.
        </span>
      </div>

      {series.length >= 2 && <RealizedPnlChart series={series} />}

      <TradeFilters
        search={search} onSearchChange={setSearch}
        direction={direction} onDirectionChange={setDirection}
        result={result} onResultChange={setResult}
        fromDate={fromDate} onFromDateChange={setFromDate}
        toDate={toDate} onToDateChange={setToDate}
        hasActiveFilter={hasActiveFilter}
        onClear={() => { setSearch(''); setDirection('all'); setResult('all'); setFromDate(''); setToDate('') }}
      />

      {filtered.length === 0 ? (
        <EmptyState
          size="sm"
          title={hasActiveFilter ? 'No trades match these filters' : 'No settled trades'}
          description={hasActiveFilter ? 'Clear a filter to see more of the ledger.' : 'The sleeve ledgers have no settled trades yet.'}
        />
      ) : (
        <TableShell label="Completed trades">
          <Thead>
            <Th align="left" dense grow>Market</Th>
            <Th align="left" dense hideBelow="sm">Direction</Th>
            <Th align="right" dense hideBelow="md">Entry → exit</Th>
            <Th align="right" dense hideBelow="sm">Size</Th>
            <Th align="right" dense>
              <SortButton active={sortKey === 'pnl'} desc={sortDesc} onClick={() => { setSortKey('pnl'); setSortDesc(sortKey === 'pnl' ? !sortDesc : true) }}>P&amp;L</SortButton>
            </Th>
            <Th align="right" dense hideBelow="lg">
              <SortButton active={sortKey === 'closedAt'} desc={sortDesc} onClick={() => { setSortKey('closedAt'); setSortDesc(sortKey === 'closedAt' ? !sortDesc : true) }}>Closed</SortButton>
            </Th>
            <Th align="center" dense><span className="sr-only">Details</span></Th>
          </Thead>
          <tbody>
            {filtered.map((t) => {
              const key = t.tradeId ?? `${t.marketId}|${t.openedAt}`
              const isOpen = open[key] ?? false
              const panelId = `trade-${key.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`
              const isYes = t.direction === 'yes'
              const sideColor = isYes ? 'var(--synatra-yes)' : 'var(--synatra-no)'
              const pnlTone = t.pnl === null ? 'var(--synatra-text-muted)' : t.pnl > 0 ? 'var(--synatra-positive)' : t.pnl < 0 ? 'var(--synatra-negative)' : 'var(--synatra-text-primary)'
              const title = t.marketQuestion ?? t.marketId

              return (
                <TradeRowGroup key={key}>
                  <Tr accent={sideColor} id={`${panelId}-row`}>
                    <Td align="left" dense grow>
                      <span className="font-semibold block truncate min-w-0" title={title}>{title}</span>
                    </Td>
                    <Td align="left" dense hideBelow="sm">
                      <span className="text-2xs font-black uppercase tracking-widest" style={{ color: sideColor }}>{t.direction}</span>
                    </Td>
                    <Td align="right" dense hideBelow="md">
                      <span className="font-mono text-xs" style={{ color: 'var(--synatra-text-secondary)' }}>
                        {t.entryPriceCents !== null && t.exitPriceCents !== null
                          ? `${t.entryPriceCents.toFixed(0)}¢ → ${t.exitPriceCents.toFixed(0)}¢`
                          : '— not reported'}
                      </span>
                    </Td>
                    <Td align="right" dense hideBelow="sm">
                      <span className="font-mono text-xs">{t.sizeUsd !== null ? formatCurrency(t.sizeUsd) : '—'}</span>
                    </Td>
                    <Td align="right" dense>
                      <span className="font-mono font-semibold text-sm" style={{ color: pnlTone }}>
                        {t.pnl !== null ? formatSignedCurrency(t.pnl) : '—'}
                      </span>
                      <span className="block text-2xs" style={{ color: 'var(--synatra-text-muted)' }}>{statusLabel(t)}</span>
                    </Td>
                    <Td align="right" dense hideBelow="lg">
                      <span className="font-mono text-xs" style={{ color: 'var(--synatra-text-secondary)' }}>
                        {t.closedAt !== null ? stamp(t.closedAt) : '— not reported'}
                      </span>
                    </Td>
                    <Td align="center" dense>
                      <button
                        type="button"
                        onClick={() => setOpen((s) => ({ ...s, [key]: !isOpen }))}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        aria-label={`${isOpen ? 'Hide' : 'Show'} full record for ${title}`}
                        className="focus-ring inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer"
                        style={{ color: 'var(--synatra-text-muted)' }}
                      >
                        <span aria-hidden="true" style={{ display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▸</span>
                      </button>
                    </Td>
                  </Tr>
                  <ExpansionRow id={panelId} colSpan={COLS} hidden={!isOpen} dense>
                    <TradeEvidence trade={t} engineMode={page?.mode ?? null} />
                  </ExpansionRow>
                </TradeRowGroup>
              )
            })}
          </tbody>
        </TableShell>
      )}

      <p className="t-helper">Times shown in your local timezone; the engine's own clock is UTC.</p>
    </div>
  )
}

function TradeRowGroup({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function TradeEvidence({ trade: t, engineMode }: { trade: LedgerItem; engineMode: string | null }) {
  const steps = relationshipFor(t, engineMode)
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-2 m-0">
        <Fact label="Opened" value={stamp(t.openedAt)} />
        <Fact label="Hold time" value={t.holdTimeSeconds !== null ? formatSeconds(t.holdTimeSeconds) : '— not reported'} />
        <Fact label="Shares" value={t.shares !== null ? t.shares.toLocaleString() : '— not reported'} />
        <Fact label="Edge at entry" value={t.edgePct !== null ? `${t.edgePct.toFixed(1)}%` : '— not reported'} />
        <Fact label="Asset" value={t.assetSymbol ?? '— not reported'} />
        {/* The wire carries no aggregate or per-trade fee field anywhere in
            this contract — withheld, never shown as $0.00, which would claim
            a fee-free trade rather than an unreported one. */}
        <Fact label="Fees" value="Not reported by the engine" />
      </dl>

      {/* Trade → Order → Fill → Position → Settlement → P&L — the explicit
          distinction between a completed TRADE and the orders/fills that
          would back it in live execution. A paper trade places no order and
          has no fill record; that is stated as "not modelled", never
          invented. See lib/display/ledgerView.ts. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        {steps.map((s) => (
          <span key={s.step} className="flex items-baseline gap-1 text-2xs" title={s.text}>
            <span className="t-label">{s.step}</span>
            <span style={{ color: s.status === 'recorded' ? 'var(--synatra-text-secondary)' : 'var(--synatra-text-disabled)' }}>
              {s.status === 'recorded' ? '✓' : s.status === 'pending' ? '…' : '—'}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="t-label truncate">{label}</dt>
      <dd className="m-0 font-mono text-xs font-semibold tabular-nums truncate" style={{ color: 'var(--synatra-text-primary)' }}>{value}</dd>
    </div>
  )
}

function SortButton({ active, desc, onClick, children }: { active: boolean; desc: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 cursor-pointer" style={{ color: active ? 'var(--synatra-primary)' : 'inherit' }}>
      {children}
      {active && <span aria-hidden="true">{desc ? '↓' : '↑'}</span>}
    </button>
  )
}

function TradeFilters({
  search, onSearchChange, direction, onDirectionChange, result, onResultChange,
  fromDate, onFromDateChange, toDate, onToDateChange, hasActiveFilter, onClear,
}: {
  search: string; onSearchChange: (v: string) => void
  direction: DirectionFilter; onDirectionChange: (v: DirectionFilter) => void
  result: ResultFilter; onResultChange: (v: ResultFilter) => void
  fromDate: string; onFromDateChange: (v: string) => void
  toDate: string; onToDateChange: (v: string) => void
  hasActiveFilter: boolean; onClear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search market or asset…"
        className="input-base h-8 px-3 text-sm flex-1 min-w-[180px] max-w-xs"
        aria-label="Search trades"
      />
      <select value={direction} onChange={(e) => onDirectionChange(e.target.value as DirectionFilter)} className="input-base h-8 px-2 text-sm" aria-label="Filter by direction">
        <option value="all">All sides</option>
        <option value="yes">YES</option>
        <option value="no">NO</option>
      </select>
      <select value={result} onChange={(e) => onResultChange(e.target.value as ResultFilter)} className="input-base h-8 px-2 text-sm" aria-label="Filter by result">
        <option value="all">All results</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>
      <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--synatra-text-muted)' }}>
        From
        <input type="date" value={fromDate} onChange={(e) => onFromDateChange(e.target.value)} className="input-base h-8 px-2 text-xs" aria-label="From date" />
      </label>
      <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--synatra-text-muted)' }}>
        To
        <input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)} className="input-base h-8 px-2 text-xs" aria-label="To date" />
      </label>
      {hasActiveFilter && (
        <button onClick={onClear} className="text-xs px-2.5 py-1.5 rounded-md cursor-pointer" style={{ background: 'var(--synatra-negative-dim)', color: 'var(--synatra-negative)', border: '1px solid var(--synatra-negative-border)' }}>
          Clear
        </button>
      )}
    </div>
  )
}
