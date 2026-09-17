import { describe, it, expect } from 'vitest'
import { executionPosture, hourLabel, bucketRows } from './execution'

describe('executionPosture', () => {
  const paper = { mode: 'paper' as const, liveTradingEnabled: false }
  it('names paper mode and says the real-order subsystem is idle', () => {
    const p = executionPosture(paper, true, 'permitted')
    expect(p.word).toBe('PAPER')
    expect(p.sentence).toMatch(/submits nothing/)
  })
  it('is LIVE when either the mode or the flag says so', () => {
    expect(executionPosture({ mode: 'live', liveTradingEnabled: false }, true, 'live-mode').word).toBe('LIVE')
    expect(executionPosture({ mode: 'paper', liveTradingEnabled: true }, true, 'live-trading-enabled').word).toBe('LIVE')
  })
  it('does not assume paper before the policy has answered', () => {
    expect(executionPosture(null, null, 'permitted').word).toBe('UNCONFIRMED')
  })
  it('lets the write gate override everything when the engine is unreachable', () => {
    expect(executionPosture(paper, true, 'engine-unreachable').word).toBe('UNAVAILABLE')
  })
  it('distinguishes paper-but-unavailable from paper', () => {
    expect(executionPosture(paper, false, 'permitted').word).toBe('PAPER · SUBSYSTEM UNAVAILABLE')
  })
})

describe('hourLabel', () => {
  it('labels the engine’s hour keys as UTC and leaves other keys alone', () => {
    expect(hourLabel('22')).toBe('22:00 UTC')
    expect(hourLabel('7')).toBe('07:00 UTC')
    expect(hourLabel('10%+')).toBe('10%+')
    expect(hourLabel('24')).toBe('24')
  })
})

describe('bucketRows', () => {
  it('derives the trade count from wins + losses and keeps the engine’s win rate', () => {
    const rows = bucketRows({ '10%+': { wins: 3, losses: 7, totalPnl: 2065.5, winRate: 0.3 } })
    expect(rows).toEqual([{ key: '10%+', label: '10%+', trades: 10, wins: 3, losses: 7, winRate: 0.3, totalPnl: 2065.5 }])
  })
})
