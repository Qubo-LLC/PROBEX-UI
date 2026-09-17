import { describe, it, expect } from 'vitest'
import { enginePosture, policyGroups, dataModeWord } from './settings'
import type { EngineConfig, ExecutionPolicy } from '@/types/engine'

/** The live /api/config of 2026-09-16, through the adapter. */
const CONFIG: EngineConfig = {
  environment: 'paper', anthropicApiKey: null, polymarketApiUrl: 'https://clob.polymarket.com', polygonChainId: 137,
  initialBankroll: 100, maxBetPercent: 20, maxConcurrentPositions: 10, minEdge: 2, kellyFraction: 0.5, maxLatencyMs: 100,
  dashboardUpdateIntervalMs: 500, dashboardApiEnabled: true, dashboardApiHost: '0.0.0.0', dashboardApiPort: 8000, logLevel: 'INFO',
  minEdgeYes: 4, minEdgeNo: 3, minVolume: 5, minAlignment: -0.5, blockedHours: [], edgeConfirmationCount: 1, earlyExitThreshold: -70,
  lowLiquidityStartHour: 0, lowLiquidityEndHour: 0,
}

const POLICY: ExecutionPolicy = {
  mode: 'paper', liveTradingEnabled: false, orderFlow: ['survival_brain_approval'], riskLimits: { maxConcurrentPositions: 10, maxBetPercent: 20, kellyFraction: 0.5, maxLatencyMs: 100, minimumOrderSizeUsd: 10 },
  orderTemplate: { side: 'BUY', orderType: 'GTC', priceBuffer: 0.01, tokenSelection: '', yesPrice: '', noPrice: '' }, knownLimitations: [], timestamp: 0,
}

describe('enginePosture', () => {
  it('states the environment and the live-trading flag in words, and that nothing here changes them', () => {
    const p = enginePosture(CONFIG, POLICY)
    expect(p.environment).toBe('paper')
    expect(p.liveTradingEnabled).toBe(false)
    expect(p.sentence).toBe('The engine runs in PAPER environment with live trading disabled. Its configuration is published read-only; nothing on this page changes it.')
  })
  it('shouts when live trading is enabled', () => {
    expect(enginePosture({ environment: 'live' }, { liveTradingEnabled: true }).sentence).toMatch(/LIVE environment with live trading ENABLED/)
  })
  it('does not guess before the engine answers', () => {
    expect(enginePosture(null, null).sentence).toBe('The engine has not yet reported its configuration.')
    expect(enginePosture(null, POLICY).sentence).toMatch(/^The engine runs in an unreported environment with live trading disabled/)
  })
})

describe('policyGroups', () => {
  it('counts every parameter the live engine reports', () => {
    const groups = policyGroups(CONFIG, POLICY)
    expect(groups.map((g) => [g.id, g.reported, g.parameters.length])).toEqual([
      ['thresholds', 10, 10], ['sizing', 4, 4], ['execution', 7, 7], ['runtime', 9, 9],
    ])
    // 24 parameters on /api/config: 10 + 4 + 1 (max_latency_ms) + 9.
    expect(groups.reduce((s, g) => s + g.reported, 0) - 6).toBe(24)
  })
  it('does not count a parameter the engine omitted', () => {
    const older = { ...CONFIG, minEdgeYes: null, minEdgeNo: null, blockedHours: null }
    expect(policyGroups(older, POLICY)[0]!.reported).toBe(7)
  })
  it('reports nothing before the endpoints answer', () => {
    expect(policyGroups(null, null).every((g) => g.reported === 0)).toBe(true)
  })
})

describe('dataModeWord', () => {
  it('has a word and a meaning for each runtime mode', () => {
    expect(dataModeWord('live').word).toBe('LIVE ENGINE')
    expect(dataModeWord('mock').tone).toBe('warning')
    expect(dataModeWord('offline').meaning).toMatch(/reload/)
  })
})
