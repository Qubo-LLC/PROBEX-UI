// engineFocus — what the Engine Focus block should SAY, given what the engine
// reports about its signals and about its own operating state.
//
// ─── The contradiction this resolves ─────────────────────────────────────────
// Live QA (2026-09-13) caught Engine Focus reading "Bitcoin Up or Down… 14.5%
// edge · NO · 71% confidence" — the EdgeFound treatment, which means "the
// engine has a candidate that cleared its threshold" — while three other
// figures on the same page said the engine could not act on anything:
//
//   survival.state            DEAD
//   survival.kellyModifier    0.00×    (every position sizes to zero)
//   survival.minEdgeThreshold 999.0%   (no edge can clear it)
//
// and the event log carried 34 rows reading "Paper trade rejected … DEAD state
// — trading halted". The signal state and the operational state were both
// true; presenting the signal at the top of the page let it stand for the
// engine's DECISION, which it was not.
//
// ─── Precedence ──────────────────────────────────────────────────────────────
//   1. OPERATIONAL   is the engine able to act at all?        (survival DEAD)
//   2. ACTIONABILITY can it act on THIS candidate?            (edge vs the
//                    threshold it currently requires; Kelly modifier > 0)
//   3. SIGNAL        what candidate does it see?              (/api/edges)
//
// A blocked candidate is still shown — as context beneath the operational
// verdict, with the reasons it is blocked — so nothing the wire reports is
// hidden. Nothing here is a new backend state: every input is a value the
// engine already publishes, and every reason is a comparison between two of
// them. "DEAD means halted" is the engine's own wording (its rejection events
// say exactly that), not a frontend inference.

import type { EdgeRow } from '@/lib/mappers/edges'
import type { SurvivalStatus } from '@/types/engine'

export type BlockReason =
  | { kind: 'halted';    state: string }
  | { kind: 'threshold'; edgePct: number; minEdge: number }
  | { kind: 'sizing';    kellyModifier: number }
  /** The engine's own `api_access` check says its market data is stale, so any
   *  edge was measured against a quote that is not current (remediation phase 2:
   *  the invalid 2026-09-21 session traded exactly such phantom edges). */
  | { kind: 'stale-market-data'; message: string | null }

/**
 * What the engine says about its market data. Built from contracts the
 * deployed engine already serves: the `api_access` component of /api/health
 * (quoted verbatim) and the /api/markets count.
 */
export interface MarketDataSignal {
  /** `api_access` reported unhealthy. */
  stale:       boolean
  /** The engine's health message for `api_access`, verbatim. */
  message:     string | null
  /** Markets the engine currently holds; null when /api/markets has not answered. */
  marketCount: number | null
}

export type EngineFocusState =
  /** A candidate the engine can act on. The signal leads. */
  | { kind: 'acting';  edge: EdgeRow }
  /** A candidate exists but the engine cannot or will not act on it. The
   *  operational state leads; the candidate is context. */
  | { kind: 'blocked'; edge: EdgeRow; reasons: BlockReason[]; halted: boolean }
  /** The engine answered and reports no candidate. A decision. */
  | { kind: 'holding'; halted: boolean; state: string | null }
  /** The engine has not told us what it sees. Not the same as holding. */
  | { kind: 'unknown' }
  /** The engine has nothing valid to evaluate — its market data is stale, or its
   *  current scan holds no markets. NOT "holding": holding is a choice among
   *  candidates, and there were none to choose among. */
  | { kind: 'no-valid-markets'; cause: 'stale' | 'empty'; message: string | null; halted: boolean }

/** The one survival state the engine itself describes as "trading halted". */
export function isHaltedState(state: string | null | undefined): boolean {
  return String(state ?? '').toUpperCase() === 'DEAD'
}

/**
 * Why a candidate is not actionable, in precedence order. Empty means it is.
 *
 * `minEdge` is the survival brain's CURRENT threshold — the one it moves as
 * capital changes — which is why a candidate the engine listed can still fall
 * below it: /api/edges reports what the detector found, /api/survival reports
 * what the sizer will accept, and the two are not reconciled on the wire.
 */
export function blockReasons(edge: EdgeRow, survival: SurvivalStatus | null): BlockReason[] {
  if (survival === null) return []
  const reasons: BlockReason[] = []
  if (isHaltedState(survival.state)) {
    reasons.push({ kind: 'halted', state: survival.state })
  }
  if (Number.isFinite(survival.minEdgeThreshold) && edge.edgePct < survival.minEdgeThreshold) {
    reasons.push({ kind: 'threshold', edgePct: edge.edgePct, minEdge: survival.minEdgeThreshold })
  }
  if (survival.kellyModifier <= 0) {
    reasons.push({ kind: 'sizing', kellyModifier: survival.kellyModifier })
  }
  return reasons
}

export function deriveEngineFocus(input: {
  /** Top edge by magnitude, or null when the engine reports none. */
  topEdge: EdgeRow | null
  /** Whether /api/edges has answered at all. */
  edgesKnown: boolean
  survival: SurvivalStatus | null
  /** Omitted/null: market data not known, and the pre-phase-2 behaviour applies. */
  marketData?: MarketDataSignal | null
}): EngineFocusState {
  const { topEdge, edgesKnown, survival } = input
  const marketData = input.marketData ?? null
  const halted = isHaltedState(survival?.state)

  if (topEdge !== null) {
    const reasons = blockReasons(topEdge, survival)
    // An edge measured on stale market data is not actionable, whatever else holds.
    if (marketData?.stale) reasons.unshift({ kind: 'stale-market-data', message: marketData.message })
    return reasons.length > 0
      ? { kind: 'blocked', edge: topEdge, reasons, halted }
      : { kind: 'acting', edge: topEdge }
  }
  if (edgesKnown) {
    if (marketData?.stale) return { kind: 'no-valid-markets', cause: 'stale', message: marketData.message, halted }
    if (marketData?.marketCount === 0) return { kind: 'no-valid-markets', cause: 'empty', message: marketData.message, halted }
    return { kind: 'holding', halted, state: survival?.state ?? null }
  }
  return { kind: 'unknown' }
}

/** The market-data signal from the engine's health and markets responses. */
export function marketDataSignal(
  health: { components: { name: string; healthy: boolean; message: string }[] } | null,
  marketCount: number | null,
): MarketDataSignal | null {
  const api = health?.components.find((c) => c.name === 'api_access') ?? null
  if (!api && marketCount === null) return null
  return { stale: api ? !api.healthy : false, message: api?.message ?? null, marketCount }
}
