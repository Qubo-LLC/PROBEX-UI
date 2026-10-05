import { describe, expect, it } from 'vitest'
import { deriveEngineFocus, blockReasons, isHaltedState, marketDataSignal } from './engineFocus'
import type { EdgeRow } from '@/lib/mappers/edges'
import type { SurvivalStatus } from '@/types/engine'

const edge = (edgePct: number): EdgeRow => ({
  id: 'm', marketId: 'm', marketTitle: 'Bitcoin Up or Down', direction: 'no', edgePct,
  kellySize: null, confidence: 0.71, signal: null, recommendation: null,
  detectedAt: 0, rsi: null, rsiSignal: null, macdTrend: null, alignmentScore: null,
})

const survival = (over: Partial<SurvivalStatus>): SurvivalStatus => ({
  currentCapital: 100, initialCapital: 100, capitalPct: 100, state: 'HEALTHY',
  dailyBurnRate: 0, daysOfRunway: null, recoveryTradesNeeded: 0, avgWinSize: 0,
  dailyTarget: 1, weeklyTarget: 5, dailyPnl: 0, weeklyPnl: 0, behindTargetPct: 0,
  kellyModifier: 1, minEdgeThreshold: 3, totalPatterns: 0, filteredPatterns: 0,
  timestamp: 0, patternsSummary: [], ...over,
})

describe('deriveEngineFocus', () => {
  it('healthy + edge above threshold → acting', () => {
    const s = deriveEngineFocus({ topEdge: edge(14.5), edgesKnown: true, survival: survival({}) })
    expect(s.kind).toBe('acting')
  })

  it('healthy + no edge → holding, not halted', () => {
    expect(deriveEngineFocus({ topEdge: null, edgesKnown: true, survival: survival({}) }))
      .toEqual({ kind: 'holding', halted: false, state: 'HEALTHY' })
  })

  it('edges unknown → unknown, regardless of survival', () => {
    expect(deriveEngineFocus({ topEdge: null, edgesKnown: false, survival: survival({ state: 'DEAD' }) }).kind)
      .toBe('unknown')
  })

  it('survival DEAD + candidate → blocked and halted, with all three reasons the live engine showed', () => {
    const s = deriveEngineFocus({
      topEdge: edge(14.5), edgesKnown: true,
      survival: survival({ state: 'DEAD', kellyModifier: 0, minEdgeThreshold: 999 }),
    })
    expect(s.kind).toBe('blocked')
    if (s.kind !== 'blocked') return
    expect(s.halted).toBe(true)
    expect(s.reasons.map((r) => r.kind)).toEqual(['halted', 'threshold', 'sizing'])
    expect(s.edge.edgePct).toBe(14.5) // the signal is preserved, not softened
  })

  it('survival DEAD + no candidate → holding, halted', () => {
    expect(deriveEngineFocus({ topEdge: null, edgesKnown: true, survival: survival({ state: 'DEAD' }) }))
      .toEqual({ kind: 'holding', halted: true, state: 'DEAD' })
  })

  it('healthy but edge below the brain\'s current threshold → blocked, not halted', () => {
    const s = deriveEngineFocus({ topEdge: edge(2.0), edgesKnown: true, survival: survival({ minEdgeThreshold: 3 }) })
    expect(s.kind).toBe('blocked')
    if (s.kind !== 'blocked') return
    expect(s.halted).toBe(false)
    expect(s.reasons).toEqual([{ kind: 'threshold', edgePct: 2.0, minEdge: 3 }])
  })

  it('degraded-but-trading (CRITICAL, kelly > 0, edge clears) → still acting; no state is invented', () => {
    const s = deriveEngineFocus({
      topEdge: edge(14.5), edgesKnown: true,
      survival: survival({ state: 'CRITICAL', kellyModifier: 0.25, minEdgeThreshold: 5 }),
    })
    expect(s.kind).toBe('acting')
  })

  it('survival unknown → the signal stands on its own', () => {
    expect(blockReasons(edge(14.5), null)).toEqual([])
    expect(deriveEngineFocus({ topEdge: edge(14.5), edgesKnown: true, survival: null }).kind).toBe('acting')
  })

  it('only DEAD is halted', () => {
    expect(isHaltedState('DEAD')).toBe(true)
    expect(isHaltedState('dead')).toBe(true)
    expect(isHaltedState('CRITICAL')).toBe(false)
    expect(isHaltedState(null)).toBe(false)
  })
})

describe('deriveEngineFocus — market data (remediation phase 2)', () => {
  // The exact production condition of 2026-09-24..26.
  const STALE_MSG = 'Market data stale (123857.8s old, 0 markets cached)'
  const staleHealth = { components: [
    { name: 'price_feed', healthy: true, message: 'Connected and receiving data' },
    { name: 'api_access', healthy: false, message: STALE_MSG },
  ] }

  it('stale market data + no edge → no-valid-markets, NOT holding', () => {
    const s = deriveEngineFocus({ topEdge: null, edgesKnown: true, survival: survival({}),
      marketData: marketDataSignal(staleHealth, 0) })
    expect(s).toEqual({ kind: 'no-valid-markets', cause: 'stale', message: STALE_MSG, halted: false })
  })

  it('fresh data but an empty scan → no-valid-markets (empty)', () => {
    const fresh = { components: [{ name: 'api_access', healthy: true, message: 'Market data fresh (2.1s old, 0 markets cached)' }] }
    expect(deriveEngineFocus({ topEdge: null, edgesKnown: true, survival: survival({}), marketData: marketDataSignal(fresh, 0) }).kind)
      .toBe('no-valid-markets')
  })

  it('fresh data with markets and no edge → holding (a real decision)', () => {
    const fresh = { components: [{ name: 'api_access', healthy: true, message: 'Market data fresh (2.1s old, 4 markets cached)' }] }
    expect(deriveEngineFocus({ topEdge: null, edgesKnown: true, survival: survival({}), marketData: marketDataSignal(fresh, 4) }).kind)
      .toBe('holding')
  })

  it('an edge measured on stale data is blocked, with the engine’s message', () => {
    const s = deriveEngineFocus({ topEdge: edge(14.5), edgesKnown: true, survival: survival({}),
      marketData: marketDataSignal(staleHealth, 3) })
    expect(s.kind).toBe('blocked')
    if (s.kind === 'blocked') expect(s.reasons[0]).toEqual({ kind: 'stale-market-data', message: STALE_MSG })
  })

  it('no market signal → previous behaviour unchanged', () => {
    expect(deriveEngineFocus({ topEdge: null, edgesKnown: true, survival: survival({}), marketData: null }).kind).toBe('holding')
    expect(marketDataSignal(null, null)).toBeNull()
  })

  it('edges not answered → unknown, even with stale data', () => {
    expect(deriveEngineFocus({ topEdge: null, edgesKnown: false, survival: survival({}), marketData: marketDataSignal(staleHealth, 0) }).kind)
      .toBe('unknown')
  })
})
