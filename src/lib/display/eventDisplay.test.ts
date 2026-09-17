import { describe, it, expect } from 'vitest'
import {
  eventContext, eventContextLine, messageIsRedundant, isAlerting,
  formatEventTime, latestActivity, shortMarketId, type MarketLookup,
} from './eventDisplay'
import type { EventRow } from '@/lib/mappers/events'

const MARKET = '0xa2152dfb1a3e01c871c9ab56ec0f5eced66d55246279a5e381c552cf1591b15a'

function row(over: Partial<EventRow>): EventRow {
  return {
    id: 'x', type: 'trade', description: '', marketId: null, marketTitle: null, amount: null,
    probability: null, timestamp: null, title: null, severity: 'info', metadata: null, ...over,
  }
}

const tradeRow = row({
  type: 'trade', title: 'Paper trade recorded',
  description: `Recorded paper trade PAPER_20260914_0010 for ${MARKET}`,
  marketId: MARKET,
  metadata: { trade_id: 'PAPER_20260914_0010', market_id: MARKET, direction: 'YES', edge_pct: 79.95 },
})

const lookup: MarketLookup = (id) => (id === MARKET ? { label: 'SOL 15m', source: 'ledger' } : null)

describe('eventContext', () => {
  it('reads only what the metadata carries', () => {
    expect(eventContext(tradeRow)).toEqual({
      direction: 'yes', edgePct: 79.95, marketId: MARKET, tradeId: 'PAPER_20260914_0010',
      edgesDetected: null, resolvedCount: null, errorText: null,
    })
    expect(eventContext(row({ metadata: null }))).toEqual({
      direction: null, edgePct: null, marketId: null, tradeId: null, edgesDetected: null, resolvedCount: null, errorText: null,
    })
  })
})

describe('eventContextLine', () => {
  it('names the market from a lookup and marks it derived', () => {
    const line = eventContextLine(tradeRow, lookup)
    expect(line.map((f) => f.text)).toEqual(['YES', 'SOL 15m', '80.0% edge at entry'])
    expect(line[1]).toMatchObject({ kind: 'market', marketId: MARKET, derivedFrom: 'ledger' })
  })

  it('falls back to a shortened id when no record names the market — never a guessed title', () => {
    const line = eventContextLine(tradeRow)
    expect(line[1]).toMatchObject({ text: `market ${shortMarketId(MARKET)}`, kind: 'market' })
    expect(line[1]!.derivedFrom).toBeUndefined()
  })

  it('describes an edge event by count, top edge and market', () => {
    const e = row({
      type: 'edge', title: 'Edge detected', description: 'Detected 2 market edge(s)', marketId: MARKET,
      metadata: { edges_detected: 2, top_edge_market_id: MARKET, top_edge_pct: 19.95, top_edge_direction: 'NO' },
    })
    expect(eventContextLine(e).map((f) => f.text)).toEqual(['2 edges', 'top NO 19.9%', `market ${shortMarketId(MARKET)}`])
  })

  it('describes a resolution by its count and nothing else', () => {
    const r = row({ type: 'resolution', title: 'Paper trades resolved', description: 'Resolved 2 paper trade(s)', metadata: { resolved_count: 2 } })
    expect(eventContextLine(r).map((f) => f.text)).toEqual(['2 paper trades settled'])
  })

  it('returns nothing for an error or unknown type, so the message is shown instead', () => {
    const err = row({ type: 'error', severity: 'critical', title: 'Trading cycle error', description: 'Trading cycle failed: x', metadata: { error: 'x' } })
    expect(eventContextLine(err)).toEqual([])
    expect(messageIsRedundant(err, [])).toBe(false)
    const unknown = row({ type: 'health', title: 'Probe recovered', description: 'price_feed reconnected', metadata: {} })
    expect(eventContextLine(unknown)).toEqual([])
    expect(messageIsRedundant(unknown, [])).toBe(false)
  })
})

describe('messageIsRedundant', () => {
  it('hides a trade/edge/resolution message once the context line restates its facts', () => {
    expect(messageIsRedundant(tradeRow, eventContextLine(tradeRow))).toBe(true)
  })
  it('keeps the message when there is no context line to replace it', () => {
    expect(messageIsRedundant(row({ type: 'trade', description: 'something', metadata: {} }), [])).toBe(false)
  })
})

describe('isAlerting', () => {
  it('matches the engine severities that mean something is wrong', () => {
    expect(isAlerting('critical')).toBe(true)
    expect(isAlerting('Warning')).toBe(true)
    expect(isAlerting('info')).toBe(false)
    expect(isAlerting(null)).toBe(false)
  })
})

describe('formatEventTime', () => {
  it('shows the clock alone on the same local day and prefixes the date otherwise', () => {
    const now = new Date(2026, 8, 15, 23, 0, 0).getTime()
    const sameDay = new Date(2026, 8, 15, 2, 31, 45).getTime()
    const yesterday = new Date(2026, 8, 14, 2, 31, 45).getTime()
    expect(formatEventTime(sameDay, now)).not.toMatch(/Sep/)
    expect(formatEventTime(yesterday, now)).toMatch(/Sep 14/)
  })
})

describe('latestActivity', () => {
  it('reports the newest timed row and its age, ignoring untimed rows', () => {
    const now = 1_000_000
    const rows = [row({ timestamp: null }), row({ timestamp: 400_000 }), row({ timestamp: 900_000 })]
    expect(latestActivity(rows, now)).toEqual({ at: 900_000, ageMs: 100_000 })
    expect(latestActivity([row({ timestamp: null })], now)).toBeNull()
  })
})
