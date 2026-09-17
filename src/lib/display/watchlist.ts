// Watchlist presentation helpers.
//
// ─── What a watchlist is on this engine (live-read 2026-09-16) ──────────────
// Nothing. The backend has no watchlist primitive: /api/watchlist,
// /api/watchlists, /api/user/watchlist and /api/preferences all answer 404,
// no OpenAPI document is served, and no handoff document mentions one. The
// only watchlist is the BROWSER-LOCAL preference in preferencesStore — a set
// of market ids the operator starred, kept in this browser's localStorage.
// It is genuine local persistence and nothing more: not synced, not known to
// the engine, never a factor in what the engine does.
//
// So this surface does not pretend to be a saved list the engine holds. It
// takes the ids the operator chose and holds each one against the records the
// engine DOES publish — the current scan, the market archive, the edges, the
// open positions, the settled trades and the event log — and says, per id,
// what the engine currently knows about it. Every field below names the
// record it came from; nothing is invented for an id no record holds.

import type { MarketRow } from '@/lib/mappers/markets'
import type { EdgeRow } from '@/lib/mappers/edges'
import type { PositionRow } from '@/lib/mappers/positions'
import type { MarketSummaryItem, SettledTrade } from '@/types/engine'
import { compactWindowTitle } from './market'
import { marketIdentity } from './positionDisplay'
import { shortMarketId } from './eventDisplay'
import { marketLifecycle, type MarketLifecycle } from './marketLifecycle'

// ─── Identity ─────────────────────────────────────────────────────────────────

export type IdentitySource = 'scan' | 'archive' | 'book' | 'id'

export interface WatchedIdentity {
  label: string
  /** Which record supplied the label. 'id' means none did and the label is the
   *  shortened id — a handle, not a name. */
  source: IdentitySource
}

/**
 * The best name any record gives this id. The scan carries the question
 * itself; the archive carries the same question for markets that have rotated
 * out; a trade or position names the asset and window; failing all three, the
 * shortened id.
 */
export function watchedIdentity(
  marketId: string,
  scan: MarketRow | undefined,
  archive: MarketSummaryItem | undefined,
  book: { open: PositionRow | null; settled: readonly SettledTrade[] },
): WatchedIdentity {
  if (scan !== undefined) return { label: compactWindowTitle(scan.title), source: 'scan' }
  if (archive !== undefined && archive.question.length > 0) return { label: compactWindowTitle(archive.question), source: 'archive' }
  if (book.open?.marketTitle) return { label: compactWindowTitle(book.open.marketTitle), source: 'book' }
  const t = book.settled[0]
  if (t !== undefined && t.assetSymbol !== null) return { label: marketIdentity(t.assetSymbol, t.durationMinutes, marketId), source: 'book' }
  return { label: shortMarketId(marketId), source: 'id' }
}

// ─── State ────────────────────────────────────────────────────────────────────

export type RecordStatus = 'loading' | 'ready' | 'error'

export type WatchedState =
  /** In the engine's current scan. `lifecycle` is the close-time comparison
   *  the catalogue already makes; 'unknown' when the scan row has no close time. */
  | { kind: 'scanned'; lifecycle: MarketLifecycle; closesAt: number | null }
  /** Not in the current scan, but the engine holds a record of it — the
   *  archive's last snapshot, or a settled trade. `lastRecorded` is the newer. */
  | { kind: 'recorded'; lastRecorded: number }
  /** Both the scan and the archive resolved and neither holds this id, and no
   *  trade or position names it. */
  | { kind: 'no-record' }
  /** The answer is not in yet: the scan or the archive is still loading. */
  | { kind: 'checking' }
  /** The scan or the archive failed, so absence cannot be read as expiry —
   *  absence of evidence is reported as absence of evidence. */
  | { kind: 'unchecked'; reason: string }

export function watchedState(
  scan: MarketRow | undefined,
  scanStatus: RecordStatus,
  archive: MarketSummaryItem | undefined,
  archiveStatus: RecordStatus,
  book: { open: PositionRow | null; settled: readonly SettledTrade[] },
  now: number = Date.now(),
): WatchedState {
  if (scan !== undefined) return { kind: 'scanned', lifecycle: marketLifecycle(scan.closesAt, now), closesAt: scan.closesAt }
  // A record is a record whichever endpoint holds it: the archive's last
  // snapshot, a settled trade's close, an open position's entry.
  const marks = [archive?.lastSnapshot, book.settled[0]?.closedAt, book.open?.openedAt ?? (book.open ? now : undefined)]
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (marks.length > 0) return { kind: 'recorded', lastRecorded: Math.max(...marks) }
  if (scanStatus === 'error') return { kind: 'unchecked', reason: 'the market list did not answer' }
  if (scanStatus === 'loading') return { kind: 'checking' }
  if (archiveStatus === 'error') return { kind: 'unchecked', reason: 'the market archive did not answer' }
  if (archiveStatus === 'loading') return { kind: 'checking' }
  return { kind: 'no-record' }
}

// ─── The row ──────────────────────────────────────────────────────────────────

export interface WatchedYes {
  cents: number
  /** The scan's price is the market's price now; the archive's is the last
   *  snapshot the engine took before the market rotated out. */
  source: 'scan' | 'archive'
}

export interface WatchedRow {
  marketId: string
  identity: WatchedIdentity
  state: WatchedState
  yes: WatchedYes | null
  /** The engine's current edge on this market, if it reports one. */
  edge: EdgeRow | null
  open: PositionRow | null
  settled: SettledTrade[]
  archive: MarketSummaryItem | null
  scan: MarketRow | null
}

export interface WatchlistRecords {
  scan: ReadonlyMap<string, MarketRow>
  scanStatus: RecordStatus
  archive: ReadonlyMap<string, MarketSummaryItem>
  archiveStatus: RecordStatus
  edges: ReadonlyMap<string, EdgeRow>
  positions: readonly PositionRow[]
  ledger: readonly SettledTrade[]
  history: readonly SettledTrade[]
}

/** The ledger and the positions history share one item shape and, on the live
 *  engine, one content; a trade present in both is one trade. Same rule as
 *  Market Detail's book. */
function settledOn(marketId: string, ledger: readonly SettledTrade[], history: readonly SettledTrade[]): SettledTrade[] {
  const seen = new Set<string>()
  const out: SettledTrade[] = []
  for (const t of [...ledger, ...history]) {
    if (t.marketId !== marketId) continue
    const key = `${t.openedAt}\u001f${t.closedAt}\u001f${t.direction}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out.sort((a, b) => b.closedAt - a.closedAt)
}

export function watchedRow(marketId: string, r: WatchlistRecords, now: number = Date.now()): WatchedRow {
  const scan = r.scan.get(marketId)
  const archive = r.archive.get(marketId)
  const book = { open: r.positions.find((p) => p.marketId === marketId) ?? null, settled: settledOn(marketId, r.ledger, r.history) }
  const yes: WatchedYes | null =
    scan?.yesPrice != null ? { cents: scan.yesPrice, source: 'scan' }
    : archive !== undefined ? { cents: archive.yesPrice.current, source: 'archive' }
    : null
  return {
    marketId,
    identity: watchedIdentity(marketId, scan, archive, book),
    state: watchedState(scan, r.scanStatus, archive, r.archiveStatus, book, now),
    yes,
    edge: r.edges.get(marketId) ?? null,
    open: book.open,
    settled: book.settled,
    archive: archive ?? null,
    scan: scan ?? null,
  }
}

/**
 * Rows in the order an operator monitors them: what is being scanned first
 * (closing soonest at the top), then what the engine still holds a record of
 * (most recently recorded first), then the unknowns. Stable within a group.
 */
export function orderWatched(rows: readonly WatchedRow[]): WatchedRow[] {
  const rank = (s: WatchedState): number =>
    s.kind === 'scanned' ? (s.lifecycle === 'closed' ? 1 : 0)
    : s.kind === 'recorded' ? 2
    : s.kind === 'checking' ? 3
    : s.kind === 'unchecked' ? 4
    : 5
  return [...rows].sort((a, b) => {
    const d = rank(a.state) - rank(b.state)
    if (d !== 0) return d
    if (a.state.kind === 'scanned' && b.state.kind === 'scanned') {
      return (a.state.closesAt ?? Infinity) - (b.state.closesAt ?? Infinity)
    }
    if (a.state.kind === 'recorded' && b.state.kind === 'recorded') return b.state.lastRecorded - a.state.lastRecorded
    return 0
  })
}

// ─── The count sentence ───────────────────────────────────────────────────────

export interface WatchlistTally {
  watched: number
  scanned: number
  recorded: number
  noRecord: number
  pending: number
  withEdge: number
  withPosition: number
  traded: number
}

export function tally(rows: readonly WatchedRow[]): WatchlistTally {
  const t: WatchlistTally = { watched: rows.length, scanned: 0, recorded: 0, noRecord: 0, pending: 0, withEdge: 0, withPosition: 0, traded: 0 }
  for (const r of rows) {
    if (r.state.kind === 'scanned') t.scanned++
    else if (r.state.kind === 'recorded') t.recorded++
    else if (r.state.kind === 'no-record') t.noRecord++
    else t.pending++
    if (r.edge !== null) t.withEdge++
    if (r.open !== null) t.withPosition++
    if (r.settled.length > 0) t.traded++
  }
  return t
}
