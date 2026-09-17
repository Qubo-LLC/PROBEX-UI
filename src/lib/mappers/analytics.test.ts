import { describe, expect, it } from 'vitest'
import {
  parseSignalRows, parseHourlyRows, outcomesReconciled,
  groupByAsset, groupByWindow, groupByEdgeBucket, expectancy,
} from './analytics'
import type { SettledTrade } from '@/types/engine'

// The first live sample, 2026-09-15 — the shape this module was written against.
const LIVE_SIGNAL = { signal_name: 'rsi_neutral', total_occurrences: 10, correct_predictions: 0, accuracy: 0.0, avg_edge_when_correct: 0.0, avg_edge_when_incorrect: 0.0 }
const LIVE_HOUR   = { hour: 22, hour_label: '22:00', total_trades: 6, wins: 0, losses: 6, win_rate: 0.0, total_pnl: 0.0, avg_pnl: 0.0, avg_edge_pct: 71.5 }

const trade = (over: Partial<SettledTrade>): SettledTrade => ({
  marketId: '0x1', direction: 'yes', size: 100, entryPrice: 50, exitPrice: null, pnl: 0, pnlPercent: 0,
  edgePct: 12, holdTimeSeconds: 900, openedAt: 0, closedAt: 0, won: false,
  assetCategory: 'crypto', assetSymbol: 'BTC', durationMinutes: 15, ...over,
})

describe('parseSignalRows / parseHourlyRows', () => {
  it('reads the live shape and drops anything it cannot prove', () => {
    const rows = parseSignalRows([LIVE_SIGNAL, { signal_name: 'x' }, null, 'junk'])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ name: 'rsi_neutral', occurrences: 10, correct: 0, accuracy: 0 })
    const hours = parseHourlyRows([LIVE_HOUR, { hour: 'x' }])
    expect(hours).toHaveLength(1)
    expect(hours[0]).toMatchObject({ hour: 22, label: '22:00', trades: 6, losses: 6, totalPnl: 0, avgEdgePct: 71.5 })
  })

  it('normalises a percentage accuracy to a fraction, leaves a fraction alone', () => {
    expect(parseSignalRows([{ ...LIVE_SIGNAL, accuracy: 62.5 }])[0]!.accuracy).toBeCloseTo(0.625)
    expect(parseSignalRows([{ ...LIVE_SIGNAL, accuracy: 0.4 }])[0]!.accuracy).toBeCloseTo(0.4)
  })
})

describe('outcomesReconciled', () => {
  it('flags losses with zero P&L as unjoined — the live signature', () => {
    expect(outcomesReconciled(parseHourlyRows([LIVE_HOUR]))).toBe(false)
  })
  it('accepts real figures, and an empty report', () => {
    expect(outcomesReconciled(parseHourlyRows([{ ...LIVE_HOUR, wins: 2, losses: 4, total_pnl: -310.2 }]))).toBe(true)
    expect(outcomesReconciled([])).toBe(true)
  })
})

describe('ledger groupings', () => {
  const trades = [
    trade({ assetSymbol: 'BTC', durationMinutes: 15, edgePct: 12, won: true,  pnl: 40 }),
    trade({ assetSymbol: 'BTC', durationMinutes: 5,  edgePct: 3,  won: false, pnl: -20 }),
    trade({ assetSymbol: 'SOL', durationMinutes: 15, edgePct: 80, won: false, pnl: -100 }),
    trade({ assetSymbol: null,  durationMinutes: null, edgePct: 1, won: true, pnl: 5 }),
  ]

  it('groups by asset, skipping trades without one', () => {
    const g = groupByAsset(trades)
    expect(g.map((r) => r.key)).toEqual(['BTC', 'SOL'])
    expect(g[0]).toMatchObject({ trades: 2, wins: 1, winRate: 0.5, totalPnl: 20, avgEdge: 7.5 })
  })

  it('groups by window length and by the survival brain\'s edge buckets, in scale order', () => {
    expect(groupByWindow(trades).map((r) => `${r.key}:${r.trades}`)).toEqual(['15m:2', '5m:1'])
    expect(groupByEdgeBucket(trades).map((r) => r.key)).toEqual(['<2%', '2–5%', '10%+'])
  })

  it('expectancy is mean P&L per trade, null with nothing to average', () => {
    expect(expectancy(trades)).toBeCloseTo(-18.75)
    expect(expectancy([])).toBeNull()
  })
})
