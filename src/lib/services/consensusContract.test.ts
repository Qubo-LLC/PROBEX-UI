// Regression cover for the Strategy › Consensus page crash (2026-09-08).
//
// Reported as "the consensus layer hits a snag when users hover around it".
// It was not a hover bug: "This page hit a snag" is the route error boundary's
// own copy, and the page was crashing on render.
//
// Root cause: the engine renamed `btc_price` → `asset_price` on /api/consensus
// and /api/consensus/history when consensus went multi-asset (BTC/ETH/SOL).
// The DTO still declared `btc_price`, so the adapter produced
// `btcPrice: undefined`, and HistoricalSnapshots called
// `undefined.toLocaleString()`.
//
// TypeScript could not catch it — a hand-written DTO for an external payload
// typechecks `p.btc_price` as `number` no matter what the wire actually sends.
// So the guard has to be a test against the real payload shape, plus a nullable
// domain type that forces every consumer to handle absence.

import { describe, it, expect } from 'vitest'
import { toConsensus, toConsensusHistory } from './dto'
import type { ConsensusDTO, ConsensusHistoryDTO } from '@/types/engine'

/** The live payload shape, captured 2026-09-08. */
const LIVE_CONSENSUS = {
  available: true,
  consensus: {
    timestamp: '2026-09-07T22:30:06.470706',
    score: 0.531,
    confidence: 0.552,
    signal_count: 8,
    signals: {
      kalman_direction: 1, kalman_confidence: 1, bayesian_regime_bias: 0.2,
      edge_direction: 1, edge_confidence: 0.378,
      rsi_momentum: 0, macd_trend: 0, price_momentum: 0,
    },
    asset_price: 79057.9,
    asset_category: 'crypto',
    asset_symbol: 'BTC',
    interpretation: 'NEUTRAL',
  },
  timestamp: '2026-09-07T22:30:07Z',
} as unknown as ConsensusDTO

const LIVE_HISTORY = {
  available: true,
  history: [
    { timestamp: '2026-09-07T22:30:06.470706', score: 0.531, confidence: 0.552, asset_price: 79057.9, asset_category: 'crypto', asset_symbol: 'BTC' },
  ],
  timestamp: '2026-09-07T22:30:07Z',
} as unknown as ConsensusHistoryDTO

describe('/api/consensus — the multi-asset rename', () => {
  it('reads asset_price, which is what the engine actually sends', () => {
    const reading = toConsensus(LIVE_CONSENSUS).reading
    expect(reading?.assetPrice).toBe(79057.9)
    expect(reading?.assetSymbol).toBe('BTC')
  })

  it('is the exact crash: the price must not come back undefined', () => {
    const reading = toConsensus(LIVE_CONSENSUS).reading
    expect(reading?.assetPrice).not.toBeUndefined()
    // The failing call site was `value.toLocaleString()`.
    expect(() => reading!.assetPrice!.toLocaleString()).not.toThrow()
  })

  it('still accepts the legacy btc_price name', () => {
    const legacy = {
      ...LIVE_CONSENSUS,
      consensus: { ...LIVE_CONSENSUS.consensus, asset_price: undefined, btc_price: 65590.2 },
    } as unknown as ConsensusDTO
    expect(toConsensus(legacy).reading?.assetPrice).toBe(65590.2)
  })

  it('yields null — never 0 — when the engine sends neither', () => {
    // A missing price and a price of zero are different facts. Zero-filling
    // here is how "we do not know" becomes a number an operator reads.
    const missing = {
      ...LIVE_CONSENSUS,
      consensus: { ...LIVE_CONSENSUS.consensus, asset_price: undefined },
    } as unknown as ConsensusDTO
    expect(toConsensus(missing).reading?.assetPrice).toBeNull()
  })

  it('does not throw when the price is absent', () => {
    const missing = {
      ...LIVE_CONSENSUS,
      consensus: { ...LIVE_CONSENSUS.consensus, asset_price: undefined },
    } as unknown as ConsensusDTO
    expect(() => toConsensus(missing)).not.toThrow()
  })
})

describe('/api/consensus/history — the same rename', () => {
  it('reads asset_price per point', () => {
    const [p] = toConsensusHistory(LIVE_HISTORY).history
    expect(p?.assetPrice).toBe(79057.9)
    expect(p?.assetSymbol).toBe('BTC')
  })

  it('survives a point with no price at all', () => {
    const partial = {
      ...LIVE_HISTORY,
      history: [
        { timestamp: '2026-09-07T22:30:06Z', score: 0.5, confidence: 0.5 },
        ...LIVE_HISTORY.history,
      ],
    } as unknown as ConsensusHistoryDTO

    const out = toConsensusHistory(partial)
    expect(out.history[0]?.assetPrice).toBeNull()
    expect(out.history[1]?.assetPrice).toBe(79057.9)
    // Rendering the whole list must not depend on every point being complete.
    expect(() => out.history.map((p) => p.assetPrice?.toLocaleString() ?? '—')).not.toThrow()
  })

  it('never invents a symbol', () => {
    const noSymbol = {
      ...LIVE_HISTORY,
      history: [{ timestamp: '2026-09-07T22:30:06Z', score: 0.5, confidence: 0.5, asset_price: 100 }],
    } as unknown as ConsensusHistoryDTO
    expect(toConsensusHistory(noSymbol).history[0]?.assetSymbol).toBeNull()
  })
})
