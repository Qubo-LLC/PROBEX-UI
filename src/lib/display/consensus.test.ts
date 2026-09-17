import { describe, it, expect } from 'vitest'
import { readingFreshness, signalRows, signalLabel, readingMatchesEdgeEvent, READING_STALE_AFTER_MS } from './consensus'

// The live reading of 2026-09-16: eight signals, computed 2026-09-14T23:29:32.999Z.
const READ_AT = Date.UTC(2026, 8, 14, 23, 29, 32, 999)
const reading = {
  scoreTimestamp: READ_AT,
  allSignals: [
    { key: 'kalman_direction', value: 0.68 }, { key: 'kalman_confidence', value: 0.94 }, { key: 'bayesian_regime_bias', value: 0 },
    { key: 'edge_direction', value: -1 }, { key: 'edge_confidence', value: 0.768 }, { key: 'rsi_momentum', value: -0.5 },
    { key: 'macd_trend', value: 0 }, { key: 'price_momentum', value: 0 },
  ],
}

describe('readingFreshness', () => {
  it('measures the READING’s age, not the poll’s', () => {
    const now = READ_AT + 33 * 3_600_000 + 11 * 60_000
    const f = readingFreshness(reading, now)
    expect(f.stale).toBe(true)
    expect(f.ageLabel).toBe('33h 11m ago')
  })
  it('is not stale inside one market window', () => {
    expect(readingFreshness(reading, READ_AT + READING_STALE_AFTER_MS - 1).stale).toBe(false)
    expect(readingFreshness(reading, READ_AT + READING_STALE_AFTER_MS + 1).stale).toBe(true)
  })
})

describe('signalRows', () => {
  it('keeps every signal under its wire key, in wire order, with only its sign read', () => {
    const rows = signalRows(reading)
    expect(rows.map((r) => r.key)).toEqual(reading.allSignals.map((s) => s.key))
    expect(rows.map((r) => r.sign)).toEqual(['positive', 'positive', 'zero', 'negative', 'positive', 'negative', 'zero', 'zero'])
    expect(rows[0]!.label).toBe('Kalman direction')
  })
  it('labels keys without renaming them', () => {
    expect(signalLabel('rsi_momentum')).toBe('RSI momentum')
    expect(signalLabel('macd_trend')).toBe('MACD trend')
    expect(signalLabel('bayesian_regime_bias')).toBe('Bayesian regime bias')
  })
})

describe('readingMatchesEdgeEvent', () => {
  it('is true only when the newest edge event sits within the same cycle', () => {
    const events = [
      { type: 'resolution', timestamp: READ_AT + 120_000 },
      { type: 'edge', timestamp: READ_AT + 400 },
      { type: 'edge', timestamp: READ_AT - 600_000 },
    ]
    expect(readingMatchesEdgeEvent(reading, events)).toBe(true)
    expect(readingMatchesEdgeEvent(reading, [{ type: 'edge', timestamp: READ_AT + 60_000 }])).toBe(false)
    expect(readingMatchesEdgeEvent(reading, [])).toBe(false)
    expect(readingMatchesEdgeEvent(reading, null)).toBeNull()
  })
})
