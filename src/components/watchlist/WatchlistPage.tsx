'use client'

// WatchlistPage — Markets › Watchlist: the market ids the operator starred,
// each held against what the engine currently records about it.
//
// ─── What this is, and is not (2026-09-16) ───────────────────────────────────
// The engine has no watchlist. Every candidate path answers 404 and no
// document mentions one (lib/display/watchlist.ts records the probe). The
// list itself is a BROWSER-LOCAL preference — the same star the catalogue,
// the overview board and Market Detail toggle, persisted in this browser's
// localStorage by preferencesStore. Real local persistence; not synced, not
// known to the engine, never a factor in what it does. This page says so in
// its first line and borrows no provenance styling for the list itself.
//
// What the page DOES draw from the engine is everything it publishes about
// a watched id: the current scan (/api/markets), the market archive
// (/api/markets/history/summary — the record that outlives a market), the
// current edges, the open positions, the settled trades, and the events that
// name the market. Each row states which record produced each fact.
//
// ─── What was wrong ──────────────────────────────────────────────────────────
// A grid of MarketCards over the current scan only, so every watched id
// that had rotated out — which, for 5- and 15-minute markets, is all of
// them within the hour — fell to a one-line "no longer active" footer with
// no identity, no price, no outcome, and no link. The archive holds the
// question and the last snapshot; the ledger holds the trade; neither was
// consulted.
//
// ─── Hierarchy ───────────────────────────────────────────────────────────────
//   A  the list's nature and tally: watched here · in the scan · recorded
//   B  the watched ledger: identity, state, YES, evidence, with each row's
//      full record on expansion — and the raw id, secondary
//   C  the engine's current edges on watched markets (the shared EdgeTable)
//   D  the events that name a watched market (the shared EventStream)

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { stamp } from '@/lib/display/time'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { usePreferencesStore } from '@/store/preferencesStore'
import { services } from '@/lib/services'
import { parseMarketRows, type MarketRow } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { parsePositionRows, type PositionRow } from '@/lib/mappers/positions'
import { parseEventRows, collapseConsecutiveRepeats } from '@/lib/mappers/events'
import type { ParseResult } from '@/lib/mappers/parse'
import { watchedRow, orderWatched, tally, type WatchedRow, type WatchedState, type RecordStatus } from '@/lib/display/watchlist'
import { formatCloseTime, closeTimestamp, lifecycleLabel } from '@/lib/display/marketLifecycle'
import { segmentLabel, compactWindowTitle } from '@/lib/display/market'
import { formatEdgePct } from '@/lib/display/engine'
import { useMarketLookup } from '@/config/hooks/useMarketLookup'
import type { MarketLookup } from '@/lib/display/eventDisplay'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { MARKET_DETAIL_PATH, ROUTES } from '@/config/constants'
import { TableShell, Thead, Th, Tr, Td, ExpansionRow } from '@/components/shared/DataTable'
import { EdgeBadge } from '@/components/shared/EdgeBadge'
import { EdgeTable } from '@/components/shared/EdgeTable'
import { EventStream } from '@/components/shared/EventStream'
import { WatchlistButton } from '@/components/shared/WatchlistButton'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'
import { EmptyState } from '@/components/ui/EmptyState'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'
import type { MarketSummaryItem, MarketsSummary } from '@/types/engine'

const YES = 'var(--probex-yes)'
const NO  = 'var(--probex-no)'
const COLS = 6
const RECENT_EVENTS = 12

/** A polled slice's status, in the three words the display module reads. */
function recordStatus(status: string, hasData: boolean): RecordStatus {
  if (hasData) return 'ready'
  return status === 'error' ? 'error' : 'loading'
}

type ArchiveState =
  | { status: 'loading' }
  | { status: 'ready'; data: MarketsSummary }
  | { status: 'error' }

/**
 * The archive, read once while the tab is open. It is the one market record
 * that outlives the scan, and the only reason to fetch it is a watched id the
 * scan no longer holds — which, for markets that rotate every few minutes, is
 * the ordinary case. Fetched here rather than polled globally, as the Archive
 * tab does: a large payload that only this tab reads.
 */
function useArchive(enabled: boolean): ArchiveState {
  const [state, setState] = useState<ArchiveState>({ status: 'loading' })
  useEffect(() => {
    if (!enabled) return
    let active = true
    services.engine.getMarketsSummary()
      .then((r) => { if (active) setState({ status: 'ready', data: r.data }) })
      .catch(() => { if (active) setState({ status: 'error' }) })
    return () => { active = false }
  }, [enabled])
  return state
}

export function WatchlistPage({ embedded = false }: EmbeddableProps = {}) {
  const marketsSlice   = useApplicationStore((s) => s.engine.markets)
  const edgesSlice     = useApplicationStore((s) => s.engine.edges)
  const positionsSlice = useApplicationStore((s) => s.engine.positions)
  const ledgerSlice    = useApplicationStore((s) => s.engine.tradesLedger)
  const historySlice   = useApplicationStore((s) => s.engine.positionsHistory)
  const eventsSlice    = useApplicationStore((s) => s.engine.events)
  const watchlist      = usePreferencesStore((s) => s.watchlist)
  const storeLookup    = useMarketLookup()

  const watchedIds = useMemo(() => Object.keys(watchlist), [watchlist])
  const archive = useArchive(watchedIds.length > 0)

  const scan = useMemo(() => {
    const map = new Map<string, MarketRow>()
    if (!marketsSlice.data) return map
    const parsed = parseMarketRows(marketsSlice.data)
    if (parsed.kind === 'rows') for (const m of parsed.rows) map.set(m.id, m)
    return map
  }, [marketsSlice.data])

  const archiveMap = useMemo(() => {
    const map = new Map<string, MarketSummaryItem>()
    if (archive.status === 'ready') for (const m of archive.data.markets) map.set(m.marketId, m)
    return map
  }, [archive])

  const edgeResult: ParseResult<EdgeRow> | null = useMemo(
    () => (edgesSlice.data ? parseEdgeRows(edgesSlice.data) : null),
    [edgesSlice.data],
  )
  const edgeMap = useMemo(() => (edgeResult ? toEdgeRowMap(edgeResult) : new Map<string, EdgeRow>()), [edgeResult])

  const positions: PositionRow[] = useMemo(() => {
    if (!positionsSlice.data) return []
    const parsed = parsePositionRows(positionsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [positionsSlice.data])

  const rows = useMemo(() => {
    const records = {
      scan, scanStatus: recordStatus(marketsSlice.status, marketsSlice.data !== null),
      archive: archiveMap, archiveStatus: archive.status === 'ready' ? 'ready' as const : archive.status,
      edges: edgeMap, positions,
      ledger: ledgerSlice.data?.ledger ?? [],
      history: historySlice.data?.history ?? [],
    }
    return orderWatched(watchedIds.map((id) => watchedRow(id, records)))
  }, [watchedIds, scan, marketsSlice.status, marketsSlice.data, archiveMap, archive.status, edgeMap, positions, ledgerSlice.data, historySlice.data])

  const t = useMemo(() => tally(rows), [rows])
  const watchedSet = useMemo(() => new Set(watchedIds), [watchedIds])

  /** The store's lookup, then the archive this tab holds: an event that names
   *  a market the scan has dropped can still be read by the archive's question. */
  const lookup = useMemo<MarketLookup>(() => (id) => {
    const known = storeLookup(id)
    if (known !== null) return known
    const a = archiveMap.get(id)
    return a !== undefined && a.question.length > 0 ? { label: compactWindowTitle(a.question), source: 'archive' } : null
  }, [storeLookup, archiveMap])

  /** The engine's current edges restricted to watched markets — the shared
   *  table, not another one. */
  const watchedEdges: ParseResult<EdgeRow> | null = useMemo(() => {
    if (edgeResult === null || edgeResult.kind !== 'rows') return edgeResult
    const mine = edgeResult.rows.filter((e) => e.marketId !== null && watchedSet.has(e.marketId))
    return mine.length > 0 ? { kind: 'rows', rows: mine } : { kind: 'empty' }
  }, [edgeResult, watchedSet])

  const recent = useMemo(() => {
    if (!eventsSlice.data) return []
    const parsed = parseEventRows(eventsSlice.data)
    if (parsed.kind !== 'rows') return []
    return collapseConsecutiveRepeats(parsed.rows.filter((r) => r.marketId !== null && watchedSet.has(r.marketId))).slice(0, RECENT_EVENTS)
  }, [eventsSlice.data, watchedSet])

  return (
    <div className={pageShell(embedded, 'gap-5')}>
      {!embedded && (
        <div>
          <h1 className="t-page-title">Watchlist</h1>
          <p className="t-page-subtitle mt-1">Markets starred in this browser, held against the engine’s records</p>
        </div>
      )}

      {/* ── A · what this list is, and the tally ────────────────────────── */}
      <section aria-labelledby="wl-tally" className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 flex-wrap">
            <h2 id="wl-tally" className="t-section-title">Watched in this browser</h2>
            <span className="t-description">a local preference — the engine keeps no watchlist</span>
            <Popover label="About the watchlist" trigger={(p) => <InfoButton what="the watchlist" {...p} />}>
              <PopoverTitle>A browser-local list</PopoverTitle>
              <PopoverText>
                Starring a market anywhere in PROBEX adds its id to a list kept in this browser’s
                storage. It survives reloads and restarts, but it is not synced to other devices,
                the engine does not know about it, and it has no effect on what the engine scans
                or trades.
              </PopoverText>
              <PopoverText>
                What the engine does publish about a watched market — its place in the current
                scan, the archive’s last snapshot, an edge, a position, a settled trade, the events
                that name it — is joined below by id. Nothing is shown for an id that no record holds.
              </PopoverText>
            </Popover>
          </span>
          <span className="t-metadata">localStorage · /api/markets · /api/markets/history/summary · /api/edges</span>
        </div>
        <p className="t-helper m-0">
          {t.watched === 0
            ? 'Nothing is starred. The star on any market row, card or detail page adds it here.'
            : <>
                <strong style={{ color: 'var(--probex-text-primary)' }}>{t.watched} market{t.watched === 1 ? '' : 's'}</strong>
                {' — '}
                {t.scanned} in the engine’s current scan, {t.recorded} held only in its records
                {t.noRecord > 0 && `, ${t.noRecord} with no record`}
                {t.pending > 0 && `, ${t.pending} not yet checked`}
                {(t.withEdge > 0 || t.withPosition > 0 || t.traded > 0) && (
                  <> · {[
                    t.withEdge > 0 ? `${t.withEdge} with a current edge` : null,
                    t.withPosition > 0 ? `${t.withPosition} with an open position` : null,
                    t.traded > 0 ? `${t.traded} traded` : null,
                  ].filter(Boolean).join(', ')}</>
                )}.
              </>}
        </p>
      </section>

      {/* ── B · the watched ledger ──────────────────────────────────────── */}
      {rows.length === 0 ? (
        <EmptyState
          size="md"
          title="No watched markets"
          description="Star a market in the catalogue, on the overview board or on its detail page. The list lives in this browser only."
          action={<Link href={ROUTES.MARKETS} className="btn-primary px-5 py-2 text-sm focus-ring">Open the catalogue</Link>}
        />
      ) : (
        <section aria-labelledby="wl-ledger" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span className="flex items-baseline gap-2 flex-wrap">
              <h2 id="wl-ledger" className="t-section-title">Watched markets</h2>
              <span className="t-description">scanning first, then recorded, then unknown — expand a row for its full record</span>
            </span>
            {marketsSlice.status === 'error' && (
              <span className="text-2xs font-semibold" style={{ color: 'var(--probex-warning)' }}>the market list did not answer — nothing has been removed</span>
            )}
          </div>
          <WatchedTable rows={rows} />
        </section>
      )}

      {/* ── C · current edges on watched markets ────────────────────────── */}
      {rows.length > 0 && (
        <section aria-labelledby="wl-edges" className="flex flex-col gap-2 pt-5" style={{ borderTop: '1px solid var(--probex-border)' }}>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span className="flex items-baseline gap-2 flex-wrap">
              <h2 id="wl-edges" className="t-section-title">Current edges on watched markets</h2>
              <span className="t-description">what the detector reports right now, if anything</span>
            </span>
            <span className="t-metadata">/api/edges{edgesSlice.data ? ` · ${edgesSlice.data.count} in total` : ''}</span>
          </div>
          {watchedEdges === null ? (
            <p className="t-description">{edgesSlice.status === 'error' ? 'The edge detector did not answer.' : 'Waiting for the edge detector.'}</p>
          ) : watchedEdges.kind === 'empty' ? (
            <p className="t-description">
              {edgesSlice.data && edgesSlice.data.count > 0
                ? `The engine reports ${edgesSlice.data.count} edge${edgesSlice.data.count === 1 ? '' : 's'} at the moment, none on a watched market.`
                : 'The engine reports no edge on any market at the moment.'}
              {' '}<Link href={ROUTES.STRATEGY} className="focus-ring font-semibold" style={{ color: 'var(--probex-primary)' }}>How edges are found →</Link>
            </p>
          ) : (
            <EdgeTable result={watchedEdges} />
          )}
        </section>
      )}

      {/* ── D · events that name a watched market ───────────────────────── */}
      {rows.length > 0 && (
        <section aria-labelledby="wl-events" className="flex flex-col gap-2 pt-5" style={{ borderTop: '1px solid var(--probex-border)' }}>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span className="flex items-baseline gap-2 flex-wrap">
              <h2 id="wl-events" className="t-section-title">Recorded activity</h2>
              <span className="t-description">events in the engine’s log that name a watched market</span>
            </span>
            <span className="flex items-baseline gap-3">
              <span className="t-metadata">/api/events</span>
              <Link href={`${ROUTES.SYSTEM}?view=events`} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--probex-primary)' }}>Full log →</Link>
            </span>
          </div>
          {!eventsSlice.data ? (
            <p className="t-description">{eventsSlice.status === 'error' ? 'The event log did not answer.' : 'Waiting for the event log.'}</p>
          ) : recent.length === 0 ? (
            <p className="t-description">No event in the current log names a watched market. Most events name no market at all; edge and trade events do.</p>
          ) : (
            <EventStream rows={recent} compact lookup={lookup} />
          )}
        </section>
      )}
    </div>
  )
}

// ─── The ledger ───────────────────────────────────────────────────────────────

function stateAccent(s: WatchedState): string | undefined {
  if (s.kind === 'scanned') {
    return s.lifecycle === 'open' ? 'var(--probex-status-live)' : s.lifecycle === 'closing' ? 'var(--probex-status-stale)' : undefined
  }
  return s.kind === 'unchecked' ? 'var(--probex-warning)' : undefined
}

/** The state, in words. Colour only reinforces the word on the row's edge.
 *  The detail (how long until close, when the last record was taken) is what
 *  folds under the identity at narrow widths, so the column keeps one word. */
function stateWords(s: WatchedState): { word: string; detail: string | null; title: string | undefined; color: string } {
  if (s.kind === 'scanned') {
    const closed = s.lifecycle === 'closed'
    return {
      word: closed ? 'Closed' : 'Scanning',
      detail: s.lifecycle === 'unknown' ? null : `${s.lifecycle === 'closing' ? `${lifecycleLabel(s.lifecycle).toLowerCase()} · ` : ''}${formatCloseTime(s.closesAt)}`,
      title: closeTimestamp(s.closesAt),
      color: closed ? 'var(--probex-text-muted)' : 'var(--probex-text-secondary)',
    }
  }
  if (s.kind === 'recorded') {
    return { word: 'Not scanned', detail: `last record ${stamp(s.lastRecorded)}`, title: new Date(s.lastRecorded).toLocaleString(), color: 'var(--probex-text-secondary)' }
  }
  if (s.kind === 'no-record') return { word: 'No record', detail: null, title: 'Neither the scan, the archive, the positions nor the trade ledger holds this id.', color: 'var(--probex-text-disabled)' }
  if (s.kind === 'checking') return { word: 'Checking…', detail: null, title: undefined, color: 'var(--probex-text-muted)' }
  return { word: 'Unchecked', detail: s.reason, title: undefined, color: 'var(--probex-warning)' }
}

function StateDetail({ w, className }: { w: ReturnType<typeof stateWords>; className?: string }) {
  if (w.detail === null) return null
  return (
    <span className={`font-mono text-2xs tabular-nums ${className ?? ''}`} style={{ color: 'var(--probex-text-muted)' }} {...(w.title !== undefined ? { title: w.title } : {})}>
      {w.detail}
    </span>
  )
}

/** One line: the relationships the engine's records establish for this id. */
function evidenceLine(r: WatchedRow): ReactNode[] {
  const parts: ReactNode[] = []
  if (r.edge) parts.push(<EdgeBadge key="edge" edge={r.edge} size="sm" />)
  if (r.open) {
    parts.push(
      <span key="open" className="text-2xs font-semibold" style={{ color: r.open.side.toLowerCase() === 'yes' ? YES : NO }}>
        {r.open.side.toUpperCase()} open{r.open.unrealizedPnl !== null ? ` · ${formatSignedCurrency(r.open.unrealizedPnl)}` : ''}
      </span>,
    )
  }
  const t = r.settled[0]
  if (t) {
    parts.push(
      <span key="trade" className="text-2xs font-semibold" style={{ color: t.won ? 'var(--probex-positive)' : 'var(--probex-negative)' }}>
        {t.direction.toUpperCase()} {t.won ? 'won' : 'lost'} {formatSignedCurrency(t.pnl)}{r.settled.length > 1 ? ` · ${r.settled.length} trades` : ''}
      </span>,
    )
  }
  return parts
}

function WatchedTable({ rows }: { rows: WatchedRow[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  return (
    <TableShell label="Watched markets">
      <Thead>
        <Th align="left" dense grow>Market</Th>
        <Th align="left" dense>State</Th>
        <Th align="right" dense hideBelow="sm">YES</Th>
        <Th align="left" dense hideBelow="sm">Evidence</Th>
        <Th align="center" dense>Watch</Th>
        <Th align="center" dense><span className="sr-only">Record</span></Th>
      </Thead>
      <tbody>
        {rows.map((r) => {
          const isOpen = open[r.marketId] === true
          const panelId = `wl-record-${r.marketId.slice(2, 12)}`
          const evidence = evidenceLine(r)
          const dim = r.state.kind === 'no-record' || (r.state.kind === 'scanned' && r.state.lifecycle === 'closed')
          const w = stateWords(r.state)
          return (
            <RowGroup key={r.marketId}>
              <Tr accent={stateAccent(r.state)}>
                <Td align="left" dense grow>
                  <Link
                    href={MARKET_DETAIL_PATH(r.marketId)}
                    className="focus-ring rounded-sm font-semibold block truncate"
                    style={{ color: dim ? 'var(--probex-text-secondary)' : 'var(--probex-text-primary)', ...(r.identity.source === 'id' ? { fontFamily: 'var(--font-mono, monospace)', fontWeight: 500 } : {}) }}
                    title={r.identity.source === 'id' ? r.marketId : r.identity.label}
                  >
                    {r.identity.label}
                  </Link>
                  {/* Where the name came from, when it is not the market's own
                      current listing — and the folded evidence at narrow widths. */}
                  <span className="flex items-center gap-x-2 gap-y-0.5 flex-wrap mt-0.5">
                    {r.identity.source === 'archive' && <span className="t-metadata">named by the archive</span>}
                    {r.identity.source === 'book' && <span className="t-metadata">named by the trade record</span>}
                    {r.identity.source === 'id' && <span className="t-metadata">no record names it</span>}
                    {r.scan?.segment && r.identity.source === 'scan' && <span className="t-metadata">{segmentLabel(r.scan.segment)}</span>}
                    {/* The folded columns, restated once beneath the title:
                        the state's detail, the YES price, the evidence. */}
                    <StateDetail w={w} className="sm:hidden" />
                    {r.yes && <span className="sm:hidden font-mono text-2xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>YES {r.yes.cents.toFixed(1)}¢{r.yes.source === 'archive' ? ' · last recorded' : ''}</span>}
                    {evidence.length > 0 && <span className="sm:hidden flex items-center gap-2 flex-wrap">{evidence}</span>}
                  </span>
                </Td>
                <Td align="left" dense>
                  <span className="inline-flex flex-col leading-tight">
                    <span className="text-2xs font-semibold" style={{ color: w.color }} {...(w.detail === null && w.title !== undefined ? { title: w.title } : {})}>{w.word}</span>
                    <StateDetail w={w} className="hidden sm:inline" />
                  </span>
                </Td>
                <Td align="right" dense hideBelow="sm">
                  {r.yes ? (
                    <span className="inline-flex flex-col items-end leading-tight">
                      <span className="font-mono font-semibold tabular-nums" style={{ color: r.yes.source === 'scan' ? 'var(--probex-text-primary)' : 'var(--probex-text-secondary)' }} title={r.yes.source === 'scan' ? 'yes_price from the current scan' : 'The archive’s last snapshot of yes_price'}>
                        {r.yes.cents.toFixed(1)}¢
                      </span>
                      {r.yes.source === 'archive' && <span className="t-metadata">last recorded</span>}
                    </span>
                  ) : <span style={{ color: 'var(--probex-text-disabled)' }}>—</span>}
                </Td>
                <Td align="left" dense hideBelow="sm">
                  {evidence.length > 0
                    ? <span className="flex items-center gap-2 flex-wrap">{evidence}</span>
                    : <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }} aria-label="No edge, position or trade on this market">—</span>}
                </Td>
                <Td align="center" dense><WatchlistButton marketId={r.marketId} /></Td>
                <Td align="center" dense>
                  <button
                    type="button"
                    onClick={() => setOpen((s) => ({ ...s, [r.marketId]: !isOpen }))}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    aria-label={`${isOpen ? 'Hide' : 'Show'} the record for ${r.identity.label}`}
                    className="focus-ring inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer"
                    style={{ color: 'var(--probex-text-muted)' }}
                  >
                    <span aria-hidden="true" style={{ display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▸</span>
                  </button>
                </Td>
              </Tr>
              <ExpansionRow id={panelId} colSpan={COLS} hidden={!isOpen} dense>
                <WatchedRecord r={r} />
              </ExpansionRow>
            </RowGroup>
          )
        })}
      </tbody>
    </TableShell>
  )
}

/** A row and its expansion are two <tr>s that must stay siblings inside the
 *  <tbody>; this is the keyed fragment that pairs them. */
function RowGroup({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// ─── The record for one watched id ────────────────────────────────────────────

function WatchedRecord({ r }: { r: WatchedRow }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2 flex-wrap min-w-0">
        <span className="t-metadata flex-shrink-0">Market id</span>
        <code className="font-mono text-2xs break-all" style={{ color: 'var(--probex-text-secondary)' }}>{r.marketId}</code>
        <Link href={MARKET_DETAIL_PATH(r.marketId)} className="focus-ring text-2xs font-semibold flex-shrink-0" style={{ color: 'var(--probex-primary)' }}>Market Detail →</Link>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-3 m-0">
        <Block label="Current scan" path="/api/markets">
          {r.scan ? (
            <>
              <Fact k="Question" v={r.scan.title} />
              {r.scan.closesAt !== null && <Fact k="Closes" v={new Date(r.scan.closesAt).toLocaleString()} />}
              {r.scan.yesPrice !== null && r.scan.noPrice !== null && <Fact k="YES / NO" v={`${r.scan.yesPrice.toFixed(1)}¢ / ${r.scan.noPrice.toFixed(1)}¢`} />}
              {r.scan.volume24h !== null && <Fact k="Volume" v={formatCurrency(r.scan.volume24h)} />}
              {r.scan.baselinePrice !== null && <Fact k="Baseline" v={formatCurrency(r.scan.baselinePrice)} note="as reported; see Market Detail for what it means" />}
              {r.scan.durationMinutes !== null && <Fact k="Window" v={`${r.scan.durationMinutes} min`} />}
            </>
          ) : <Absent>{r.state.kind === 'unchecked' && r.state.reason.includes('list') ? 'did not answer' : r.state.kind === 'checking' ? 'waiting' : 'not in the current scan'}</Absent>}
        </Block>

        <Block label="Archive" path="/api/markets/history/summary">
          {r.archive ? (
            <>
              <Fact k="Question" v={r.archive.question} />
              <Fact k="Snapshots" v={`${r.archive.snapshotCount} · ${stamp(r.archive.firstSnapshot)}${r.archive.snapshotCount > 1 ? ` → ${stamp(r.archive.lastSnapshot)}` : ''}`} />
              <Fact k="YES" v={r.archive.snapshotCount > 1 ? `${r.archive.yesPrice.min.toFixed(1)}–${r.archive.yesPrice.max.toFixed(1)}¢ · last ${r.archive.yesPrice.current.toFixed(1)}¢` : `${r.archive.yesPrice.current.toFixed(1)}¢`} />
              <Fact k="BTC" v={r.archive.snapshotCount > 1 ? `${formatCurrency(r.archive.btcPrice.min)}–${formatCurrency(r.archive.btcPrice.max)}` : formatCurrency(r.archive.btcPrice.current)} note="the engine's BTC reading at each snapshot, whatever the market's asset" />
              <Fact k="Volume" v={formatCurrency(r.archive.volume.total)} />
            </>
          ) : <Absent>{r.state.kind === 'unchecked' && r.state.reason.includes('archive') ? 'did not answer' : r.state.kind === 'checking' ? 'waiting' : 'no snapshot recorded'}</Absent>}
        </Block>

        <Block label="Edge" path="/api/edges">
          {r.edge ? (
            <>
              <Fact k="Direction" v={r.edge.direction.toUpperCase()} tone={r.edge.direction === 'yes' ? YES : NO} />
              <Fact k="Edge" v={formatEdgePct(r.edge.edgePct)} />
              {r.edge.confidence !== null && <Fact k="Confidence" v={formatPercent(r.edge.confidence)} />}
              {(r.edge.rsi !== null || r.edge.macdTrend !== null || r.edge.alignmentScore !== null) && (
                <Fact k="Indicators" v={[
                  r.edge.rsi !== null ? `RSI ${r.edge.rsi.toFixed(0)}${r.edge.rsiSignal ? ` ${r.edge.rsiSignal}` : ''}` : null,
                  r.edge.macdTrend !== null ? `MACD ${r.edge.macdTrend}` : null,
                  r.edge.alignmentScore !== null ? `align ${r.edge.alignmentScore.toFixed(2)}` : null,
                ].filter(Boolean).join(' · ')} />
              )}
              {r.edge.detectedAt !== null && <Fact k="Detected" v={new Date(r.edge.detectedAt).toLocaleString()} />}
            </>
          ) : <Absent>no current edge on this market</Absent>}
        </Block>

        <Block label="Book" path="/api/positions · /api/trades/ledger">
          {r.open === null && r.settled.length === 0 ? <Absent>no position or trade on this market</Absent> : (
            <>
              {r.open && (
                <Fact
                  k="Open"
                  v={`${r.open.side.toUpperCase()}${r.open.costBasis !== null ? ` · ${formatCurrency(r.open.costBasis)} at cost` : ''}${r.open.unrealizedPnl !== null ? ` · ${formatSignedCurrency(r.open.unrealizedPnl)} unrealized` : ''}`}
                  tone={r.open.side.toLowerCase() === 'yes' ? YES : NO}
                />
              )}
              {r.settled.map((t) => (
                <Fact
                  key={`${t.openedAt}-${t.closedAt}`}
                  k={t.won ? 'Won' : 'Lost'}
                  v={`${t.direction.toUpperCase()} · ${formatCurrency(t.size)} staked · ${formatSignedCurrency(t.pnl)} · settled ${stamp(t.closedAt)}`}
                  tone={t.won ? 'var(--probex-positive)' : 'var(--probex-negative)'}
                  note={`edge at entry ${formatEdgePct(t.edgePct)}`}
                />
              ))}
              <span className="t-metadata"><Link href={`${ROUTES.PORTFOLIO}?view=capital`} className="focus-ring" style={{ color: 'var(--probex-primary)' }}>Capital & Ledger →</Link></span>
            </>
          )}
        </Block>
      </dl>
    </div>
  )
}

function Block({ label, path, children }: { label: string; path: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <dt className="flex items-baseline gap-2 flex-wrap">
        <span className="t-label">{label}</span>
        <span className="t-metadata truncate">{path}</span>
      </dt>
      <dd className="m-0 flex flex-col gap-1 min-w-0">{children}</dd>
    </div>
  )
}

function Fact({ k, v, tone, note }: { k: string; v: string; tone?: string; note?: string }) {
  return (
    <span className="flex flex-col min-w-0">
      <span className="text-2xs min-w-0">
        <span style={{ color: 'var(--probex-text-muted)' }}>{k} </span>
        <span className="font-semibold" style={{ color: tone ?? 'var(--probex-text-secondary)' }}>{v}</span>
      </span>
      {note && <span className="t-metadata">{note}</span>}
    </span>
  )
}

function Absent({ children }: { children: ReactNode }) {
  return <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>{children}</span>
}
