import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { appendOlderPage, describeSummaryScope, toLedgerItem, toLedgerPage } from './ledger'
import {
  canLoadMoreCapped, describePaging, openedAfterClose, relationshipFor, searchLoaded, statusLabel,
} from '@/lib/display/ledgerView'
import type { LedgerItemDTO, LedgerPageDTO } from '@/types/ledger'

const settledDTO = (over: Partial<LedgerItemDTO> = {}): LedgerItemDTO => ({
  market_id: '0xabc', direction: 'YES', size: 10, entry_price: 0.42, exit_price: 1, pnl: 13.8,
  pnl_percent: 138.1, edge_pct: 3.2, hold_time_seconds: 390, opened_at: '2026-10-01T12:00:00',
  closed_at: '2026-10-01T12:06:30', won: true, asset_category: 'crypto', asset_symbol: 'BTC',
  duration_minutes: 5, ...over,
})

// Shape of the ENGINE BRANCH response (tests/remediation/test_ledger.py covers the producer).
const branchPage = (over: Partial<LedgerPageDTO> = {}): LedgerPageDTO => ({
  available: true, mode: 'paper', durable: true, count: 2, total: 5, limit: 2, has_more: true, next_before_seq: 3,
  ledger: [
    settledDTO({ seq: 4, trade_id: 'PAPER_20261001_0005', status: 'settled', session_id: 'paper-A',
      execution_model: 'simulated_instant_full_fill', market_closes_at: '2026-10-01T12:05:00+00:00',
      resolution_source: 'venue_final', shares: 23.8, confidence: 0.8, market_question: 'Bitcoin Up or Down' }),
    settledDTO({ seq: 3, trade_id: 'PAPER_20261001_0004', status: 'settled', won: false, exit_price: 0, pnl: -10, pnl_percent: -100 }),
  ],
  summary: { total_pnl: 3.8, wins: 4, losses: 1, win_rate: 80, total_trades: 5, settled: 5, open: 0,
    realized_pnl: 3.8, volume_usd: 50, open_exposure_usd: 0, all_values_finite: true },
  summary_scope: { population: 'all records matching filters in the current session (not the page)',
    session_id: 'paper-A', filters: {}, from: '2026-10-01T11:00:00', to: '2026-10-01T12:06:30', count: 5, as_of: '2026-10-01T12:10:00' },
  timestamp: '2026-10-01T12:10:00',
  ...over,
})

describe('toLedgerPage — engine branch (cursor) contract', () => {
  it('detects cursor paging and a population-scoped summary', () => {
    const page = toLedgerPage(branchPage())
    expect(page.supportsCursor).toBe(true)
    expect(page.paging).toEqual({ kind: 'cursor', total: 5, hasMore: true, nextBeforeSeq: 3 })
    expect(page.summaryScope).toMatchObject({ kind: 'population', sessionId: 'paper-A', count: 5 })
    expect(page.summary).toMatchObject({ wins: 4, losses: 1, winRate: 0.8, volumeUsd: 50 })
  })

  it('maps recorded provenance', () => {
    const item = toLedgerPage(branchPage()).items[0]!
    expect(item).toMatchObject({
      seq: 4, tradeId: 'PAPER_20261001_0005', status: 'settled', sessionId: 'paper-A',
      executionModel: 'simulated_instant_full_fill', resolutionSource: 'venue_final', entryPriceCents: 42,
    })
    expect(item.marketClosesAt).toBe(Date.UTC(2026, 9, 1, 12, 5))
  })

  it('keeps a loss exit price of 0', () => {
    expect(toLedgerPage(branchPage()).items[1]!.exitPriceCents).toBe(0)
  })

  it('maps an open trade with nothing invented', () => {
    const item = toLedgerItem(settledDTO({ status: 'open', closed_at: null, exit_price: null, pnl: null, pnl_percent: null, won: null }))
    expect(item).toMatchObject({ status: 'open', exitPriceCents: null, pnl: null, pnlFraction: null, won: null, closedAt: null })
  })
})

describe('toLedgerPage — deployed (capped) contract', () => {
  it('detects capped paging and a PAGE-scoped summary', () => {
    const page = toLedgerPage({ available: true, count: 1, ledger: [settledDTO()], timestamp: '2026-09-24T22:14:00',
      summary: { total_pnl: 13.8, wins: 1, losses: 0, win_rate: 100 } })
    expect(page.supportsCursor).toBe(false)
    expect(page.paging).toEqual({ kind: 'capped', returned: 1, requestedLimit: null })
    expect(page.summaryScope).toEqual({ kind: 'page', count: 1 })
    expect(describeSummaryScope(page.summaryScope)).toMatch(/only the 1 records in this response/)
  })

  it('uses the limit the client sent when the engine does not echo one', () => {
    // regression: the deployed /trades/ledger has no `limit` field, which hid
    // the "load all retrievable" control
    const page = toLedgerPage({ available: true, count: 1, ledger: [settledDTO()], timestamp: '2026-09-24T22:14:00' }, { requestedLimit: 100 })
    expect(page.paging).toEqual({ kind: 'capped', returned: 1, requestedLimit: 100 })
    const full = toLedgerPage({ available: true, count: 100, ledger: Array.from({ length: 100 }, () => settledDTO()), timestamp: '2026-09-24T22:14:00' }, { requestedLimit: 100 })
    expect(canLoadMoreCapped(full.paging, 524)).toBe(true)
  })

  it('leaves fields the deployed engine does not send as null', () => {
    const item = toLedgerItem(settledDTO())
    for (const key of ['seq', 'tradeId', 'sessionId', 'resolutionSource', 'marketClosesAt', 'executionModel', 'shares'] as const) {
      expect(item[key]).toBeNull()
    }
  })

  it('does not infer a loss exit price the deployed engine nulled', () => {
    expect(toLedgerItem(settledDTO({ won: false, exit_price: null, pnl: -10 })).exitPriceCents).toBeNull()
  })

  const CAPTURE = join(process.cwd(), 'docs/forensics/2026-09-24T2214Z/api/trades_ledger_limit_500.json')
  it.skipIf(!existsSync(CAPTURE))('maps the preserved production capture', () => {
    const page = toLedgerPage(JSON.parse(readFileSync(CAPTURE, 'utf8')) as LedgerPageDTO)
    expect(page.items).toHaveLength(500)
    expect(page.paging.kind).toBe('capped')
    expect(page.summaryScope).toEqual({ kind: 'page', count: 500 })
    expect(page.items.every((i) => i.status === 'settled')).toBe(true)
  })
})

describe('appendOlderPage — stable under new records', () => {
  it('never duplicates a seq when a newer page overlaps', () => {
    const first = toLedgerPage(branchPage()).items                       // seq 4, 3
    const older = toLedgerPage(branchPage({ ledger: [settledDTO({ seq: 3 }), settledDTO({ seq: 2 }), settledDTO({ seq: 1 })] })).items
    expect(appendOlderPage(first, older).map((i) => i.seq)).toEqual([4, 3, 2, 1])
  })
})

describe('describePaging', () => {
  it('cursor: states loaded of total', () => {
    expect(describePaging({ kind: 'cursor', total: 524, hasMore: true, nextBeforeSeq: 423 }, 101, 524))
      .toBe('Showing 101 of 524 records, newest first')
    expect(describePaging({ kind: 'cursor', total: 524, hasMore: false, nextBeforeSeq: null }, 524, 524)).toBe('All 524 records loaded')
  })

  it('capped: never calls the page a total, and states the unreachable remainder', () => {
    const text = describePaging({ kind: 'capped', returned: 500, requestedLimit: 500 }, 500, 524)
    expect(text).toContain('Showing the 500 most recent records')
    expect(text).toContain('24 older are not retrievable')
    expect(text).not.toMatch(/total/i)
  })

  it('offers one wider request only when it can return more', () => {
    expect(canLoadMoreCapped({ kind: 'capped', returned: 100, requestedLimit: 100 }, 524)).toBe(true)
    expect(canLoadMoreCapped({ kind: 'capped', returned: 500, requestedLimit: 500 }, 524)).toBe(false)
    expect(canLoadMoreCapped({ kind: 'capped', returned: 40, requestedLimit: 100 }, 40)).toBe(false)
  })
})

describe('relationshipFor — trade → order → fill → position → settlement → P&L', () => {
  it('paper: states order and fill as NOT modelled, never invents them', () => {
    const steps = relationshipFor(toLedgerPage(branchPage()).items[0]!)
    expect(steps.map((s) => s.step)).toEqual(['Trade', 'Order', 'Fill', 'Position', 'Settlement', 'P&L'])
    expect(steps.find((s) => s.step === 'Order')?.status).toBe('not-modelled')
    expect(steps.find((s) => s.step === 'Fill')?.status).toBe('not-modelled')
    expect(steps.find((s) => s.step === 'Settlement')?.text).toMatch(/venue/)
  })

  it('legacy record: says the resolution source was not recorded', () => {
    const steps = relationshipFor(toLedgerItem(settledDTO()))
    expect(steps.find((s) => s.step === 'Settlement')?.text).toMatch(/not recorded/)
    expect(steps.find((s) => s.step === 'Trade')?.text).toMatch(/No trade id/)
  })

  it('open trade: settlement and P&L pending', () => {
    const steps = relationshipFor(toLedgerItem(settledDTO({ status: 'open', closed_at: null, pnl: null, won: null, exit_price: null, pnl_percent: null })))
    expect(steps.slice(-2).map((s) => s.status)).toEqual(['pending', 'pending'])
  })
})

describe('record-level checks', () => {
  it('openedAfterClose uses only the recorded close time', () => {
    expect(openedAfterClose(toLedgerItem(settledDTO()))).toBeNull()
    expect(openedAfterClose(toLedgerItem(settledDTO({ market_closes_at: '2026-10-01T11:59:00+00:00' })))).toBe(true)
    expect(openedAfterClose(toLedgerItem(settledDTO({ market_closes_at: '2026-10-01T12:05:00+00:00' })))).toBe(false)
  })

  it('statusLabel and search', () => {
    const items = toLedgerPage(branchPage()).items
    expect(items.map(statusLabel)).toEqual(['Settled · won', 'Settled · lost'])
    expect(searchLoaded(items, '0005')).toHaveLength(1)
    expect(searchLoaded(items, 'btc')).toHaveLength(2)
    expect(searchLoaded(items, '')).toHaveLength(2)
  })
})

describe('relationshipFor — engine mode fallback (deployed contract has no per-record mode)', () => {
  it('a legacy record from a paper engine is described as simulated, not as a missing order', () => {
    const legacy = toLedgerItem(settledDTO())          // no mode, no execution_model
    expect(relationshipFor(legacy).find((s) => s.step === 'Order')?.status).toBe('not-reported')
    const steps = relationshipFor(legacy, 'paper')
    expect(steps.find((s) => s.step === 'Order')?.status).toBe('not-modelled')
    expect(steps.find((s) => s.step === 'Fill')?.text).toMatch(/instant full fill/)
  })

  it('a record’s own mode wins over the engine mode', () => {
    const live = toLedgerItem(settledDTO({ mode: 'live', order_id: '0xorder' }))
    expect(relationshipFor(live, 'paper').find((s) => s.step === 'Order')).toEqual({ step: 'Order', status: 'recorded', text: '0xorder' })
  })
})

describe('outcome — the engine reports it; the UI never turns a push into a loss', () => {
  it('maps the reported outcome and labels a push as a push', () => {
    const push = toLedgerItem(settledDTO({ won: null, outcome: 'PUSH', pnl: 0, pnl_percent: 0 }))
    expect(push.outcome).toBe('PUSH')
    expect(statusLabel(push)).toBe('Settled · push')
  })

  it('keeps won/lost wording where the engine says WIN / LOSS', () => {
    expect(statusLabel(toLedgerItem(settledDTO({ outcome: 'WIN' })))).toBe('Settled · won')
    expect(statusLabel(toLedgerItem(settledDTO({ won: false, outcome: 'LOSS' })))).toBe('Settled · lost')
  })

  it('deployed engine (no outcome field): outcome stays null', () => {
    expect(toLedgerItem(settledDTO()).outcome).toBeNull()
  })
})
