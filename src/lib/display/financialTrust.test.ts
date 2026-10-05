import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { countReentriesAfterSettlement, readFinancialTrust, suppressesTone } from './financialTrust'
import { naiveUtcToMs } from '@/lib/services/dto'

const t = (marketId: string, openedMin: number, closedMin: number) => ({
  marketId,
  openedAt: Date.UTC(2026, 8, 25, 12, openedMin),
  closedAt: Date.UTC(2026, 8, 25, 12, closedMin),
})

describe('countReentriesAfterSettlement', () => {
  it('is zero for one trade per market', () => {
    expect(countReentriesAfterSettlement([t('a', 0, 6), t('b', 1, 7)])).toBe(0)
  })

  it('counts every entry after the market first settled', () => {
    // the incident pattern: settle, re-enter immediately, again and again
    expect(countReentriesAfterSettlement([t('a', 0, 6), t('a', 6, 12), t('a', 12, 18)])).toBe(2)
  })

  it('does not count overlapping entries that opened before any settlement', () => {
    expect(countReentriesAfterSettlement([t('a', 0, 6), t('a', 2, 7)])).toBe(0)
  })

  it('is order-independent', () => {
    expect(countReentriesAfterSettlement([t('a', 12, 18), t('a', 0, 6), t('a', 6, 12)])).toBe(2)
  })
})

describe('readFinancialTrust', () => {
  it('never grants valid on its own — no evidence means null, not VALID', () => {
    expect(readFinancialTrust({ trades: [t('a', 0, 6)], sourceStatus: 'success' })).toBeNull()
  })

  it('flags impossible records as untrusted, and says it is a frontend check', () => {
    const r = readFinancialTrust({ trades: [t('a', 0, 6), t('a', 6, 12)], sourceStatus: 'success' })
    expect(r?.state).toBe('untrusted')
    expect(r?.basis).toBe('frontend-check')
    expect(r?.detail).toMatch(/1 of the 2 most recent/)
    expect(r?.detail).toMatch(/engine does not yet report integrity/)
  })

  it('reports an unavailable source', () => {
    expect(readFinancialTrust({ trades: null, sourceStatus: 'error' })?.state).toBe('unavailable')
  })

  it('defers to the engine once it reports integrity', () => {
    const r = readFinancialTrust({
      trades: [],
      sourceStatus: 'success',
      engineIntegrity: { state: 'INVALID', violations: [{ code: 'ENTERED_AFTER_CLOSE', count: 498 }] },
    })
    expect(r).toMatchObject({ state: 'invalid', basis: 'engine' })
    expect(r?.detail).toMatch(/entered after close \(498\)/)
  })

  it('only the engine can say valid', () => {
    expect(readFinancialTrust({ trades: [], sourceStatus: 'success', engineIntegrity: { state: 'VALID', violations: [] } })?.state).toBe('valid')
  })

  it('suppresses gain/loss colour for untrusted, invalid and unavailable only', () => {
    expect(suppressesTone(null)).toBe(false)
    expect(suppressesTone({ state: 'untrusted', basis: 'frontend-check', headline: '', detail: '' })).toBe(true)
    expect(suppressesTone({ state: 'valid', basis: 'engine', headline: '', detail: '' })).toBe(false)
  })
})

// Read-only replay of the preserved forensic capture (docs/forensics, checksummed).
const CAPTURE = join(process.cwd(), 'docs/forensics/2026-09-24T2214Z/api/trades_ledger_limit_500.json')

describe.skipIf(!existsSync(CAPTURE))('preserved 2026-09-24 capture', () => {
  it('finds the same 496 re-entries the engine-side check finds', () => {
    const { ledger } = JSON.parse(readFileSync(CAPTURE, 'utf8')) as {
      ledger: { market_id: string; opened_at: string; closed_at: string }[]
    }
    const trades = ledger.map((r) => ({
      marketId: r.market_id,
      openedAt: naiveUtcToMs(r.opened_at),
      closedAt: naiveUtcToMs(r.closed_at),
    }))
    expect(trades).toHaveLength(500)
    expect(countReentriesAfterSettlement(trades)).toBe(496)
    expect(readFinancialTrust({ trades, sourceStatus: 'success' })?.state).toBe('untrusted')
  })
})
