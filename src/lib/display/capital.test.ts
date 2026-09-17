import { describe, it, expect } from 'vitest'
import { capitalMovements, reconcile } from './capital'
import type { SettledTrade } from '@/types/engine'

function trade(over: Partial<SettledTrade>): SettledTrade {
  return {
    marketId: '0x1', direction: 'yes', size: 18, entryPrice: 0.5, exitPrice: 100, pnl: 0, pnlPercent: 0, edgePct: 10,
    holdTimeSeconds: 60, openedAt: 0, closedAt: 0, won: true, assetCategory: 'crypto', assetSymbol: 'BTC', durationMinutes: 5, ...over,
  }
}

// The live ledger of 2026-09-16 in the order the wire sent it (newest first),
// with P&L rounded to the cent — so the fixture's own sum, not the engine's
// unrounded $2,165.50, is the balance these tests check against.
const LIVE: SettledTrade[] = [
  trade({ pnl: -754.9201, closedAt: 10 }), trade({ pnl: -427.0894, closedAt: 9 }), trade({ pnl: -427.0894, closedAt: 8 }),
  trade({ pnl: 2736.536, closedAt: 7 }), trade({ pnl: -667.33, closedAt: 6 }), trade({ pnl: -667.33, closedAt: 5 }),
  trade({ pnl: -667.33, closedAt: 4 }), trade({ pnl: -667.33, closedAt: 3 }), trade({ pnl: 25.37, closedAt: 2 }), trade({ pnl: 3582, closedAt: 1 }),
]
const SUM = LIVE.reduce((a, t) => a + t.pnl, 0)
const END = 100 + SUM

describe('capitalMovements', () => {
  it('walks the balance forward in settlement order and returns newest first', () => {
    const m = capitalMovements(100, LIVE)
    expect(m[m.length - 1]!.balanceAfter).toBeCloseTo(3682, 2)          // after the first settlement
    expect(m[0]!.balanceAfter).toBeCloseTo(END, 6)                       // after the last
    expect(m.map((x) => x.trade.closedAt)).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
    // The peak the snapshot series reports (3,774.60) is the balance after the big win.
    expect(Math.max(...m.map((x) => x.balanceAfter))).toBeCloseTo(3774.6, 1)
  })
  it('leaves the input untouched', () => {
    const copy = [...LIVE]
    capitalMovements(100, LIVE)
    expect(LIVE).toEqual(copy)
  })
})

describe('reconcile', () => {
  it('reconciles the live ledger against the reported balance to the cent', () => {
    expect(reconcile(100, LIVE, END, 10)).toMatchObject({ kind: 'reconciles', endsAt: expect.closeTo(END, 6) })
    // A cent of rounding is within tolerance; more is not.
    expect(reconcile(100, LIVE, END + 0.004, 10).kind).toBe('reconciles')
    expect(reconcile(100, LIVE, END + 0.02, 10).kind).toBe('differs')
  })
  it('states the gap when the ledger and the balance disagree', () => {
    const r = reconcile(100, LIVE, END + 34.5, 10)
    expect(r.kind).toBe('differs')
    if (r.kind === 'differs') expect(r.gap).toBeCloseTo(34.5, 6)
  })
  it('refuses to claim a check when the ledger page is capped', () => {
    expect(reconcile(100, LIVE, END, 12)).toEqual({ kind: 'incomplete', shown: 10, total: 12 })
  })
})
