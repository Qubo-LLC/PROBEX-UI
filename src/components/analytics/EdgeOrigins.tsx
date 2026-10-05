'use client'

// EdgeOrigins — where the engine's results come from.
//
// ─── Two sources, one question ───────────────────────────────────────────────
// The settled-trade ledger says, per trade, which asset, which window length,
// how big the edge was and whether it won. Grouping it answers "does the edge
// live in BTC or SOL, in 5-minute or 15-minute windows, in big edges or small
// ones". Those groupings are computed here and marked derived.
//
// The survival brain keeps its own record of the same thing at finer grain —
// hour × window type × edge bucket — and, crucially, says which patterns it
// has FILTERED (stopped trading). That is the engine's own conclusion about
// its edge, so it is shown as reported, not recomputed.
//
// ─── Grammar ─────────────────────────────────────────────────────────────────
// Ledgers on DataTable: an elastic key column, fixed numeric gutters, columns
// folding below `sm` / `md` rather than scrolling. No cards — comparable rows
// are scanned, not read.

import { useMemo } from 'react'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { formatSignedCurrency, formatPercent } from '@/lib/utils'
import { groupByAsset, groupByWindow, groupByEdgeBucket, type LedgerGroup } from '@/lib/mappers/analytics'
import { certaintyFromSlice } from '@/components/shared/Figure'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'
import { ROUTES } from '@/config/constants'

export function EdgeOrigins() {
  const ledgerSlice   = useApplicationStore((s) => s.engine.tradesLedger)
  const patternsSlice = useApplicationStore((s) => s.engine.survivalPatterns)

  const trades = useMemo(() => ledgerSlice.data?.ledger ?? [], [ledgerSlice.data])
  const byAsset  = useMemo(() => groupByAsset(trades), [trades])
  const byWindow = useMemo(() => groupByWindow(trades), [trades])
  const byEdge   = useMemo(() => groupByEdgeBucket(trades), [trades])

  const patterns = patternsSlice.data?.patterns ?? []
  const filteredCount = patterns.filter((p) => p.isFiltered).length

  const ledgerCert = certaintyFromSlice(ledgerSlice, 5_000)
  const stale = ledgerCert.certainty === 'stale'

  return (
    <section aria-labelledby="an-origins" className="flex flex-col gap-5 py-6" style={{ borderBottom: '1px solid var(--synatra-border)' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <h2 id="an-origins" className="t-section-title">Where the results come from</h2>
          <Popover
            label="About the groupings"
            trigger={(p) => <InfoButton what="the result groupings" {...p} />}
          >
            <PopoverTitle>Derived from the settled-trade ledger</PopoverTitle>
            <PopoverText>
              Each settled trade records its asset, window length and the edge the engine
              saw at entry. The three tables group that record in the browser; nothing here
              is a figure the engine reported as a grouping.
            </PopoverText>
            <PopoverText>
              Edge buckets follow the survival brain&rsquo;s own vocabulary so the table
              beneath, which the engine does report, reads against the same scale.
            </PopoverText>
          </Popover>
        </span>
        <span className="t-metadata">
          {trades.length} settled trade{trades.length === 1 ? '' : 's'}
          {stale && <span className="ml-1.5" style={{ color: 'var(--synatra-warning)' }}>· stale {ledgerCert.staleFor}</span>}
        </span>
      </div>

      {trades.length === 0 ? (
        <p className="t-description">
          {ledgerSlice.status === 'error'
            ? 'The trade ledger did not answer, so nothing can be grouped.'
            : 'No settled trades yet — the groupings appear as the engine closes positions.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GroupLedger label="By asset" rows={byAsset} stale={stale} />
          <GroupLedger label="By window length" rows={byWindow} stale={stale} />
          <GroupLedger label="By edge size at entry" rows={byEdge} stale={stale} />
        </div>
      )}

      {/* ── The survival brain's own pattern record ─────────────────────── */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <h3 className="t-label">Survival brain patterns</h3>
            <Popover
              label="About survival brain patterns"
              trigger={(p) => <InfoButton what="survival brain patterns" {...p} />}
            >
              <PopoverTitle>The engine&rsquo;s own conclusion</PopoverTitle>
              <PopoverText>
                The survival brain tallies outcomes per hour of day, window type and edge
                bucket, and stops trading a pattern it judges to be losing — those rows are
                marked <strong>filtered</strong>. This table is reported by the engine, not
                computed here.
              </PopoverText>
            </Popover>
          </span>
          <span className="t-metadata">
            {patterns.length} pattern{patterns.length === 1 ? '' : 's'}
            {filteredCount > 0 && ` · ${filteredCount} filtered`}
          </span>
        </div>

        {patterns.length === 0 ? (
          <p className="t-description">
            {patternsSlice.status === 'error'
              ? 'The survival brain did not answer.'
              : 'No patterns recorded yet — they accumulate as trades settle per hour and edge bucket.'}
          </p>
        ) : (
          <TableShell label="Survival brain pattern performance">
            <Thead>
              <Th align="left" dense grow>Pattern</Th>
              <Th align="right" dense>Trades</Th>
              <Th align="right" dense>Win rate</Th>
              <Th align="right" dense hideBelow="sm">Avg P&amp;L</Th>
              <Th align="left" dense hideBelow="md">Status</Th>
            </Thead>
            <tbody>
              {patterns.map((p) => (
                <Tr key={p.key} accent={p.isFiltered ? 'var(--synatra-warning)' : undefined}>
                  <Td align="left" dense grow>
                    <span className="block truncate font-medium" style={{ color: p.isFiltered ? 'var(--synatra-text-secondary)' : 'var(--synatra-text-primary)' }}>
                      {String(p.hour).padStart(2, '0')}:00 · {p.marketType.replace('crypto_', '').replace('_', ' ')} · {p.edgeBucket}
                    </span>
                    {/* What the folded columns carried, below sm/md. */}
                    <span className="md:hidden block font-mono text-2xs mt-0.5" style={{ color: 'var(--synatra-text-muted)' }}>
                      <span className="sm:hidden">{formatSignedCurrency(p.avgPnl)} avg</span>
                      {p.isFiltered && <span className="sm:ml-0 ml-2" style={{ color: 'var(--synatra-warning)' }}>filtered</span>}
                    </span>
                  </Td>
                  <Td align="right" dense><span className="font-mono">{p.totalTrades}</span></Td>
                  <Td align="right" dense>
                    <span className="font-mono font-semibold" style={{ color: p.winRate >= 0.5 ? 'var(--synatra-positive)' : 'var(--synatra-text-secondary)' }}>
                      {formatPercent(p.winRate)}
                    </span>
                  </Td>
                  <Td align="right" dense hideBelow="sm">
                    <span className="font-mono" style={{ color: p.avgPnl > 0 ? 'var(--synatra-positive)' : p.avgPnl < 0 ? 'var(--synatra-negative)' : 'var(--synatra-text-secondary)' }}>
                      {formatSignedCurrency(p.avgPnl)}
                    </span>
                  </Td>
                  <Td align="left" dense hideBelow="md">
                    <span className="text-2xs font-semibold" style={{ color: p.isFiltered ? 'var(--synatra-warning)' : 'var(--synatra-text-disabled)' }}>
                      {p.isFiltered ? 'Filtered — not traded' : 'Trading'}
                    </span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>

      <Link href={ROUTES.POSITIONS} className="focus-ring self-start text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>
        Every settled trade, on Positions →
      </Link>
    </section>
  )
}

/** A three-row ledger: the grouping key, then count, win rate and P&L. */
function GroupLedger({ label, rows, stale }: { label: string; rows: LedgerGroup[]; stale: boolean }) {
  const cell = stale ? 'c-stale' : ''
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <span className="t-label">
        {label}
        <span className="ml-1.5 normal-case tracking-normal font-normal" style={{ color: 'var(--synatra-text-disabled)' }}>· derived</span>
      </span>
      {rows.length === 0 ? (
        <p className="t-helper">Not recorded on these trades.</p>
      ) : (
        <TableShell label={`Results ${label.toLowerCase()}`}>
          <Thead>
            <Th align="left" dense grow>Group</Th>
            <Th align="right" dense>Trades</Th>
            <Th align="right" dense>Win</Th>
            <Th align="right" dense>P&amp;L</Th>
          </Thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.key}>
                <Td align="left" dense grow className={cell}>
                  <span className="font-medium truncate block" style={{ color: 'var(--synatra-text-primary)' }}>{r.key}</span>
                </Td>
                <Td align="right" dense className={cell}><span className="font-mono">{r.trades}</span></Td>
                <Td align="right" dense className={cell}>
                  <span className="font-mono font-semibold" style={{ color: r.winRate >= 0.5 ? 'var(--synatra-positive)' : 'var(--synatra-text-secondary)' }}>
                    {formatPercent(r.winRate)}
                  </span>
                </Td>
                <Td align="right" dense className={cell}>
                  <span className="font-mono" style={{ color: r.totalPnl > 0 ? 'var(--synatra-positive)' : r.totalPnl < 0 ? 'var(--synatra-negative)' : 'var(--synatra-text-secondary)' }}>
                    {formatSignedCurrency(r.totalPnl, true)}
                  </span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  )
}
