import { describe, it, expect } from 'vitest'
import { selectPerformanceSource } from './performanceSource'
import type { ExecutionStatus } from '@/types/engine'
import type { Runway } from '@/types/runway'
import { MOCK_RUNWAY } from '@/mock/runway'

// ─── Fixtures ────────────────────────────────────────────────────────────────
// Numbers are the real 2026-09-07 live capture, converted through the same DTO
// conventions the adapters apply (win_rate 74.6 → 0.746). They are used because
// they are the case that exposed the defect, not to pin the backend's contract.

/** The sleeve ledgers with the same totals as the 2026-09-07 capture: 59 settled
 *  (44 won, 15 lost), +22.38 realized, equity 122.38, 2 open. */
function paper(): Runway {
  return {
    ...MOCK_RUNWAY,
    sleeves: [{ ...MOCK_RUNWAY.sleeves[0]!, counts: { settled: 59, won: 44, lost: 15 } }],
    combined: { allocation: 100, cash: 117.38, equity: 122.38, openPositions: 2, openExposure: 5,
                realizedPnl: 22.38, unrealizedPnl: 0, drawdown: 0, reserve: 0 },
  }
}

function execution(over: Partial<ExecutionStatus> = {}): ExecutionStatus {
  return {
    available: true, mode: 'paper',
    totalTrades: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0,
    activePositions: 0, closedPositions: 0,
    avgExecutionMs: 0, fastestTradeMs: 0, slowestTradeMs: 0,
    balance: 100, balanceCacheAgeSec: 0,
    retryStats: { totalRetries: 0, successfulRetries: 0, failedAfterRetries: 0, networkErrors: 0, balanceErrors: 0, invalidOrderErrors: 0 },
    rateLimitBuckets: {
      market: { name: 'm', ratePerSec: 1, capacity: 1, currentTokens: 1, totalRequests: 0, totalWaits: 0, waitRatePct: 0, avgWaitMs: 0, totalWaitTimeMs: 0 },
      price:  { name: 'p', ratePerSec: 1, capacity: 1, currentTokens: 1, totalRequests: 0, totalWaits: 0, waitRatePct: 0, avgWaitMs: 0, totalWaitTimeMs: 0 },
      order:  { name: 'o', ratePerSec: 1, capacity: 1, currentTokens: 1, totalRequests: 0, totalWaits: 0, waitRatePct: 0, avgWaitMs: 0, totalWaitTimeMs: 0 },
    },
    backoff: { active: false, until: null, durationMs: 0, total429s: 0, recent429s5min: 0 },
    resolutionStats: { totalResolved: 0, wins: 0, losses: 0, autoClosed: 0, resolutionErrors: 0, trackedPositions: 0, isRunning: true },
    timestamp: 0,
    ...over,
  }
}

describe('paper mode', () => {
  it('reads the PAPER books, not the live execution surface', () => {
    const v = selectPerformanceSource({
      engineMode: 'paper', runway: paper(), executionStatus: execution(),
    })

    expect(v.provenance.surface).toBe('paper')
    expect(v.metrics?.totalPnl).toBe(22.38)
    expect(v.metrics?.totalTrades).toBe(59)
    expect(v.metrics?.winRate).toBeCloseTo(0.746)
  })

  it('is the exact regression: live zeros must not become the P&L figure', () => {
    // The defect. Both surfaces resolve; the live one reads all zeros because
    // no live order has been placed. The Overview printed that as "$0.00 total
    // P&L" while the Portfolio page showed +$22.38 from the paper surface.
    const v = selectPerformanceSource({
      engineMode: 'paper', runway: paper(), executionStatus: execution(),
    })
    expect(v.metrics?.totalPnl).not.toBe(0)
  })

  it('labels the figures as simulated — never as universal truth', () => {
    const v = selectPerformanceSource({
      engineMode: 'paper', runway: paper(), executionStatus: execution(),
    })
    expect(v.provenance.label).toBe('Paper, research sizing')
    expect(v.provenance.note).toMatch(/simulated/i)
    expect(v.provenance.note).toMatch(/no real capital/i)
  })

  it('keeps the live surface visible as a separate counterpart', () => {
    const v = selectPerformanceSource({
      engineMode: 'paper', runway: paper(), executionStatus: execution(),
    })
    expect(v.counterpart?.surface).toBe('live')
    expect(v.counterpart?.metrics.totalTrades).toBe(0)
    // Never merged into the selected figures.
    expect(v.metrics?.totalTrades).toBe(59)
  })

  it('does not cry wolf: an idle live surface is the expected state', () => {
    const v = selectPerformanceSource({
      engineMode: 'paper', runway: paper(), executionStatus: execution(),
    })
    expect(v.conflict).toBeNull()
  })

  it('DOES report a conflict when both surfaces claim to have traded', () => {
    const v = selectPerformanceSource({
      engineMode: 'paper',
      runway: paper(),
      executionStatus: execution({ totalTrades: 62, totalPnl: 0 }),
    })
    expect(v.conflict).toContain('59')
    expect(v.conflict).toContain('62')
    expect(v.conflict).toMatch(/do not agree/)
  })

  it('withholds figures when the paper surface has not resolved', () => {
    const v = selectPerformanceSource({
      engineMode: 'paper', runway: null, executionStatus: execution(),
    })
    // It must NOT silently fall back to the live surface's zeros.
    expect(v.metrics).toBeNull()
    expect(v.provenance.surface).toBe('unknown')
  })
})

describe('live mode', () => {
  it('reads the live execution surface', () => {
    const v = selectPerformanceSource({
      engineMode: 'live',
      runway: paper(),
      executionStatus: execution({ mode: 'live', totalTrades: 12, wins: 8, losses: 4, winRate: 0.667, totalPnl: 41.2 }),
    })
    expect(v.provenance.surface).toBe('live')
    expect(v.metrics?.totalPnl).toBe(41.2)
    expect(v.provenance.note).toMatch(/capital actually at risk/i)
  })

  it('demotes the paper books to counterpart — never blended in', () => {
    const v = selectPerformanceSource({
      engineMode: 'live',
      runway: paper(),
      executionStatus: execution({ mode: 'live', totalTrades: 12, totalPnl: 41.2 }),
    })
    expect(v.counterpart?.surface).toBe('paper')
    expect(v.metrics?.totalPnl).toBe(41.2)
  })

  it('withholds figures when the live surface has not resolved', () => {
    const v = selectPerformanceSource({
      engineMode: 'live', runway: paper(), executionStatus: null,
    })
    expect(v.metrics).toBeNull()
  })
})

describe('unconfirmed mode', () => {
  it('shows nothing rather than guessing which books to read', () => {
    const v = selectPerformanceSource({
      engineMode: null, runway: paper(), executionStatus: execution(),
    })
    expect(v.metrics).toBeNull()
    expect(v.counterpart).toBeNull()
    expect(v.provenance.endpoint).toBeNull()
  })

  it('does not infer the mode from which surface happens to have data', () => {
    // Paper has 59 trades and live has none — tempting, and wrong: inferring
    // mode from data is exactly the conflation this module removes.
    const v = selectPerformanceSource({
      engineMode: null, runway: paper(), executionStatus: execution(),
    })
    expect(v.provenance.surface).toBe('unknown')
  })
})

describe('provenance is always stated', () => {
  it.each([
    ['paper' as const, paper(), execution()],
    ['live'  as const, paper(), execution({ mode: 'live' })],
  ])('%s mode names its endpoint and carries a note', (mode, p, e) => {
    const v = selectPerformanceSource({ engineMode: mode, runway: p, executionStatus: e })
    expect(v.provenance.endpoint).toMatch(/^\/api\//)
    expect(v.provenance.label.length).toBeGreaterThan(0)
    expect(v.provenance.note.length).toBeGreaterThan(0)
  })
})
