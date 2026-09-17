import { describe, it, expect } from 'vitest'
import { identityReading, baselineReading, historyTrajectory, marketBook, isBtcMarket } from './marketDetail'
import type { MarketRow } from '@/lib/mappers/markets'
import type { MarketHistoryPoint, SettledTrade } from '@/types/engine'
import type { PositionRow } from '@/lib/mappers/positions'

const MARKET = '0x4ca1d286af3bb0e10c357d249ad5f29529cbdcdae71a11a34d620cc1b6213cfc'

function point(over: Partial<MarketHistoryPoint>): MarketHistoryPoint {
  return {
    ts: 0, marketId: MARKET, question: 'Bitcoin Up or Down - September 14, 7:00PM-7:15PM ET',
    yesPrice: 6.5, noPrice: 93.5, volume: 101.43, btcPrice: 78443.1, baselinePrice: 78443.1, edgePct: null, durationMinutes: 15, ...over,
  }
}

function market(over: Partial<MarketRow>): MarketRow {
  return {
    id: MARKET, title: 'Bitcoin Up or Down - September 14, 7:00PM-7:15PM ET', description: null, segment: 'crypto',
    probability: 0.065, yesPrice: 6.5, noPrice: 93.5, volume24h: 101, liquidity: null, openInterest: null, sentiment: null,
    tags: [], resolutionCriteria: null, closesAt: null, status: null, baselinePrice: 78443.1, yesTokenId: null, noTokenId: null,
    durationMinutes: 15, ...over,
  }
}

function trade(over: Partial<SettledTrade>): SettledTrade {
  return {
    marketId: MARKET, direction: 'yes', size: 427.09, entryPrice: 6.5, exitPrice: null, pnl: -427.09, pnlPercent: -1,
    edgePct: 73.5, holdTimeSeconds: 972, openedAt: 1000, closedAt: 2000, won: false, assetCategory: 'crypto', assetSymbol: 'BTC',
    durationMinutes: 15, ...over,
  }
}

describe('identityReading', () => {
  it('prefers the market record and falls back to the history snapshot', () => {
    expect(identityReading(market({}), [])).toMatchObject({ source: 'market', durationMinutes: 15 })
    expect(identityReading(undefined, [point({})])).toMatchObject({ source: 'history', question: expect.stringContaining('Bitcoin') })
  })
  it('names nothing when nothing names the market', () => {
    expect(identityReading(undefined, [])).toBeNull()
    expect(identityReading(undefined, [point({ question: '' })])).toBeNull()
  })
})

describe('baselineReading', () => {
  it('derives above/below only for a BTC market with a live price', () => {
    expect(baselineReading(market({}), 78500)).toEqual({ kind: 'derived', baseline: 78443.1, now: 78500, above: true })
    expect(baselineReading(market({}), null)).toEqual({ kind: 'reported', baseline: 78443.1 })
  })
  it('withholds a BTC-shaped baseline on a non-BTC market', () => {
    const eth = market({ title: 'Ethereum Up or Down - September 14, 7:00PM-7:15PM ET', baselinePrice: 78710 })
    expect(baselineReading(eth, 78500).kind).toBe('withheld')
    // A baseline that looks like the asset's own price is reported without a relationship.
    expect(baselineReading(market({ ...eth, baselinePrice: 3900 }), 78500)).toEqual({ kind: 'reported', baseline: 3900 })
  })
  it('is absent without a baseline', () => {
    expect(baselineReading(market({ baselinePrice: null }), 78500)).toEqual({ kind: 'absent' })
  })
  it('recognises Bitcoin markets by title only', () => {
    expect(isBtcMarket('Bitcoin Up or Down - x')).toBe(true)
    expect(isBtcMarket('Solana Up or Down - x')).toBe(false)
  })
})

describe('historyTrajectory', () => {
  it('reads first → last from a chronological series', () => {
    const t = historyTrajectory([point({ ts: 1, btcPrice: 78443.1, yesPrice: 6.5 }), point({ ts: 2, btcPrice: 78429.2, yesPrice: 0.05 })])
    expect(t).not.toBeNull()
    expect(t!.snapshots).toBe(2)
    expect(t!.btcMove).toBeCloseTo((78429.2 - 78443.1) / 78443.1, 8)
    expect(t!.yesMoveCents).toBeCloseTo(-6.45, 8)
  })
  it('has no path for a single point', () => {
    expect(historyTrajectory([point({})])).toBeNull()
  })
})

describe('marketBook', () => {
  it('joins on market id, dedupes the ledger against the positions history, newest first', () => {
    const a = trade({ closedAt: 2000 })
    const b = trade({ openedAt: 5000, closedAt: 6000, won: true, pnl: 12 })
    const other = trade({ marketId: '0xother' })
    const book = marketBook(MARKET, [], [a, other], [a, b])
    expect(book.open).toBeNull()
    expect(book.settled.map((t) => t.closedAt)).toEqual([6000, 2000])
  })
  it('surfaces an open position on the market', () => {
    const open = { marketId: MARKET, side: 'yes' } as PositionRow
    expect(marketBook(MARKET, [open], [], []).open).toBe(open)
  })
})
