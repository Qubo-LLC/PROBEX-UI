// The sleeve runway: built from /api/runway (the sleeve ledgers) only. The
// retired PaperTrader and the survival brain's capital are not referenced by
// any dashboard surface.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useApplicationStore } from '@/store/applicationStore'
import { loadingState, ok, toServiceState } from '@/lib/services/response'
import { MOCK_RUNWAY, MOCK_RUNWAY_DTO, MOCK_RUNWAY_LIVE } from '@/mock/runway'
import { toRunway } from '@/lib/services/runwayDto'
import type { Runway, RunwayLive } from '@/types/runway'
import { RunwayGroup } from './RunwayGroup'
import { ActivityList } from './ActivityList'
import { CurrentWindowPanel } from './CurrentWindowPanel'
import { mergeCurves } from './EquityCurves'

function seed(runway: Runway | null, live: RunwayLive | null = MOCK_RUNWAY_LIVE) {
  useApplicationStore.setState((s) => ({
    engine: {
      ...s.engine,
      runway: runway ? toServiceState(ok(runway)) : loadingState<Runway>(),
      runwayLive: live ? toServiceState(ok(live)) : loadingState<RunwayLive>(),
    },
  }))
}

afterEach(cleanup)

// recharts' ResponsiveContainer measures with ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

describe('RunwayGroup', () => {
  it('shows every sleeve, the reserve and the combined total, labelled research sizing', () => {
    seed(MOCK_RUNWAY)
    render(<RunwayGroup />)
    expect(screen.getByTestId('sleeve-CRYPTO')).toBeTruthy()
    expect(screen.getByTestId('sleeve-EVENTS')).toBeTruthy()
    expect(screen.getByTestId('runway-reserve').textContent).toContain('Reserve (locked profit)')
    expect(screen.getByTestId('runway-combined').textContent).toContain('$200')
    expect(screen.getByTestId('runway-label').textContent).toContain('Paper, research sizing')
  })

  it('shows a halted sleeve as halted, with its reason', () => {
    const halted = toRunway({
      ...MOCK_RUNWAY_DTO,
      sleeves: { ...MOCK_RUNWAY_DTO.sleeves,
                 CRYPTO: { ...MOCK_RUNWAY_DTO.sleeves.CRYPTO!,
                           halt: { state: 'DRAWDOWN_STOP', halted: true, reason: 'drawdown 21.40 >= 20%', since: 1 } } },
    })
    seed(halted)
    render(<RunwayGroup />)
    const badge = screen.getByTestId('halt-CRYPTO')
    expect(badge.textContent).toContain('drawdown stop')
  })

  it('defaults the real sizer to live actual, with its balance source, kept apart from research figures', () => {
    seed(MOCK_RUNWAY)
    render(<RunwayGroup />)
    const radios = screen.getAllByRole('radio').map((r) => r.textContent)
    expect(radios).toEqual(['Live actual · real sizer', '$100 design minimum · real sizer', '$100 paper · real sizer'])
    expect(screen.getByRole('radio', { name: 'Live actual · real sizer' }).getAttribute('aria-checked')).toBe('true')
    const view = screen.getByTestId('view-live_actual')
    expect(view.textContent).toContain('$52.74')
    expect(screen.getByTestId('view-source-live_actual').textContent).toContain('pUSD balance')
    expect(screen.getByLabelText('Skip reasons').textContent).toContain('min_size_edge_too_small: 3')
    expect(screen.getByTestId('sleeve-CRYPTO')).toBeTruthy()  // the sleeve book stays; sizer figures are separate
    expect(screen.getByTestId('real-sizer').querySelector('[data-testid="sleeve-CRYPTO"]')).toBeNull()
  })

  it('toggles to the $100 design minimum and $100 paper views; the superseded $50 view is not offered', () => {
    seed(MOCK_RUNWAY)
    render(<RunwayGroup />)
    fireEvent.click(screen.getByRole('radio', { name: '$100 design minimum · real sizer' }))
    expect(screen.getByTestId('view-design_min_100').textContent).toContain('$100')
    fireEvent.click(screen.getByRole('radio', { name: '$100 paper · real sizer' }))
    expect(screen.getByTestId('view-paper_100')).toBeTruthy()
    expect(screen.queryByRole('radio', { name: /\$50/ })).toBeNull()
  })

  it('says it is waiting rather than showing any other capital figure', () => {
    seed(null)
    render(<RunwayGroup />)
    expect(screen.getAllByText(/Waiting for the sleeve ledgers/).length).toBeGreaterThan(0)
    expect(screen.queryByTestId('sleeve-CRYPTO')).toBeNull()
  })
})

describe('ActivityList', () => {
  it('lists fills, cancels with their reason, and settlements with per-trade PnL', () => {
    seed(MOCK_RUNWAY)
    render(<ActivityList />)
    expect(screen.getByTestId('activity-order_filled')).toBeTruthy()
    expect(screen.getByTestId('activity-order_cancelled').textContent).toContain('mid move')
    expect(screen.getByTestId('activity-settlement').textContent).toContain('-$3')
  })
})

describe('CurrentWindowPanel', () => {
  it('shows the working quotes and the reason a token is not quoted, as visibility only', () => {
    seed(MOCK_RUNWAY)
    render(<CurrentWindowPanel />)
    const card = screen.getByTestId('live-BTC-5')
    expect(card.textContent).toContain('BUY 5 @ 0.49')
    expect(card.textContent).toContain('mid outside 0.15–0.85')
    expect(screen.getByText(/visibility only, not orders/)).toBeTruthy()
  })
})

describe('mergeCurves', () => {
  it('carries each series forward on a shared time axis', () => {
    const rows = mergeCurves({
      A: [{ tsMs: 1, equity: 100, event: null }, { tsMs: 3, equity: 103, event: null }],
      B: [{ tsMs: 2, equity: 50, event: null }],
    })
    expect(rows).toEqual([{ t: 1, A: 100 }, { t: 2, A: 100, B: 50 }, { t: 3, A: 103, B: 50 }])
  })
})

// ─── The retired PaperTrader is not referenced anywhere on the dashboard ─────

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

describe('no PaperTrader surface remains', () => {
  const root = join(__dirname, '..', '..')
  const files = [...sources(join(root, 'components')), ...sources(join(root, 'app')), ...sources(join(root, 'store')),
                 ...sources(join(root, 'lib')), ...sources(join(root, 'config'))]

  it.each([
    ['/paper-stats'], ['/paper/status'], ['/paper/start'], ['/paper/stop'], ['/paper/reset'], ['/paper/resolve'],
    ['paperStats'], ['paperStatus'], ['PaperTradingConsole'], ['startPaperTrading'],
  ])('no source file references %s in code', (needle) => {
    const code = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
    const hits = files.filter((f) => code(f).includes(needle))
    expect(hits).toEqual([])
  })

  it('the runway and capital pages read the sleeve ledgers, never survival capital', () => {
    for (const f of [...sources(join(root, 'components', 'runway')), join(root, 'components', 'survival', 'SurvivalConsole.tsx')]) {
      const text = readFileSync(f, 'utf8')
      expect(text, f).not.toMatch(/engine\.survival\b|currentCapital|initialCapital|daysOfRunway/)
    }
  })
})
