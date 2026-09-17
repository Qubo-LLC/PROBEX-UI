import { describe, it, expect } from 'vitest'
import { sizingReading, executionReading, mechanismVerdict, patternFilterReading } from './mechanism'
import type { EngineConfig, SurvivalStatus, PaperTrading, ExecutionStatus } from '@/types/engine'
import type { EdgeRow } from '@/lib/mappers/edges'

// Shapes from the live captures of 2026-09-15/16.
const survival = {
  currentCapital: 2165.5, initialCapital: 100, capitalPct: 2165.5, state: 'THRIVING', dailyBurnRate: 2065.5, daysOfRunway: null,
  recoveryTradesNeeded: 0, avgWinSize: 0, dailyTarget: 21.66, weeklyTarget: 108.28, dailyPnl: 0, weeklyPnl: 2065.5, behindTargetPct: 100,
  kellyModifier: 1.5, minEdgeThreshold: 1.5, totalPatterns: 4, filteredPatterns: 0, timestamp: 0, patternsSummary: [],
} as SurvivalStatus

const config = { kellyFraction: 0.5, maxBetPercent: 20, environment: 'paper' } as EngineConfig
const paper = { totalTrades: 10, wins: 3, losses: 7, pending: 0, sessionStart: 1 } as PaperTrading
const execution = { totalTrades: 0, wins: 0, losses: 0, mode: 'paper', resolutionStats: { isRunning: true } } as unknown as ExecutionStatus

describe('sizingReading', () => {
  it('derives effective Kelly and the dollar cap from two wire values', () => {
    expect(sizingReading(config, survival)).toEqual({ baseKelly: 0.5, modifier: 1.5, effectiveKelly: 0.75, maxBetPercent: 20, maxStakeUsd: 433.1 })
    expect(sizingReading(null, survival)).toBeNull()
  })
})

describe('executionReading', () => {
  it('reads the paper session in paper mode — not the real-order subsystem', () => {
    expect(executionReading('paper', paper, execution)).toMatchObject({ kind: 'paper', trades: 10, wins: 3, losses: 7 })
  })
  it('reads the real-order subsystem in live mode', () => {
    expect(executionReading('live', paper, { ...execution, totalTrades: 2 })).toMatchObject({ kind: 'live', trades: 2, isRunning: true })
  })
  it('is unknown until the mode is known', () => {
    expect(executionReading(null, paper, execution)).toEqual({ kind: 'unknown' })
  })
})

describe('patternFilterReading', () => {
  it('reports filtered_patterns as STOPPED, not passed', () => {
    expect(patternFilterReading(survival)).toEqual({ tracked: 4, stopped: 0 })
  })
})

describe('mechanismVerdict', () => {
  const edge = { edgePct: 19.95, direction: 'no', marketId: '0x1' } as EdgeRow
  it('is holding with the scanned count when the detector reports nothing', () => {
    const v = mechanismVerdict({ markets: { markets: [], count: 0, timestamp: 0 }, edges: { edges: [], count: 0, limit: 50, timestamp: 0 }, edgeRows: [], survival })
    expect(v.focus.kind).toBe('holding')
    expect(v.marketsScanned).toBe(0)
  })
  it('acts on the strongest edge when it clears the live threshold', () => {
    const v = mechanismVerdict({ markets: null, edges: { edges: [{}], count: 1, limit: 50, timestamp: 0 }, edgeRows: [edge, { ...edge, edgePct: 3 }], survival })
    expect(v.focus).toMatchObject({ kind: 'acting', edge: { edgePct: 19.95 } })
  })
  it('is unknown before the detector has answered', () => {
    expect(mechanismVerdict({ markets: null, edges: null, edgeRows: null, survival }).focus.kind).toBe('unknown')
  })
})
