import { describe, it, expect } from 'vitest'
import { scannerReading, emptyScanSentence } from './marketsLive'
import type { HealthComponent } from '@/types/engine'

const comp = (name: string, healthy: boolean, message: string): HealthComponent => ({ name, healthy, message, latencyMs: null, checkedAt: 0 })
const when = (ms: number) => `T${ms}`

describe('scannerReading', () => {
  it('reads only the main_loop component', () => {
    expect(scannerReading([comp('price_feed', true, 'ok'), comp('main_loop', true, 'Running (last heartbeat 0.0s ago)')])).toEqual({ kind: 'running', message: 'Running (last heartbeat 0.0s ago)' })
    expect(scannerReading([comp('main_loop', false, 'No heartbeat for 120s')])).toEqual({ kind: 'unhealthy', message: 'No heartbeat for 120s' })
  })
  it('does not infer the scanner from the overall status', () => {
    expect(scannerReading([comp('price_feed', true, 'ok')])).toEqual({ kind: 'unknown' })
    expect(scannerReading(null)).toEqual({ kind: 'unknown' })
  })
})

describe('emptyScanSentence', () => {
  it('states the fact, the scanner, and the archive as records', () => {
    expect(emptyScanSentence({ kind: 'running', message: '' }, { count: 19, newest: 5 }, when)).toBe(
      'The engine’s scan holds no market right now. Its scan loop reports itself running, so the list fills the moment the fetcher returns a qualifying market. The archive holds 19 recorded markets, the newest last seen T5 — records, not current markets.',
    )
  })
  it('says nothing about a record that has not answered', () => {
    expect(emptyScanSentence({ kind: 'unknown' }, null, when)).toBe('The engine’s scan holds no market right now.')
  })
  it('carries the scanner’s own problem message', () => {
    expect(emptyScanSentence({ kind: 'unhealthy', message: 'No heartbeat for 120s' }, { count: 0, newest: null }, when)).toBe(
      'The engine’s scan holds no market right now. Its scan loop reports a problem — No heartbeat for 120s — so the list may not fill until that clears. The archive holds no recorded market either.',
    )
  })
})
