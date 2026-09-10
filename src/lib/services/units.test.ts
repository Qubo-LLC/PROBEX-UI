// Unit-convention regression tests.
//
// ─── Why these exist ─────────────────────────────────────────────────────────
// Two of the three unit defects found in the 2026-09-07 audit were invisible
// because the live value was ZERO, and zero is identical under both
// conventions. `/api/execution/status` reported win_rate 0 in paper mode, and
// every /api/performance/by-category bucket was empty — so a fraction and a
// percentage could not be told apart, and an adapter comment claiming "0–1
// confirmed against the live payload" was written on that evidence.
//
// A zero cannot confirm a unit. These tests assert with a value that CAN
// distinguish them, which is the only kind of evidence that settles it.

import { describe, it, expect } from 'vitest'
import { toExecutionStatus, toPaperStats, toPaperStatus, toMarketDetail, toMarketDetailItem } from './dto'
import { toPerformanceByCategory } from './quantDto'
import type { ExecutionStatusDTO, PaperStatsDTO, PaperStatusDTO, MarketDetailDTO } from '@/types/engine'
import type { PerformanceByCategoryDTO } from '@/types/quant'

// A win rate that is unambiguous: 74.6 as a percentage is 0.746 as a fraction,
// and 74.6 read as a fraction would render as 7460%.
const WIRE_WIN_RATE = 74.6
const AS_FRACTION   = 0.746

describe('win_rate is a percentage on every surface', () => {
  it('/api/execution/status normalises to 0–1', () => {
    const dto = {
      available: true, mode: 'live',
      status: {
        total_trades: 12, wins: 9, losses: 3, win_rate: WIRE_WIN_RATE, total_pnl: 41.2,
        active_positions: 1, closed_positions: 11,
        avg_execution_ms: 120, fastest_trade_ms: 90, slowest_trade_ms: 300,
        balance: 141.2, balance_cache_age_sec: 0,
        retry_stats: { total_retries: 0, successful_retries: 0, failed_after_retries: 0, network_errors: 0, balance_errors: 0, invalid_order_errors: 0 },
        rate_limiting: {
          buckets: {
            market: { name: 'm', rate_per_sec: 1, capacity: 1, current_tokens: 1, total_requests: 0, total_waits: 0, wait_rate_pct: 0, avg_wait_ms: 0, total_wait_time_ms: 0 },
            price:  { name: 'p', rate_per_sec: 1, capacity: 1, current_tokens: 1, total_requests: 0, total_waits: 0, wait_rate_pct: 0, avg_wait_ms: 0, total_wait_time_ms: 0 },
            order:  { name: 'o', rate_per_sec: 1, capacity: 1, current_tokens: 1, total_requests: 0, total_waits: 0, wait_rate_pct: 0, avg_wait_ms: 0, total_wait_time_ms: 0 },
          },
          backoff: { active: false, until: null, duration_ms: 0, total_429s: 0, recent_429s_5min: 0 },
        },
        resolution_stats: { total_resolved: 11, wins: 9, losses: 2, auto_closed: 0, resolution_errors: 0, tracked_positions: 1, is_running: true },
      },
      timestamp: '2026-09-07T20:00:00Z',
    } as unknown as ExecutionStatusDTO

    expect(toExecutionStatus(dto).winRate).toBeCloseTo(AS_FRACTION)
  })

  it('/api/performance/by-category normalises to 0–1', () => {
    const dto: PerformanceByCategoryDTO = {
      available: true,
      categories: {
        crypto: {
          edges_detected: 400, trades_taken: 59, wins: 44, losses: 15,
          total_pnl: 22.38, win_rate: WIRE_WIN_RATE, avg_edge_pct: 23.08,
          active_positions: 3, closed_positions: 56,
        },
      },
      total_categories: 1,
      timestamp: '2026-09-07T20:00:00Z',
    }

    const bucket = toPerformanceByCategory(dto).buckets.find((b) => b.key === 'crypto')
    expect(bucket?.winRate).toBeCloseTo(AS_FRACTION)
    // Guard the specific rendering failure: formatPercent multiplies by 100.
    expect((bucket?.winRate ?? 0) * 100).toBeLessThan(101)
  })

  it('/api/paper-stats and /api/paper/status agree with each other', () => {
    const stats = {
      available: true,
      paper_trading: {
        session_start: '2026-09-07T13:21:12Z', initial_capital: 100, current_capital: 122.38,
        total_trades: 59, wins: 44, losses: 15, pushes: 0, pending: 2,
        total_pnl: 22.38, win_rate: WIRE_WIN_RATE,
        avg_win: 0, avg_loss: 0, largest_win: 0, largest_loss: 0,
        survival_states: [], edge_buckets: {}, hourly_performance: {},
      },
      timestamp: '2026-09-07T20:00:00Z',
    } as unknown as PaperStatsDTO

    const status: PaperStatusDTO = {
      available: true, enabled: true, pending_trades: 2, completed_trades: 59,
      total_pnl: 22.38, win_rate: WIRE_WIN_RATE, timestamp: '2026-09-07T20:00:00Z',
    }

    expect(toPaperStats(stats).paperTrading.winRate).toBeCloseTo(AS_FRACTION)
    expect(toPaperStatus(status).winRate).toBeCloseTo(AS_FRACTION)
  })
})

describe('/api/paper/status no longer drops confirmed fields', () => {
  it('carries total_pnl and win_rate through to the domain type', () => {
    const dto: PaperStatusDTO = {
      available: true, enabled: true, pending_trades: 2, completed_trades: 59,
      total_pnl: 22.38, win_rate: WIRE_WIN_RATE, timestamp: '2026-09-07T20:00:00Z',
    }
    const out = toPaperStatus(dto)
    expect(out.totalPnl).toBe(22.38)
    expect(out.winRate).toBeCloseTo(AS_FRACTION)
  })
})

describe('/api/markets/:market_id', () => {
  const base: MarketDetailDTO = {
    available: true,
    market: {
      id: '0xabc', question: 'Bitcoin Up or Down - September 7, 9:20AM-9:25AM ET',
      baseline_price: 79619.1, baseline_price_source: 'feed',
      yes_token_id: 'y', no_token_id: 'n',
      yes_price: 0.725, no_price: 0.275,
      created_at: '2026-09-06T14:51:07Z',
      closes_at: '2026-09-07T13:25:00Z',
      volume: 744.598421, duration_minutes: 5,
      market_tier: 1, asset_category: 'crypto',
    },
    history: [
      { timestamp: '2026-09-07T20:11:39Z', market_id: '0xabc', question: 'q', yes_price: 0.725, no_price: 0.275, volume: 744.6, btc_price: 79238.5, baseline_price: 79619.1, edge_pct: null, duration_minutes: 5 },
      { timestamp: '2026-09-07T20:11:29Z', market_id: '0xabc', question: 'q', yes_price: 0.72,  no_price: 0.28,  volume: 744.6, btc_price: 79238.5, baseline_price: 79619.1, edge_pct: 12.4, duration_minutes: 5 },
    ],
    history_count: 2,
    timestamp: '2026-09-07T20:11:49Z',
  }

  // closes_at is 2026-09-07T13:25Z. The engine kept serving this market from
  // cache for ~7 hours past its close with no staleness field of its own.
  const AFTER_CLOSE  = Date.parse('2026-09-07T20:11:49Z')
  const BEFORE_CLOSE = Date.parse('2026-09-07T13:00:00Z')

  it('sorts history oldest-first for charting, as the wire is newest-first', () => {
    const history = toMarketDetail(base, AFTER_CLOSE).history
    expect(history[0]!.ts).toBeLessThan(history[1]!.ts)
  })

  it('derives hasClosed from closes_at — the only confirmed staleness signal', () => {
    expect(toMarketDetail(base, AFTER_CLOSE).market.hasClosed).toBe(true)
    expect(toMarketDetail(base, BEFORE_CLOSE).market.hasClosed).toBe(false)
    expect(toMarketDetailItem(base.market, AFTER_CLOSE).hasClosed).toBe(true)
  })

  it('never claims a market has closed when the date is unparseable', () => {
    const bad = { ...base.market, closes_at: 'not-a-date' }
    expect(toMarketDetailItem(bad, AFTER_CLOSE).hasClosed).toBe(false)
  })

  it('maps asset_category and market_tier, which the list mapper dropped', () => {
    const m = toMarketDetail(base).market
    expect(m.assetCategory).toBe('crypto')
    expect(m.marketTier).toBe(1)
  })
})
