// Mock /api/runway and /api/runway/live for development and tests. Shapes follow
// the engine's src/runway.py; values are illustrative only.

import { toRunway, toRunwayLive } from '@/lib/services/runwayDto'
import type { RunwayDTO, RunwayLiveDTO } from '@/types/runway'

const T0 = 1792420200

export const MOCK_RUNWAY_DTO: RunwayDTO = {
  generated_at: T0 + 3600,
  source: 'sleeve ledgers (data/sleeves)',
  label: 'paper, research sizing',
  sleeves: {
    CRYPTO: {
      sleeve_id: 'CRYPTO', allocation: 100, cash: 97.5, equity: 100, open_positions: 1, open_exposure: 2.5,
      realized_pnl: 0, unrealized_pnl: 0, high_water_mark: 103, drawdown: 3, drawdown_pct_of_allocation: 3,
      reserve: 0, halt: { state: 'ALIVE', halted: false, reason: null, since: null },
      counts: { opened: 3, settled: 2, won: 1, lost: 1 }, rejections: {},
      positions: [{ position_id: 'C1', market_id: 'btc-5m-1792420800', token: 'up', direction: 'YES', shares: 5,
                    price: 0.5, fee_per_share: 0, opened_at: T0 + 640, strategy_id: 'p2_maker', sizing: 'research',
                    mark: null }],
      has_research_positions: true,
    },
    EVENTS: {
      sleeve_id: 'EVENTS', allocation: 100, cash: 100, equity: 100, open_positions: 0, open_exposure: 0,
      realized_pnl: 0, unrealized_pnl: 0, high_water_mark: 100, drawdown: 0, drawdown_pct_of_allocation: 0,
      reserve: 0, halt: { state: 'ALIVE', halted: false, reason: null, since: null }, counts: {}, rejections: {},
      positions: [], has_research_positions: false,
    },
  },
  reserve: { by_sleeve: { CRYPTO: 0, EVENTS: 0 }, total: 0 },
  combined: { allocation: 200, cash: 197.5, equity: 200, open_positions: 1, open_exposure: 2.5, realized_pnl: 0,
              unrealized_pnl: 0, drawdown: 3, reserve: 0 },
  equity_curves: {
    CRYPTO: [{ ts: T0 + 40, equity: 100, event: 'fill' }, { ts: T0 + 310, equity: 103, event: 'pnl' },
             { ts: T0 + 610, equity: 100, event: 'pnl' }],
    COMBINED: [{ ts: T0 + 40, equity: 200, event: 'fill' }, { ts: T0 + 310, equity: 203, event: 'pnl' },
               { ts: T0 + 610, equity: 200, event: 'pnl' }],
  },
  activity: [
    { kind: 'settlement', sleeve_id: 'CRYPTO', ts: T0 + 610, window: 'btc-5m-1792420500', market_id: 'btc-5m-1792420500',
      token: 'up', price: null, shares: 5, cancel_reason: null, time_to_fill: null, payout_per_share: 0, outcome: 'Down',
      pnl: -3, research_sizing: true, position_id: 'C2' },
    { kind: 'order_cancelled', sleeve_id: 'CRYPTO', ts: T0 + 400, window: 'btc-5m-1792420500', market_id: null,
      token: 'down', price: 0.39, shares: null, cancel_reason: 'mid_move', time_to_fill: null, payout_per_share: null,
      outcome: null, pnl: null, research_sizing: true, position_id: null },
    { kind: 'order_filled', sleeve_id: 'CRYPTO', ts: T0 + 340, window: 'btc-5m-1792420500', market_id: 'btc-5m-1792420500',
      token: 'up', price: 0.6, shares: 5, cancel_reason: null, time_to_fill: 2.1, payout_per_share: null, outcome: null,
      pnl: null, research_sizing: true, position_id: 'C2' },
  ],
  views: {
    live_actual: { equity_start: 52.74, equity: 52.74, placed: 0, skipped: { min_size_edge_too_small: 3 }, pnl: 0, curve: [],
                   sizing: 'real sizer (src/risk.py)', label: 'live actual', default: true,
                   balance_source: 'LIVE_ACTUAL_BALANCE (paper: no wallet is read; live reads the pUSD balance)' },
    design_min_100: { equity_start: 100, equity: 100, placed: 0, skipped: { min_size_edge_too_small: 3 }, pnl: 0, curve: [],
                      sizing: 'real sizer (src/risk.py)', label: '$100 design minimum',
                      balance_source: 'design minimum (scope §3B.3, ladder step 1b)' },
    paper_100: { equity_start: 100, equity: 100, placed: 0, skipped: { min_size_edge_too_small: 3 }, pnl: 0, curve: [],
                 sizing: 'real sizer (src/risk.py)' },
    live_50: { equity_start: 50, equity: 50, placed: 0, skipped: { min_size_edge_too_small: 3 }, pnl: 0, curve: [],
               sizing: 'real sizer (src/risk.py)' },
  },
}

export const MOCK_RUNWAY_LIVE_DTO: RunwayLiveDTO = {
  generated_at: T0 + 3700, rule: 'p2_maker (frozen parameters)', visibility_only: true, label: 'paper, research sizing',
  windows: [{
    asset: 'BTC', duration_minutes: 5, window: 'btc-updown-5m-1792423800',
    window_start: '2026-10-19T17:50:00+00:00', window_end: '2026-10-19T17:55:00+00:00', seconds_left: 200,
    elapsed_seconds: 100,
    tokens: [
      { token: 'up', bid: 0.49, ask: 0.51, mid: 0.5, quote: { side: 'BUY', token: 'up', price: 0.49, size: 5 }, not_quoting: null },
      { token: 'down', bid: 0.05, ask: 0.07, mid: 0.06, quote: null, not_quoting: 'outside_mid_band' },
    ],
  }],
}

export const MOCK_RUNWAY = toRunway(MOCK_RUNWAY_DTO)
export const MOCK_RUNWAY_LIVE = toRunwayLive(MOCK_RUNWAY_LIVE_DTO)
