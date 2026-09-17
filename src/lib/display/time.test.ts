import { describe, it, expect } from 'vitest'
import { clockOrDate, stamp, formatSeconds, sameLocalDay } from './time'

// A fixed "now" in local time, and points on the same day and three days back.
const NOW = new Date(2026, 8, 17, 19, 30, 0).getTime()
const TODAY_0231 = new Date(2026, 8, 17, 2, 31, 45).getTime()
const SUNDAY_0231 = new Date(2026, 8, 14, 2, 31, 45).getTime()

describe('clockOrDate', () => {
  it('prints only the clock for a record from today', () => {
    const s = clockOrDate(TODAY_0231, NOW)
    expect(s).toMatch(/02:31/)
    expect(s).not.toMatch(/Sep/)
  })
  it('puts the date in front once the record is not today', () => {
    const s = clockOrDate(SUNDAY_0231, NOW)
    expect(s).toMatch(/^Sep 14 · /)
    expect(s).toMatch(/02:31/)
  })
  it('carries seconds only when asked', () => {
    expect(clockOrDate(SUNDAY_0231, NOW)).not.toMatch(/:45/)
    expect(clockOrDate(SUNDAY_0231, NOW, { seconds: true })).toMatch(/02:31:45/)
  })
})

describe('stamp', () => {
  it('is always dated', () => {
    expect(stamp(TODAY_0231)).toMatch(/Sep 17.*02:31/)
  })
})

describe('formatSeconds', () => {
  it('reads as the ledgers do', () => {
    expect(formatSeconds(42)).toBe('42s')
    expect(formatSeconds(974)).toBe('16m')
    expect(formatSeconds(8_040)).toBe('2h 14m')
  })
})

describe('sameLocalDay', () => {
  it('compares calendar days, not 24-hour spans', () => {
    expect(sameLocalDay(new Date(2026, 8, 17, 0, 1), new Date(2026, 8, 17, 23, 59))).toBe(true)
    expect(sameLocalDay(new Date(2026, 8, 17, 23, 59), new Date(2026, 8, 18, 0, 1))).toBe(false)
  })
})
