// Mock /api/runway and /api/runway/live for development and tests. Shapes follow
// the engine's src/runway.py; values are illustrative only.

import { toEventsPositions, toRunway, toRunwayLive } from '@/lib/services/runwayDto'
import type { ResearchLedgersDTO, EventsPositions, EventsPositionsDTO, RankingDTO, RunwayDTO, RunwayLiveDTO, ShadowDTO } from '@/types/runway'

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

export const MOCK_EVENTS_POSITIONS_DTO: EventsPositionsDTO = {
  sleeve_id: 'EVENTS', simulated: true, label: 'paper', generated_at: 1793030000,
  positions: [
    { position_id: 'EVENTS-000003', market_id: '4951227', question: 'Will X happen by Nov 4?', url: 'https://polymarket.com/event/x',
      strategy_id: 'e_cal', side: 'NO', entry_price: 0.63, shares: 5, cost: 3.1966, current_price: 0.7,
      resolution_date: '2026-11-04T00:00:00Z', opened_at: 1792500000, gamma_closed: false, uma_status: null,
      status: 'open', unrealized_pnl: 0.3034, realized_pnl: null },
    { position_id: 'EVENTS-000001', market_id: '5824120', question: 'Will Y happen by Oct 20?', url: 'https://polymarket.com/event/y',
      strategy_id: 'e_mm', side: 'YES', entry_price: 0.031, shares: 50, cost: 1.55, current_price: 0,
      resolution_date: '2026-10-20T12:00:00Z', opened_at: 1792480000, gamma_closed: true, uma_status: 'resolved',
      status: 'settled', unrealized_pnl: null, realized_pnl: -1.55, settled_at: 1793030000, outcome: 'No' },
  ],
  open: 1, settled: 1, open_cost: 3.1966, unrealized_pnl: 0.3034, realized_pnl: -1.55,
  price_source: 'Gamma outcomePrices (cached 60s)',
}

export const MOCK_EVENTS_POSITIONS: EventsPositions = toEventsPositions(MOCK_EVENTS_POSITIONS_DTO)

const shadowAccount = (equity: number, skipped: number) => ({
  settings: { kelly_fraction: 0.25, max_bet_pct: 5, total_exposure_pct: 25, correlated_exposure_pct: 10, drawdown_stop_pct: 20 },
  state: { cash: equity - 3, start: 52.38, realized_pnl: equity - 52.38, halted: null, positions: [{}], counts: { signals: 3 } },
  equity_curve: [{ ts: 1793030000, equity: 52.38 }, { ts: 1793033600, equity }],
  trades: [{ type: 'fill', ts: 1793030000, account: 'X', strategy_id: 'e_cal', market_id: '1', token: 'no', price: 0.3, shares: 5, cost: 1.5, question: 'Q1?' }],
  skipped: [{ type: 'skip', ts: 1793031000, account: 'X', strategy_id: 'e_mm', market_id: '2', reason: 'min_size_edge_too_small', question: 'Q2?' }],
  skipped_by_reason: { min_size_edge_too_small: skipped }, orders_built: 3,
})

export const MOCK_SHADOW: ShadowDTO = {
  label: 'shadow-live (paper): live code path, no key, no order sent',
  accounts: { SHADOW_LIVE_CONS: shadowAccount(52.9, 4), SHADOW_LIVE_AGGR: shadowAccount(53.6, 1) },
}

export const MOCK_RANKING: RankingDTO = {
  updated: '2026-10-26', rules: 'structural > risk premium > statistical; then edge x capacity', passed: [],
  candidates: [
    { id: 'E-ARB', tier: 'structural', status: 'testing', target_n: 30, n: 0, entries: 0, edge_cents: null, ci_cents: null, capacity_usd_day: null, evidence: 'pending' },
    { id: 'E-END', tier: 'risk_premium', status: 'retired', target_n: null, n: null, edge_cents: -1.63, ci_cents: [-3.18, -0.17], capacity_usd_day: null, evidence: 'holdout failed' },
    { id: 'E-CAL', tier: 'statistical', status: 'testing', target_n: 400, n: 3, entries: 9, edge_cents: 2.3, ci_cents: [0.51, 4.08], capacity_usd_day: null, evidence: 'holdout pass' },
  ],
}

export const MOCK_LEDGERS: ResearchLedgersDTO = {
  available: true, ts: 1793900000,
  note: 'Paper and research ledgers only; no real orders.',
  ledgers: [
    { id: 'C-PAIR', name: 'Up/Down pair as maker legs (passive replay)', status: 'RESEARCH (not trading): replay', n: 120, target: 300,
      ev_per_dollar: -0.012, ci: [-0.02, -0.004], pnl: -3.1, unit: 'per $', note: 'replay', fill_rate: 0.72, group: 'crypto' },
    { id: 'ARB', name: 'Real-time arbitrage (taker, structural, $52.74 tier)', status: 'PAPER (log + paper fills)', n: 16, target: 100,
      ev_per_dollar: -0.0103, ci: [-0.0743, 0.0023], pnl: -0.84, unit: 'per $', note: '671 opportunities logged' },
    { id: 'E-REWARDS-v2', name: 'Liquidity rewards (maker, 40 markets)', status: 'FORWARD PAPER (pre-registered)', n: 159, target: 300,
      ev_per_dollar: 0.00002, ci: [-0.0031, 0.0024], pnl: 0.31, unit: 'per $ of quoted capital per market-day', note: 'verdict at n' },
    { id: 'E-WX', name: 'Weather vs NWS / ECMWF (maker)', status: 'NOT STARTED', n: 0, target: 300,
      ev_per_dollar: null, ci: null, pnl: null, unit: 'per $', note: 'item 6' },
  ],
}
