'use client'

// PositionsConsole — what the engine currently owns, and the record of what
// it has owned. The Investigation lens, continued from Analytics.
//
// ─── The composition ─────────────────────────────────────────────────────────
//   A  THE BOOK     unrealized on open positions · positions held · realized
//                   over the account's life · win rate   — bare figures, ruled
//   B  OPEN         the positions themselves, as a ledger; each row expands
//                   to its evidence (entry, edge, underlying, lifecycle,
//                   live alignment, manual close)
//   C  SETTLED      the closed-trade record on the same grammar, linked on
//                   to Analytics where those results are grouped
//
// ─── What this replaced ──────────────────────────────────────────────────────
// Three bordered Panels with LIVE badges — one of which ("Resolution Record")
// reads the live-execution tracker, a subsystem that is legitimately at zero
// in paper mode, so it rendered "Tracking / No position has resolved yet this
// session" beside a Realized panel showing ten settled trades. The reader was
// handed a contradiction as the page's opening statement. That tracker is now
// a single technical line, shown only when it has something to report, and
// explained in the ⓘ.
//
// Sources: /api/positions (envelope + items), /api/portfolio (persisted
// ledger totals), /api/edges (live edge per market), /api/markets (close
// times), /api/execution/status (process-scoped tracker, context only).

import { useMemo, useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'
import { parseMarketRows } from '@/lib/mappers/markets'
import { parsePositionRows, type PositionRow } from '@/lib/mappers/positions'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { formatSignedCurrency, formatPercent, formatCurrency } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'
import { ErrorState } from '@/components/ui/ErrorState'
import { PositionFilters, type Side, type PnlState } from './PositionFilters'
import { PositionTable } from './PositionTable'
import { SettledPositions } from './SettledPositions'
import { readFinancialTrust, suppressesTone } from '@/lib/display/financialTrust'

export function PositionsConsole() {
  const positions      = useApplicationStore((s) => s.engine.positions)
  const execution      = useApplicationStore((s) => s.engine.executionStatus)
  const edgesSlice     = useApplicationStore((s) => s.engine.edges)
  const portfolioSlice = useApplicationStore((s) => s.engine.portfolio)
  const marketsSlice   = useApplicationStore((s) => s.engine.markets)
  const historySlice   = useApplicationStore((s) => s.engine.positionsHistory)
  const paperStats     = useApplicationStore((s) => s.engine.paperStats)

  const [search, setSearch]   = useState('')
  const [side, setSide]       = useState<Side | null>(null)
  const [segment, setSegment] = useState<string | null>(null)
  const [pnlState, setPnl]    = useState<PnlState | null>(null)

  const pos = positions.data
  const ex  = execution.data
  const pf  = portfolioSlice.data

  // marketId → closes_at. The engine's market cache holds only what it is
  // tracking now, so this join legitimately misses older markets and the row
  // says "unknown" rather than deriving a close from duration_minutes.
  const closesAtByMarketId = useMemo(() => {
    const m = new Map<string, number | null>()
    if (!marketsSlice.data) return m
    const parsed = parseMarketRows(marketsSlice.data)
    if (parsed.kind !== 'rows') return m
    for (const mk of parsed.rows) m.set(mk.id, mk.closesAt)
    return m
  }, [marketsSlice.data])

  const rows = useMemo(() => (pos ? parsePositionRows(pos) : null), [pos])
  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  const filteredRows: PositionRow[] = useMemo(() => {
    if (rows?.kind !== 'rows') return []
    let result = rows.rows
    if (side) result = result.filter((p) => p.side === side)
    if (segment) result = result.filter((p) => p.segment === segment)
    if (pnlState) result = result.filter((p) => pnlState === 'profit' ? (p.unrealizedPnl ?? 0) >= 0 : (p.unrealizedPnl ?? 0) < 0)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((p) => (p.marketTitle ?? '').toLowerCase().includes(q))
    }
    return result
  }, [rows, side, segment, pnlState, search])

  const segmentOptions = useMemo(() => {
    if (rows?.kind !== 'rows') return []
    const seen = new Set<string>()
    for (const p of rows.rows) if (p.segment !== null) seen.add(p.segment)
    return [...seen].sort()
  }, [rows])

  const openCount = rows?.kind === 'rows' ? rows.rows.length : pos?.count ?? 0
  const deployed = rows?.kind === 'rows' ? rows.rows.reduce((s, p) => s + (p.costBasis ?? 0), 0) : null
  const filtersActive = side !== null || segment !== null || pnlState !== null || search.trim() !== ''
  const posCert = certaintyFromSlice(positions, 5_000)
  // Same trust reading as Settled positions below, so the page tells one story:
  // the persisted Realized figure is built on the records that section flags.
  const trust = readFinancialTrust({ trades: historySlice.data?.history ?? null, sourceStatus: historySlice.status, engineIntegrity: paperStats.data?.integrity ?? null })
  const realizedNeutral = suppressesTone(trust) || historySlice.data === null

  // The live-execution tracker: real, process-scoped, and at zero in paper
  // mode. Mentioned only when it has something to say.
  const tracker = ex && ex.resolutionStats.totalResolved > 0 ? ex.resolutionStats : null

  return (
    <ProvenanceScope detail="tooltip">
    <div className="page-container flex flex-col pb-8 animate-fade-in-up">
      <PageHeader
        title="Positions"
        subtitle="What the engine currently owns, why, and how its closed positions have gone"
      />

      {/* The settled record sits below the book and the open table, and was
          reported as missing ("I cannot see past positions") while it was on
          the page. Two in-page links make both halves reachable from the top;
          no data is added or restructured. */}
      <nav aria-label="Positions sections" className="flex items-baseline gap-4 mt-2 text-2xs font-semibold">
        <a href="#pos-open" className="focus-ring" style={{ color: 'var(--synatra-primary)' }}>
          Open positions{pos ? ` (${openCount})` : ''}
        </a>
        <a href="#pos-settled" className="focus-ring" style={{ color: 'var(--synatra-primary)' }}>
          Settled positions ↓
        </a>
      </nav>

      {positions.status === 'error' && (
        <div className="mt-5">
          <ErrorState
            title="Positions unavailable"
            description={positions.error?.message ?? 'The /api/positions endpoint did not respond.'}
            fullPage={false}
          />
        </div>
      )}

      {/* ── A · The book ─────────────────────────────────────────────────── */}
      <section aria-labelledby="pos-book" className="flex flex-col gap-4 mt-5 pb-6" style={{ borderBottom: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <h2 id="pos-book" className="t-section-title">The book</h2>
            <Popover label="About the book figures" trigger={(p) => <InfoButton what="the book figures" {...p} />}>
              <PopoverTitle>Open exposure and the persisted record</PopoverTitle>
              <PopoverText>
                Unrealized and positions held come from the engine&rsquo;s open-position
                envelope. Realized and win rate come from the persisted portfolio ledger,
                which survives engine restarts.
              </PopoverText>
              <PopoverText>
                The live-execution resolution tracker is a separate, process-scoped
                subsystem that only counts real-order positions; in paper mode it reads zero
                and is not shown as a figure.
              </PopoverText>
            </Popover>
          </span>
          {pf && (
            <span className="t-metadata">{pf.mode === 'live' ? 'live account' : 'paper account'}</span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
          {pos ? (
            <Figure
              label="Unrealized"
              size="lg"
              tone={pos.totalUnrealizedPnl > 0 ? 'var(--synatra-positive)' : pos.totalUnrealizedPnl < 0 ? 'var(--synatra-negative)' : undefined}
              title="/api/positions"
              {...posCert}
              footnote={openCount === 0 ? 'flat — no capital deployed right now' : deployed !== null ? `on ${formatCurrency(deployed)} deployed` : undefined}
            >
              {formatSignedCurrency(pos.totalUnrealizedPnl)}
            </Figure>
          ) : (
            <Figure label="Unrealized" size="lg" certainty="absent" absentReason={positions.status === 'error' ? 'The positions endpoint did not answer' : 'Waiting for open-position state'} />
          )}

          {pos ? (
            <Figure label="Positions held" size="md" title="/api/positions" {...posCert} footnote={openCount === 1 ? 'open position' : 'open positions'}>
              {String(openCount)}
            </Figure>
          ) : (
            <Figure label="Positions held" size="md" certainty="absent" absentReason="Waiting for open-position state" />
          )}

          {pf ? (
            <Figure
              label="Realized"
              size="md"
              tone={realizedNeutral ? undefined : pf.pnl.realized > 0 ? 'var(--synatra-positive)' : pf.pnl.realized < 0 ? 'var(--synatra-negative)' : undefined}
              title="/api/portfolio"
              {...certaintyFromSlice(portfolioSlice, 5_000)}
              footnote={`${pf.performance.totalTrades} settled trade${pf.performance.totalTrades === 1 ? '' : 's'}${trust && suppressesTone(trust) ? ` · ${trust.headline.toLowerCase()} — see Settled positions` : ''}`}
            >
              {formatSignedCurrency(pf.pnl.realized)}
            </Figure>
          ) : (
            <Figure label="Realized" size="md" certainty="absent" absentReason="Waiting for the portfolio ledger" />
          )}

          {pf ? (
            <Figure
              label="Win rate"
              size="md"
              title="/api/portfolio"
              {...certaintyFromSlice(portfolioSlice, 5_000)}
              footnote={`${pf.performance.wins} won · ${pf.performance.losses} lost`}
            >
              {pf.performance.totalTrades > 0 ? formatPercent(pf.performance.winRate) : '—'}
            </Figure>
          ) : (
            <Figure label="Win rate" size="md" certainty="absent" absentReason="Waiting for the portfolio ledger" />
          )}
        </div>

        {tracker && (
          <p className="t-metadata">
            Live-execution tracker, this process: {tracker.wins}W / {tracker.losses}L of {tracker.totalResolved} resolved
            {tracker.autoClosed > 0 && ` · ${tracker.autoClosed} auto-closed`} · {tracker.trackedPositions} tracked
          </p>
        )}
      </section>

      {/* ── B · Open positions ───────────────────────────────────────────── */}
      <section aria-labelledby="pos-open" className="flex flex-col gap-3 py-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 id="pos-open" className="t-section-title">
            Open positions
            {rows?.kind === 'rows' && rows.rows.length > 0 && (
              <span className="ml-2 font-mono text-2xs font-normal" style={{ color: 'var(--synatra-text-muted)' }}>{rows.rows.length}</span>
            )}
          </h2>
          {rows?.kind === 'rows' && rows.rows.length > 0 && (
            <span className="t-metadata">each row expands to its evidence</span>
          )}
        </div>

        {positions.status === 'loading' && (
          <p className="t-description">Waiting for open-position state.</p>
        )}

        {rows?.kind === 'empty' && (
          <p className="t-description">
            No open positions — the engine has no capital deployed right now. A position opens
            when a candidate clears the engine&rsquo;s entry requirements.
          </p>
        )}

        {rows?.kind === 'unrecognized' && (
          <p className="t-description" style={{ color: 'var(--synatra-warning)' }}>
            The engine reports {rows.count} open position{rows.count === 1 ? '' : 's'}, but the item
            format doesn&rsquo;t match the agreed schema — rows are withheld rather than shown
            with wrong values. (Backend contract P0-01.)
          </p>
        )}

        {rows?.kind === 'rows' && rows.rows.length > 0 && (
          <>
            {/* Filters earn their place at three rows and above; one or two
                open positions are read, not searched. */}
            {(rows.rows.length >= 3 || filtersActive) && (
              <PositionFilters
                search={search} onSearchChange={setSearch}
                side={side} onSideChange={setSide}
                segment={segment} onSegmentChange={setSegment} segmentOptions={segmentOptions}
                pnlState={pnlState} onPnlChange={setPnl}
              />
            )}

            {filteredRows.length === 0 ? (
              <p className="t-description">No positions match these filters.</p>
            ) : (
              <PositionTable
                positions={filteredRows}
                edgeMap={edgeMap}
                closesAtByMarketId={closesAtByMarketId}
                stale={posCert.certainty === 'stale'}
              />
            )}
          </>
        )}
      </section>

      {/* ── C · Settled ──────────────────────────────────────────────────── */}
      <SettledPositions />
    </div>
    </ProvenanceScope>
  )
}
