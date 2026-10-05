import { describe, expect, it } from 'vitest'
import { formatPriceChangePct, withChangeWindow } from './priceHistory'

const pt = (s: number) => ({ ts: Date.UTC(2026, 8, 25, 9, 49, 0) + s * 1000, price: 84603 })

describe('withChangeWindow', () => {
  it('states the window the change covers — the observed engine buffer is seconds long', () => {
    expect(withChangeWindow(formatPriceChangePct(0), [pt(3), pt(24)])).toBe('+0.00% · 21s')
  })

  it('minutes and hours', () => {
    expect(withChangeWindow('+0.10%', [pt(0), pt(600)])).toBe('+0.10% · 10m')
    expect(withChangeWindow('-1.20%', [pt(0), pt(3900)])).toBe('-1.20% · 1h 5m')
  })

  it('no window to state with fewer than two points', () => {
    expect(withChangeWindow('+0.00%', [pt(0)])).toBe('+0.00%')
  })
})
