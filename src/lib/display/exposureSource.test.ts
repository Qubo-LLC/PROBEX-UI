// The regression: the Overview's Exposure panel rendered
//   "0 of 10 max · Flat — no capital currently at risk"
// while the engine held three open positions. It read
// /api/stats.active_positions (the LIVE order-flow engine's count, correctly 0
// in paper mode) instead of the position ledger.
//
// "No capital currently at risk" is the single most dangerous sentence this
// cockpit can say incorrectly, so these tests pin the source rather than the
// number.

import { describe, it, expect } from 'vitest'
import { selectExposureSource } from './exposureSource'
import type { EnginePositions, EngineStats, ExecutionStatus } from '@/types/engine'

const positions = (count: number, unrealized = 0): EnginePositions => ({
  positions: Array.from({ length: count }, (_, i) => ({ market_id: `m${i}` })),
  count,
  totalUnrealizedPnl: unrealized,
  timestamp: 0,
})

const stats = (active: number, unrealized = 0): EngineStats =>
  ({ activePositions: active, unrealizedPnl: unrealized } as unknown as EngineStats)

const execution = (active: number): ExecutionStatus =>
  ({ activePositions: active } as unknown as ExecutionStatus)

describe('exposure comes from the position ledger', () => {
  it('is the exact regression: 3 open positions must not render as 0', () => {
    // The live capture on 2026-09-08:
    //   /api/positions.count                     3
    //   /api/stats.active_positions              0
    //   /api/execution/status.active_positions   0
    const v = selectExposureSource({
      positions:       positions(3),
      stats:           stats(0),
      executionStatus: execution(0),
    })

    expect(v.openPositions).toBe(3)
    expect(v.openPositions).not.toBe(0)
    expect(v.endpoint).toBe('/api/positions')
  })

  it('takes unrealized P&L from the same envelope as the count', () => {
    // A count from one endpoint beside a P&L from another can present a
    // combination neither surface ever reported.
    const v = selectExposureSource({
      positions:       positions(3, 12.5),
      stats:           stats(0, 99),
      executionStatus: execution(0),
    })
    expect(v.unrealizedPnl).toBe(12.5)
    expect(v.unrealizedPnl).not.toBe(99)
  })

  it('reports a genuine flat book as flat', () => {
    const v = selectExposureSource({
      positions:       positions(0),
      stats:           stats(0),
      executionStatus: execution(0),
    })
    expect(v.openPositions).toBe(0)
  })

  it('keeps the live execution count available, separately', () => {
    const v = selectExposureSource({
      positions:       positions(3),
      stats:           stats(0),
      executionStatus: execution(0),
    })
    expect(v.liveExecutionPositions).toBe(0)
    expect(v.openPositions).toBe(3)
  })

  it('reflects live positions when the engine IS trading live', () => {
    const v = selectExposureSource({
      positions:       positions(2),
      stats:           stats(2),
      executionStatus: execution(2),
    })
    expect(v.openPositions).toBe(2)
    expect(v.liveExecutionPositions).toBe(2)
  })
})

describe('withholding beats guessing', () => {
  it('reports null — never a stats-derived count — when the ledger is absent', () => {
    // A wrong count is worse than an absent one: "0 open positions" is an
    // assertion an operator acts on; a withheld value makes them look.
    const v = selectExposureSource({
      positions:       null,
      stats:           stats(0),
      executionStatus: execution(0),
    })
    expect(v.openPositions).toBeNull()
    expect(v.unrealizedPnl).toBeNull()
    expect(v.endpoint).toBeNull()
  })

  it('does not fall back even when stats reports a non-zero count', () => {
    const v = selectExposureSource({
      positions:       null,
      stats:           stats(7),
      executionStatus: execution(7),
    })
    expect(v.openPositions).toBeNull()
  })

  it('still reports the live count when only the ledger is missing', () => {
    const v = selectExposureSource({
      positions:       null,
      stats:           null,
      executionStatus: execution(4),
    })
    expect(v.liveExecutionPositions).toBe(4)
    expect(v.openPositions).toBeNull()
  })

  it('handles everything absent', () => {
    const v = selectExposureSource({ positions: null, stats: null, executionStatus: null })
    expect(v.openPositions).toBeNull()
    expect(v.liveExecutionPositions).toBeNull()
  })
})
