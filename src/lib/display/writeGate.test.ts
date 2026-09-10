import { describe, it, expect } from 'vitest'
import { deriveWriteGate, type WriteGateInput } from './writeGate'

// The write gate is the only thing standing between a click and a real order
// when the engine is live, so it is tested exhaustively rather than
// representatively. Every case below is a state the engine can actually be in.

const input = (over: Partial<WriteGateInput> = {}): WriteGateInput => ({
  runtimeMode: 'live',
  engineMode: 'paper',
  liveTradingEnabled: false,
  ...over,
})

describe('deriveWriteGate', () => {
  it('permits writes only when paper mode is confirmed on BOTH signals', () => {
    const gate = deriveWriteGate(input())
    expect(gate.permitted).toBe(true)
    expect(gate.reason).toBe('permitted')
    expect(gate.detail).toBeNull()
  })

  it('blocks when the engine reports live execution mode', () => {
    const gate = deriveWriteGate(input({ engineMode: 'live' }))
    expect(gate.permitted).toBe(false)
    expect(gate.reason).toBe('live-mode')
  })

  it('blocks when the execution policy has live trading enabled', () => {
    const gate = deriveWriteGate(input({ liveTradingEnabled: true }))
    expect(gate.permitted).toBe(false)
    expect(gate.reason).toBe('live-trading-enabled')
  })

  it('blocks when the engine is unreachable', () => {
    const gate = deriveWriteGate(input({ runtimeMode: 'offline' }))
    expect(gate.permitted).toBe(false)
    expect(gate.reason).toBe('engine-unreachable')
  })

  // Fail-safe is the whole design. These two are the regression guard: an
  // unresolved slice must never read as permission.
  it('blocks while the execution mode is still unknown', () => {
    const gate = deriveWriteGate(input({ engineMode: null }))
    expect(gate.permitted).toBe(false)
    expect(gate.reason).toBe('unconfirmed')
  })

  it('blocks while the live-trading policy is still unknown', () => {
    const gate = deriveWriteGate(input({ liveTradingEnabled: null }))
    expect(gate.permitted).toBe(false)
    expect(gate.reason).toBe('unconfirmed')
  })

  it('never permits writes for any input that is not fully-confirmed paper', () => {
    const runtimeModes = ['live', 'mock', 'offline'] as const
    const engineModes = ['paper', 'live', null] as const
    const policies = [true, false, null] as const

    for (const runtimeMode of runtimeModes) {
      for (const engineMode of engineModes) {
        for (const liveTradingEnabled of policies) {
          const gate = deriveWriteGate({ runtimeMode, engineMode, liveTradingEnabled })
          const shouldPermit =
            runtimeMode !== 'offline' && engineMode === 'paper' && liveTradingEnabled === false
          expect(
            gate.permitted,
            `runtime=${runtimeMode} engine=${engineMode} livePolicy=${liveTradingEnabled}`,
          ).toBe(shouldPermit)
        }
      }
    }
  })

  it('reports a definite live engine as live, not as unconfirmed', () => {
    // Ordering matters for the operator: when both a definite block and a
    // missing reading apply, the actionable one must win.
    const gate = deriveWriteGate(input({ engineMode: 'live', liveTradingEnabled: null }))
    expect(gate.reason).toBe('live-mode')
  })

  it('always supplies an explanation when it blocks', () => {
    const blocked = [
      deriveWriteGate(input({ runtimeMode: 'offline' })),
      deriveWriteGate(input({ engineMode: 'live' })),
      deriveWriteGate(input({ liveTradingEnabled: true })),
      deriveWriteGate(input({ engineMode: null })),
    ]
    for (const gate of blocked) {
      expect(gate.detail).toBeTruthy()
      expect(gate.detail?.length).toBeGreaterThan(10)
    }
  })
})
