// PerceptionArc — the Engine Focus block renders the operational verdict ahead
// of the signal, and keeps the signal visible as context.

import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useApplicationStore } from '@/store/applicationStore'
import { toServiceState, loadingState, errorState, ok, ServiceException } from '@/lib/services/response'
import type { SurvivalStatus, EngineEdges } from '@/types/engine'
import { PerceptionArc } from './PerceptionArc'

const survival = (over: Partial<SurvivalStatus>): SurvivalStatus => ({
  currentCapital: 100, initialCapital: 100, capitalPct: 100, state: 'HEALTHY',
  dailyBurnRate: 0, daysOfRunway: null, recoveryTradesNeeded: 0, avgWinSize: 0,
  dailyTarget: 1, weeklyTarget: 5, dailyPnl: 0, weeklyPnl: 0, behindTargetPct: 0,
  kellyModifier: 1, minEdgeThreshold: 3, totalPatterns: 0, filteredPatterns: 0,
  timestamp: 0, patternsSummary: [], ...over,
})

const edges = (items: Array<{ market_id: string; market_question: string; direction: string; edge_pct: number; confidence: number }>): EngineEdges =>
  ({ edges: items, count: items.length, limit: 10, timestamp: 0 })

const CANDIDATE = { market_id: '0xabc', market_question: 'Bitcoin Up or Down - 3:00AM-3:15AM ET', direction: 'NO', edge_pct: 14.5, confidence: 0.71 }

function seed(over: { edges?: EngineEdges | 'loading' | 'error'; survival?: SurvivalStatus | null }) {
  const e = over.edges
  useApplicationStore.setState((s) => ({
    engine: {
      ...s.engine,
      edges: e === 'loading' ? loadingState<EngineEdges>()
        : e === 'error' ? errorState<EngineEdges>(new ServiceException('NETWORK', 'boom', true))
        : toServiceState(ok(e ?? edges([]))),
      survival: over.survival === null || over.survival === undefined
        ? loadingState<SurvivalStatus>()
        : toServiceState(ok(over.survival)),
    },
  }))
}

afterEach(cleanup)

describe('PerceptionArc', () => {
  it('healthy + edge → the candidate leads, with its gauge', () => {
    seed({ edges: edges([CANDIDATE]), survival: survival({}) })
    render(<PerceptionArc />)
    expect(screen.getByText(CANDIDATE.market_question)).toBeTruthy()
    expect(screen.getByLabelText(/Edge 14.5 percent, on a 0 to 100 percent scale/)).toBeTruthy()
    expect(screen.queryByText('Halted')).toBeNull()
    expect(screen.queryByText('Not acting')).toBeNull()
  })

  it('healthy + no edge → Holding, with the survival floor stated as a floor', () => {
    seed({ edges: edges([]), survival: survival({}) })
    render(<PerceptionArc />)
    expect(screen.getByText('Holding')).toBeTruthy()
    expect(screen.getByText(/survival brain's floor is 3.0%/)).toBeTruthy()
    expect(screen.getByText(/detector’s own threshold is not reported/)).toBeTruthy()
  })

  it('survival DEAD + candidate → Halted leads; the candidate remains as context with its figures', () => {
    seed({ edges: edges([CANDIDATE]), survival: survival({ state: 'DEAD', kellyModifier: 0, minEdgeThreshold: 999 }) })
    render(<PerceptionArc />)
    expect(screen.getByText('Halted')).toBeTruthy()
    expect(screen.getByText(/Dead state and has halted trading/)).toBeTruthy()
    expect(screen.getByText(/14.5% edge is below the survival brain's 999.0% floor/)).toBeTruthy()
    expect(screen.getByText(/Kelly modifier is 0.00×/)).toBeTruthy()
    // Signal preserved, one register down, no gauge.
    expect(screen.getByText('Candidate the engine sees')).toBeTruthy()
    expect(screen.getByText(CANDIDATE.market_question)).toBeTruthy()
    expect(screen.getByText('14.5% edge')).toBeTruthy()
    expect(screen.getByText('71% confidence')).toBeTruthy()
    expect(screen.queryByLabelText(/on a 0 to 100 percent scale/)).toBeNull()
  })

  it('survival DEAD + no candidate → Halted, not Holding', () => {
    seed({ edges: edges([]), survival: survival({ state: 'DEAD' }) })
    render(<PerceptionArc />)
    expect(screen.getByText('Halted')).toBeTruthy()
    expect(screen.queryByText('Holding')).toBeNull()
  })

  it('degraded but trading (CRITICAL, sized, edge clears) → still the candidate', () => {
    seed({ edges: edges([CANDIDATE]), survival: survival({ state: 'CRITICAL', kellyModifier: 0.25, minEdgeThreshold: 5 }) })
    render(<PerceptionArc />)
    expect(screen.getByLabelText(/Edge 14.5 percent, on a 0 to 100 percent scale/)).toBeTruthy()
    expect(screen.queryByText('Not acting')).toBeNull()
  })

  it('edge below the current threshold, engine otherwise healthy → Not acting', () => {
    seed({ edges: edges([{ ...CANDIDATE, edge_pct: 2 }]), survival: survival({ minEdgeThreshold: 3 }) })
    render(<PerceptionArc />)
    expect(screen.getByText('Not acting')).toBeTruthy()
    expect(screen.getByText(/2.0% edge is below the survival brain's 3.0% floor/)).toBeTruthy()
  })

  it('edges endpoint failed → No signal report, never Holding', () => {
    seed({ edges: 'error', survival: survival({}) })
    render(<PerceptionArc />)
    expect(screen.getByText('No signal report')).toBeTruthy()
    expect(screen.queryByText('Holding')).toBeNull()
  })
})
