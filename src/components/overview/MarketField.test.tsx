// EngineLedger — the default-expansion rule, across the N-states the live
// engine rarely shows at once.
//
// The rule under test: exactly ONE row opens by default — the leading
// edge-bearing window in the ledger's existing order — and every other
// edge-bearing row stays collapsed but keeps its accent rail. No edge, nothing
// opens. Any row can be toggled by hand.
//
// This is a structural test of the ledger's own state, not of the engine's
// data: the fixtures are minimal MarketRow / EdgeRow shapes, not recorded
// payloads, and nothing here becomes a specification for the backend.

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MarketRow } from '@/lib/mappers/markets'
import type { EdgeRow } from '@/lib/mappers/edges'
import { EngineLedger } from './MarketField'
import { compactWindowTitle } from '@/lib/display/market'

// The ledger renders <Link> titles and a WatchlistButton in each expansion;
// neither needs a real router or a real preferences store to test the rule.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/shared/WatchlistButton', () => ({
  WatchlistButton: () => <span data-testid="watch" />,
}))

const NOW = Date.now()

function market(id: string, title: string, closesInMin: number): MarketRow {
  return {
    id, title,
    description: null, segment: 'crypto',
    probability: 0.5, yesPrice: 50, noPrice: 50,
    volume24h: 1000, liquidity: null, openInterest: null, sentiment: null,
    tags: [], resolutionCriteria: null,
    closesAt: NOW + closesInMin * 60_000,
    status: null, baselinePrice: null, yesTokenId: null, noTokenId: null,
    durationMinutes: 15,
  }
}

function edge(id: string, direction: 'yes' | 'no', edgePct: number): EdgeRow {
  return {
    id, marketId: id, marketTitle: null, direction, edgePct,
    kellySize: null, confidence: 0.6, signal: null, recommendation: null,
    detectedAt: NOW, rsi: null, rsiSignal: null, macdTrend: null, alignmentScore: null,
  }
}

/** Windows in ledger order: edge-bearing first, then soonest-closing — the
 *  order MarketField hands EngineLedger. */
function windows(n: number, edgeIds: string[]): { rows: MarketRow[]; edgeMap: Map<string, EdgeRow> } {
  const rows = Array.from({ length: n }, (_, i) => market(`m${i}`, `Window ${i}`, 5 + i))
  const edgeMap = new Map(edgeIds.map((id, i) => [id, edge(id, i % 2 ? 'no' : 'yes', 10 - i)]))
  rows.sort((a, b) => {
    const ea = edgeMap.has(a.id), eb = edgeMap.has(b.id)
    if (ea !== eb) return ea ? -1 : 1
    return (a.closesAt ?? 0) - (b.closesAt ?? 0)
  })
  return { rows, edgeMap }
}

function renderLedger(n: number, edgeIds: string[]) {
  const { rows, edgeMap } = windows(n, edgeIds)
  render(
    <EngineLedger windows={rows} edgeMap={edgeMap} btcNow={null} btcBaselines={new Set()} stale={false} />,
  )
  return rows
}

function toggles(): HTMLButtonElement[] {
  return screen.getAllByRole('button').filter((b) =>
    b.hasAttribute('aria-expanded'),
  ) as HTMLButtonElement[]
}

function expandedCount(): number {
  return toggles().filter((b) => b.getAttribute('aria-expanded') === 'true').length
}

function accentedCount(): number {
  return toggles().filter((b) => {
    const tr = b.closest('tr') as HTMLTableRowElement
    return !tr.style.borderLeft.includes('transparent')
  }).length
}

afterEach(cleanup)

describe('EngineLedger default expansion', () => {
  it('N=1, no edge: nothing opens, nothing accented', () => {
    renderLedger(1, [])
    expect(toggles()).toHaveLength(1)
    expect(expandedCount()).toBe(0)
    expect(accentedCount()).toBe(0)
  })

  it('N=1 with edge: that row opens', () => {
    renderLedger(1, ['m0'])
    expect(expandedCount()).toBe(1)
    expect(accentedCount()).toBe(1)
  })

  it('N=2, one edge: only the edge-bearing row opens', () => {
    const rows = renderLedger(2, ['m1'])
    expect(rows[0]!.id).toBe('m1') // edge-first ordering
    expect(expandedCount()).toBe(1)
    expect(toggles()[0]!.getAttribute('aria-expanded')).toBe('true')
    expect(toggles()[1]!.getAttribute('aria-expanded')).toBe('false')
  })

  it('N=2, both edge-bearing: one opens, the other stays collapsed but accented', () => {
    renderLedger(2, ['m0', 'm1'])
    expect(expandedCount()).toBe(1)
    expect(accentedCount()).toBe(2)
    expect(toggles()[0]!.getAttribute('aria-expanded')).toBe('true')
  })

  it('N=5, three edges: exactly the leading one opens; the other two keep their accent', () => {
    renderLedger(5, ['m0', 'm2', 'm4'])
    expect(toggles()).toHaveLength(5)
    expect(expandedCount()).toBe(1)
    expect(accentedCount()).toBe(3)
    // The open row is the FIRST row — the ledger's own order decides, not a
    // new ranking.
    expect(toggles()[0]!.getAttribute('aria-expanded')).toBe('true')
  })

  it('N=5, no edges: all collapsed', () => {
    renderLedger(5, [])
    expect(expandedCount()).toBe(0)
    expect(accentedCount()).toBe(0)
  })

  it('a collapsed edge-bearing row can be opened by hand, and the default one closed', () => {
    renderLedger(3, ['m0', 'm1'])
    const [first, second] = toggles()
    fireEvent.click(second!)
    expect(second!.getAttribute('aria-expanded')).toBe('true')
    expect(expandedCount()).toBe(2)
    fireEvent.click(first!)
    expect(first!.getAttribute('aria-expanded')).toBe('false')
    expect(expandedCount()).toBe(1)
  })

  it('the expansion panel is wired to its toggle and hidden when collapsed', () => {
    renderLedger(2, ['m0', 'm1'])
    for (const b of toggles()) {
      const panel = document.getElementById(b.getAttribute('aria-controls')!)!
      expect(panel).not.toBeNull()
      expect(panel.hidden).toBe(b.getAttribute('aria-expanded') === 'false')
    }
  })
})

// ─── Open-before-closed ───────────────────────────────────────────────────────
// The ledger's order is edge-first then soonest-closing, which puts a JUST-
// CLOSED edge-bearing window at the top. The default expansion must skip it
// for an open one; the displayed order must not change.

function closedMarket(id: string, title: string, closedMinAgo: number): MarketRow {
  return { ...market(id, title, 0), closesAt: NOW - closedMinAgo * 60_000 }
}

function renderMixed(rows: MarketRow[], edgeIds: string[]) {
  const edgeMap = new Map(edgeIds.map((id) => [id, edge(id, 'no', 10)]))
  render(
    <EngineLedger windows={rows} edgeMap={edgeMap} btcNow={null} btcBaselines={new Set()} stale={false} />,
  )
}

describe('EngineLedger default expansion prefers an open window', () => {
  it('open + closed edge-bearing: the first OPEN edge row opens, the closed one stays collapsed but accented', () => {
    const rows = [
      closedMarket('c0', 'Closed 3:05–3:10', 5), // leads the ledger: earliest close
      market('o0', 'Open 3:00–3:15', 3),
      market('o1', 'Open 3:15–3:30', 18),
    ]
    renderMixed(rows, ['c0', 'o0', 'o1'])
    const t = toggles()
    expect(t.map((b) => b.getAttribute('aria-expanded'))).toEqual(['false', 'true', 'false'])
    expect(accentedCount()).toBe(3)
    // Order on screen is untouched — the closed window is still row one.
    expect(screen.getAllByRole('link')[0]!.getAttribute('title')).toBe('Closed 3:05–3:10')
  })

  it('multiple open edge-bearing: existing order decides — the first open one', () => {
    const rows = [market('o0', 'Open A', 3), market('o1', 'Open B', 18), market('t0', 'Tracked', 20)]
    renderMixed(rows, ['o0', 'o1'])
    expect(toggles().map((b) => b.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false'])
  })

  it('only closed edge-bearing: falls back to the first edge-bearing row', () => {
    const rows = [closedMarket('c0', 'Closed A', 5), closedMarket('c1', 'Closed B', 2), market('t0', 'Tracked', 20)]
    renderMixed(rows, ['c0', 'c1'])
    expect(toggles().map((b) => b.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false'])
  })

  it('closed edge-bearing rows remain manually expandable', () => {
    const rows = [closedMarket('c0', 'Closed A', 5), market('o0', 'Open A', 3)]
    renderMixed(rows, ['c0', 'o0'])
    const [closed] = toggles()
    fireEvent.click(closed!)
    expect(closed!.getAttribute('aria-expanded')).toBe('true')
    expect(expandedCount()).toBe(2)
  })
})

// ─── Narrow-column title ──────────────────────────────────────────────────────


describe('compactWindowTitle', () => {
  it('keeps the asset and the window, drops the date', () => {
    expect(compactWindowTitle('Bitcoin Up or Down - September 13, 3:00AM-3:15AM ET')).toBe('Bitcoin · 3:00AM–3:15AM ET')
    expect(compactWindowTitle('Ethereum Up or Down - September 12, 7:15AM-7:30AM ET')).toBe('Ethereum · 7:15AM–7:30AM ET')
  })
  it('returns any other title unchanged — nothing is invented', () => {
    const q = 'Will the Fed decrease interest rates by 25 bps after the September 2026 meeting?'
    expect(compactWindowTitle(q)).toBe(q)
  })
})
