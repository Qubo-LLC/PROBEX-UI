// ALPHA paper sleeves (scope v8.8 §5.7): the default view shows equity, P&L with CI, win rate next to break-even and
// open positions with p vs price; the legacy epochs sit in an Archived list.

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AlphaPositions, AlphaSleeveCard, ArchivedEpochs } from './AlphaSleevesPanel'
import type { AlphaDTO } from '@/types/runway'

afterEach(cleanup)

const DATA: AlphaDTO = {
  available: true, ts: 1_800_000_000, prereg_sha256: 'c9c3b2afd5c7',
  sleeves: {
    'ALPHA-EVENTS': {
      equity: 101.9, allocation: 100, realized_pnl: 1.9, unrealized_pnl: 0, open_positions: 1, open_orders: 2, settled: 1,
      target_n: 300, pnl_per_usd_ci: [0.61, null, null], win_rate: 1, break_even: 0.62, clv_mean: 0.01, brier: 0.04,
      brier_mid: 0.16, by_source: { nws: { n: 1, pnl: 1.9, pnl_per_usd: 0.61, win_rate: 1 } },
      positions: [{ market: '1', question: 'Highest temperature in NYC?', side: 'YES', exec: 'taker', source: 'nws', entry: 0.62,
                    shares: 5, p_adj: 0.79, p_lcb: 0.69, mark: 0.65 }],
    },
    ARB: { fills: 3, plan_profit_locked: 0.4, capital_locked: 20, note: 'paper fills' },
  },
}

describe('ALPHA sleeves', () => {
  it('shows the sleeve figures labelled paper, with win rate next to break-even', () => {
    render(<AlphaSleeveCard id="ALPHA-EVENTS" s={DATA.sleeves['ALPHA-EVENTS']!} />)
    expect(screen.getByText('$101.90')).toBeTruthy()
    expect(screen.getByText('100.0% vs 62.0%')).toBeTruthy()
    expect(screen.getByText('paper')).toBeTruthy()
  })
  it('lists open positions with p vs price and the market question', () => {
    render(<AlphaPositions data={DATA} />)
    expect(screen.getByText('Highest temperature in NYC?')).toBeTruthy()
    expect(screen.getAllByTestId('alpha-position')).toHaveLength(1)
  })
  it('lists archived epochs with their moved positions', () => {
    render(<ArchivedEpochs data={{ archived: [{ sleeve_id: 'EVENTS', epoch: 1, archived_at: '2026-11-09T14:47:00+00:00',
      reason: 'clean state', final: { realized_pnl: -25.05, state: 'DRAWDOWN_STOP' }, moved_positions: [
        { market_id: '634976', direction: 'NO', shares: 5, price: 0.27, status: 'open' }], moved_settled_pnl: 0 }] }} />)
    expect(screen.getByTestId('archived-epochs').textContent).toContain('EVENTS epoch 1')
  })
})
