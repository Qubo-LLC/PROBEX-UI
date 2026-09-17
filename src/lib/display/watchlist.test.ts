import { describe, it, expect } from 'vitest'
import { watchedIdentity, watchedState, watchedRow, orderWatched, tally, type WatchlistRecords } from './watchlist'
import type { MarketRow } from '@/lib/mappers/markets'
import type { EdgeRow } from '@/lib/mappers/edges'
import type { MarketSummaryItem, SettledTrade } from '@/types/engine'

const A = '0xa2152dfb1a3e01c871c9ab56ec0f5eced66d55246279a5e381c552cf1591b15a'
const B = '0x6be8f9e545e83ed7df70ad71f2b9fe2b3160780ef4c40075a3fb1fb115f69b7e'
const C = '0x13b0b24d24011db9e5c01cff120f5bf545dc66e08ec1f4a386f9bc89e7f284eb'
const NOW = 1_800_000_000_000

function market(over: Partial<MarketRow>): MarketRow {
  return {
    id: B, title: 'Bitcoin Up or Down - September 14, 7:00PM-7:15PM ET', description: null, segment: 'crypto',
    probability: 0.415, yesPrice: 41.5, noPrice: 58.5, volume24h: 88, liquidity: null, openInterest: null, sentiment: null,
    tags: [], resolutionCriteria: null, closesAt: NOW + 4 * 60_000, status: null, baselinePrice: 78507, yesTokenId: null, noTokenId: null,
    durationMinutes: 15, ...over,
  }
}

function archived(over: Partial<MarketSummaryItem>): MarketSummaryItem {
  const r = { current: 41.5, min: 41.5, max: 41.5, avg: 41.5 }
  return {
    marketId: C, question: 'Bitcoin Up or Down - September 14, 6:30PM-6:45PM ET', snapshotCount: 1, timeRangeSeconds: 0,
    firstSnapshot: NOW - 3_600_000, lastSnapshot: NOW - 3_600_000, yesPrice: r, noPrice: r, btcPrice: { current: 78507, min: 78507, max: 78507, avg: 78507 },
    volume: { current: 88.72, total: 88.72, avg: 88.72 }, ...over,
  }
}

function trade(over: Partial<SettledTrade>): SettledTrade {
  return {
    marketId: A, direction: 'yes', size: 754.92, entryPrice: 0.05, exitPrice: null, pnl: -754.92, pnlPercent: -1,
    edgePct: 79.95, holdTimeSeconds: 974, openedAt: NOW - 8_000_000, closedAt: NOW - 7_000_000, won: false, assetCategory: 'crypto', assetSymbol: 'SOL',
    durationMinutes: 15, ...over,
  }
}

function edge(over: Partial<EdgeRow>): EdgeRow {
  return {
    id: B, marketId: B, marketTitle: null, direction: 'no', edgePct: 19.95, kellySize: null, confidence: 0.7, signal: null,
    recommendation: null, detectedAt: NOW - 60_000, rsi: null, rsiSignal: null, macdTrend: null, alignmentScore: null, ...over,
  }
}

function records(over: Partial<WatchlistRecords>): WatchlistRecords {
  return {
    scan: new Map(), scanStatus: 'ready', archive: new Map(), archiveStatus: 'ready', edges: new Map(),
    positions: [], ledger: [], history: [], ...over,
  }
}

const NO_BOOK = { open: null, settled: [] }

describe('watchedIdentity', () => {
  it('prefers the scan, then the archive, then the book, then the shortened id', () => {
    expect(watchedIdentity(B, market({}), undefined, NO_BOOK)).toEqual({ label: 'Bitcoin · 7:00PM–7:15PM ET', source: 'scan' })
    expect(watchedIdentity(C, undefined, archived({}), NO_BOOK)).toEqual({ label: 'Bitcoin · 6:30PM–6:45PM ET', source: 'archive' })
    expect(watchedIdentity(A, undefined, undefined, { open: null, settled: [trade({})] })).toEqual({ label: 'SOL 15m', source: 'book' })
    expect(watchedIdentity(A, undefined, undefined, NO_BOOK)).toEqual({ label: '0xa2152dfb…', source: 'id' })
  })
  it('does not treat an empty archive question as a name', () => {
    expect(watchedIdentity(C, undefined, archived({ question: '' }), NO_BOOK).source).toBe('id')
  })
})

describe('watchedState', () => {
  it('reads the scan first and carries its lifecycle', () => {
    expect(watchedState(market({}), 'ready', undefined, 'ready', NO_BOOK, NOW)).toEqual({ kind: 'scanned', lifecycle: 'open', closesAt: NOW + 240_000 })
    expect(watchedState(market({ closesAt: NOW - 1 }), 'ready', undefined, 'ready', NO_BOOK, NOW)).toMatchObject({ kind: 'scanned', lifecycle: 'closed' })
  })
  it('calls a market recorded when the archive or the book holds it, dated by the newest record', () => {
    expect(watchedState(undefined, 'ready', archived({}), 'ready', NO_BOOK, NOW)).toEqual({ kind: 'recorded', lastRecorded: NOW - 3_600_000 })
    expect(watchedState(undefined, 'ready', archived({}), 'ready', { open: null, settled: [trade({ closedAt: NOW - 1_000 })] }, NOW))
      .toEqual({ kind: 'recorded', lastRecorded: NOW - 1_000 })
    // A record does not wait on the archive.
    expect(watchedState(undefined, 'ready', undefined, 'loading', { open: null, settled: [trade({})] }, NOW).kind).toBe('recorded')
  })
  it('never reads absence as expiry while a list is missing', () => {
    expect(watchedState(undefined, 'error', undefined, 'ready', NO_BOOK, NOW)).toEqual({ kind: 'unchecked', reason: 'the market list did not answer' })
    expect(watchedState(undefined, 'ready', undefined, 'error', NO_BOOK, NOW)).toEqual({ kind: 'unchecked', reason: 'the market archive did not answer' })
    expect(watchedState(undefined, 'loading', undefined, 'ready', NO_BOOK, NOW)).toEqual({ kind: 'checking' })
    expect(watchedState(undefined, 'ready', undefined, 'loading', NO_BOOK, NOW)).toEqual({ kind: 'checking' })
  })
  it('says no-record only when every record resolved and none holds the id', () => {
    expect(watchedState(undefined, 'ready', undefined, 'ready', NO_BOOK, NOW)).toEqual({ kind: 'no-record' })
  })
})

describe('watchedRow', () => {
  it('joins every record on the id and names the price source', () => {
    const r = records({
      scan: new Map([[B, market({})]]), archive: new Map([[C, archived({})]]), edges: new Map([[B, edge({})]]),
      ledger: [trade({})], history: [trade({})],
    })
    const b = watchedRow(B, r, NOW)
    expect(b.yes).toEqual({ cents: 41.5, source: 'scan' })
    expect(b.edge?.direction).toBe('no')
    const c = watchedRow(C, r, NOW)
    expect(c.yes).toEqual({ cents: 41.5, source: 'archive' })
    expect(c.edge).toBeNull()
    const a = watchedRow(A, r, NOW)
    expect(a.yes).toBeNull()
    // The ledger and the history carry the same trade once.
    expect(a.settled).toHaveLength(1)
    expect(a.state.kind).toBe('recorded')
  })
})

describe('orderWatched and tally', () => {
  it('puts scanned markets first (closing soonest at the top), then recorded, then unknowns', () => {
    const r = records({
      scan: new Map([[B, market({})], ['0xlate', market({ id: '0xlate', closesAt: NOW + 900_000 })], ['0xdone', market({ id: '0xdone', closesAt: NOW - 1 })]]),
      archive: new Map([[C, archived({})]]),
    })
    const rows = orderWatched(['0xnone', C, '0xdone', '0xlate', B].map((id) => watchedRow(id, r, NOW)))
    expect(rows.map((x) => x.marketId)).toEqual([B, '0xlate', '0xdone', C, '0xnone'])
    expect(tally(rows)).toEqual({ watched: 5, scanned: 3, recorded: 1, noRecord: 1, pending: 0, withEdge: 0, withPosition: 0, traded: 0 })
  })
})
