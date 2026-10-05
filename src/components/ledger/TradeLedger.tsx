'use client'

// TradeLedger — every trade record the engine holds, and what happened to it.
// (remediation spec Part 1 §6, §12; product requirement "ALL AVAILABLE TRADES")
//
// ─── Ledger is not Positions ─────────────────────────────────────────────────
// Positions answers "what does the engine hold, and how did holdings resolve".
// The Ledger answers "what did the engine trade, and what happened". In paper
// mode the engine keeps ONE record type for both, so the rows overlap; what
// differs is the question, the columns, and that this view walks the whole
// record rather than the latest page.
//
// ─── Two backend contracts ───────────────────────────────────────────────────
// The deployed engine returns at most 500 settled records with no cursor and a
// page-scoped summary. The engine remediation branch pages by `seq`, reports a
// reliable total and a population-scoped summary. This view detects which one
// it is talking to (LedgerPage.supportsCursor) and says so — it never pages
// client-side over a capped response or calls a page a total.
//
// ─── Placement ───────────────────────────────────────────────────────────────
// Mounted at /ledger for now. Final IA placement is an owner decision (spec
// §14, P-15); this component does not depend on where it is mounted.

import { useMemo, useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { useLedgerPages } from '@/config/hooks/useLedgerPages'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState } from '@/components/ui/ErrorState'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { clockOrDate } from '@/lib/display/time'
import { marketIdentity } from '@/lib/display/positionDisplay'
import { readFinancialTrust, suppressesTone } from '@/lib/display/financialTrust'
import { describeSummaryScope } from '@/lib/mappers/ledger'
import { canLoadMoreCapped, describePaging, openedAfterClose, searchLoaded, statusLabel } from '@/lib/display/ledgerView'
import { ENGINE_HISTORY_MAX } from '@/lib/display/historyScope'
import { TradeDetail } from './TradeDetail'
import type { LedgerItem } from '@/types/ledger'

const PAGE_SIZE = 100
type StatusFilter = 'all' | 'open' | 'settled'
type DirectionFilter = 'all' | 'YES' | 'NO'

function Segmented<T extends string>({ label, value, options, onChange, disabled }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1">
      <span className="t-metadata mr-1">{label}</span>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} disabled={disabled}
          onClick={() => onChange(o.value)} className="focus-ring text-2xs font-semibold px-2 py-0.5 rounded"
          style={{
            color: value === o.value ? 'var(--synatra-text-primary)' : 'var(--synatra-text-muted)',
            background: value === o.value ? 'var(--synatra-surface-raised, var(--synatra-surface))' : 'transparent',
            border: '1px solid var(--synatra-border)', opacity: disabled ? 0.5 : 1,
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function TradeLedger() {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [direction, setDirection] = useState<DirectionFilter>('all')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<LedgerItem | null>(null)

  const paperStats = useApplicationStore((s) => s.engine.paperStats)
  const engineMode = useApplicationStore((s) => s.engine.identity.data?.mode ?? null)
  const ledger = useLedgerPages('ledger', limit, {
    status,
    ...(direction !== 'all' ? { direction } : {}),
  })

  const page = ledger.page
  const supportsCursor = page?.supportsCursor ?? false
  const sessionTotal = paperStats.data?.paperTrading.totalTrades ?? null
  const rows = useMemo(() => searchLoaded(ledger.items, search), [ledger.items, search])

  const trust = readFinancialTrust({
    trades: ledger.items.map((i) => ({ marketId: i.marketId, openedAt: i.openedAt, closedAt: i.closedAt ?? Number.NaN })),
    sourceStatus: ledger.status === 'error' ? 'error' : ledger.status === 'loading' ? 'loading' : 'success',
    engineIntegrity: paperStats.data?.integrity ?? null,
  })
  const neutral = suppressesTone(trust) || ledger.status !== 'ready'
  const summary = page?.summary ?? null

  return (
    <div className="page-container flex flex-col gap-5 pb-8 animate-fade-in-up">
      <PageHeader title="Trade ledger" subtitle="Every trade record the engine holds — what it decided, and what happened to it" />

      {trust && (
        <p role="status" className="t-description" style={{ color: 'var(--synatra-warning)' }}>
          <span className="font-semibold">{trust.headline}.</span> {trust.detail}
        </p>
      )}

      {/* ── Summary, with its scope stated ─────────────────────────────── */}
      <section aria-labelledby="ledger-summary" className="flex flex-col gap-2">
        <h2 id="ledger-summary" className="t-section-title">Summary</h2>
        <p className="t-metadata">{describeSummaryScope(page?.summaryScope ?? null)}</p>
        {summary && (
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 m-0">
            {[
              ['Trades', summary.totalTrades !== null ? summary.totalTrades.toLocaleString() : `${(summary.wins + summary.losses).toLocaleString()} settled`],
              ['Won · lost', `${summary.wins.toLocaleString()} · ${summary.losses.toLocaleString()}`],
              ['Win rate', summary.winRate !== null ? formatPercent(summary.winRate) : '—'],
              ['Realised P&L', formatSignedCurrency(summary.realizedPnl)],
              ['Volume', summary.volumeUsd !== null ? formatCurrency(summary.volumeUsd) : 'not reported'],
              ['Open exposure', summary.openExposureUsd !== null ? formatCurrency(summary.openExposureUsd) : 'not reported'],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="t-label">{k}</dt>
                <dd className="font-mono text-sm m-0 break-all" style={{ color: 'var(--synatra-text-primary)' }}>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {sessionTotal !== null && (
          <p className="t-metadata">Session (from paper-stats): {sessionTotal.toLocaleString()} settled trades.</p>
        )}
      </section>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <section aria-label="Filters" className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Segmented label="Status" value={status} onChange={(v) => setStatus(v)} disabled={!supportsCursor}
          options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'settled', label: 'Settled' }]} />
        <Segmented label="Side" value={direction} onChange={(v) => setDirection(v)}
          options={[{ value: 'all', label: 'Both' }, { value: 'YES', label: 'YES' }, { value: 'NO', label: 'NO' }]} />
        <label className="flex items-center gap-2">
          <span className="t-metadata">Search loaded records</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="market, asset, trade id"
            className="focus-ring text-xs px-2 py-1 rounded font-mono"
            style={{ background: 'var(--synatra-surface)', border: '1px solid var(--synatra-border)', color: 'var(--synatra-text-primary)' }} />
        </label>
        {!supportsCursor && page && (
          <span className="t-metadata">This engine returns settled trades only; open trades are on Positions.</span>
        )}
      </section>

      {/* ── Records ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="ledger-records" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 id="ledger-records" className="t-section-title">Records</h2>
          {page && <span className="t-metadata">{describePaging(page.paging, ledger.items.length, sessionTotal)}{search ? ` · ${rows.length} match the search` : ''}</span>}
        </div>
        {page?.durable === false && (
          <p className="t-description" style={{ color: 'var(--synatra-warning)' }}>
            Live-mode records are held in memory only (the newest 100) and are lost when the engine restarts.
          </p>
        )}

        {ledger.status === 'error' ? (
          <ErrorState title="Trade ledger unavailable" description={ledger.error ?? 'The engine did not answer.'} fullPage={false} />
        ) : ledger.status === 'loading' ? (
          <p className="t-description">Loading trade records…</p>
        ) : rows.length === 0 ? (
          <p className="t-description">{search ? 'No loaded record matches the search.' : 'The engine reports no trade records for these filters.'}</p>
        ) : (
          <TableShell label="Trade ledger">
            <Thead>
              <Th align="left" dense>Opened</Th>
              <Th align="left" dense grow>Trade</Th>
              <Th align="right" dense hideBelow="sm">Stake</Th>
              <Th align="right" dense hideBelow="md">Entry → exit</Th>
              <Th align="right" dense>Result</Th>
              <Th align="left" dense hideBelow="md">Status</Th>
              <Th align="left" dense hideBelow="lg">Resolution</Th>
            </Thead>
            <tbody>
              {rows.map((i) => {
                const tone = neutral || i.pnl === null ? undefined : i.pnl > 0 ? 'var(--synatra-positive)' : i.pnl < 0 ? 'var(--synatra-negative)' : undefined
                const invalid = openedAfterClose(i) === true
                return (
                  <Tr key={i.seq !== null ? `s${i.seq}` : `${i.marketId}-${i.openedAt}`} onClick={() => setSelected(i)}
                    accent={invalid ? 'var(--synatra-warning)' : undefined}>
                    <Td align="left" dense><span className="font-mono text-2xs">{clockOrDate(i.openedAt)}</span></Td>
                    <Td align="left" dense grow>
                      <span className="flex items-baseline gap-2 min-w-0">
                        <span className="text-2xs font-black uppercase" style={{ color: i.direction === 'yes' ? 'var(--synatra-yes)' : 'var(--synatra-no)' }}>{i.direction}</span>
                        <span className="font-semibold truncate" title={i.marketId}>{marketIdentity(i.assetSymbol, i.durationMinutes, i.marketId)}</span>
                        {i.tradeId && <span className="font-mono text-2xs truncate" style={{ color: 'var(--synatra-text-muted)' }}>{i.tradeId}</span>}
                      </span>
                    </Td>
                    <Td align="right" dense hideBelow="sm"><span className="font-mono">{i.sizeUsd !== null ? formatCurrency(i.sizeUsd) : '—'}</span></Td>
                    <Td align="right" dense hideBelow="md">
                      <span className="font-mono" style={{ color: 'var(--synatra-text-secondary)' }}>
                        {i.entryPriceCents !== null ? `${i.entryPriceCents.toFixed(1)}¢` : '—'} → {i.status === 'open' ? 'open' : i.exitPriceCents !== null ? `${i.exitPriceCents.toFixed(1)}¢` : 'not reported'}
                      </span>
                    </Td>
                    <Td align="right" dense><span className="font-mono font-semibold" style={{ color: tone }}>{i.pnl !== null ? formatSignedCurrency(i.pnl) : '—'}</span></Td>
                    <Td align="left" dense hideBelow="md"><span className="text-2xs">{statusLabel(i)}</span></Td>
                    <Td align="left" dense hideBelow="lg">
                      <span className="text-2xs" style={{ color: i.resolutionSource === 'simulated' ? 'var(--synatra-warning)' : 'var(--synatra-text-muted)' }}>
                        {i.status === 'open' ? '—' : i.resolutionSource === 'venue_final' ? 'venue' : i.resolutionSource === 'simulated' ? 'simulated' : 'not recorded'}
                      </span>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </TableShell>
        )}

        <div className="flex flex-wrap items-center gap-4">
          {page?.paging.kind === 'cursor' && page.paging.hasMore && (
            <button type="button" onClick={() => void ledger.loadOlder()} disabled={ledger.loadingMore}
              className="focus-ring text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>
              {ledger.loadingMore ? 'Loading…' : `Load ${PAGE_SIZE} older records`}
            </button>
          )}
          {page && canLoadMoreCapped(page.paging, sessionTotal) && (
            <button type="button" onClick={() => setLimit(ENGINE_HISTORY_MAX)}
              className="focus-ring text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>
              Load all retrievable (up to {ENGINE_HISTORY_MAX})
            </button>
          )}
          <button type="button" onClick={() => void ledger.refresh()} className="focus-ring text-2xs font-semibold"
            style={{ color: 'var(--synatra-text-secondary)' }}>
            Refresh from newest
          </button>
        </div>
      </section>

      <TradeDetail item={selected} onClose={() => setSelected(null)} engineMode={engineMode} />
    </div>
  )
}
