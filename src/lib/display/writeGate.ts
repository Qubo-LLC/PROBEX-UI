// Write gate — the single answer to "may this cockpit send an order-flow
// mutation right now?"
//
// ─── Why this exists ─────────────────────────────────────────────────────────
// QUB-49 scopes this product as read-only quantitative operations "without
// manual live-trading controls", and QUB-31 requires that "live controls remain
// disabled until backend, authorization, risk, token, and signing gates pass".
// Neither was enforced anywhere: ManualOrderPanel gated its buttons on form
// validity alone — a market was selected, a size was entered, and the size was
// under the engine's configured max bet. None of those is a statement about
// whether the engine is risking real money.
//
// So the same click that places a harmless simulated order in paper mode would
// have placed a real one the moment the engine was flipped to live, with no
// change in the UI and nothing to warn the operator. That is the gap this
// module closes.
//
// ─── What it is NOT ──────────────────────────────────────────────────────────
// This is not the authorization/token/signing gate QUB-31 also asks for. No
// backend auth contract exists yet (lib/api/client.ts states plainly that
// authentication is deliberately unwired), so those gates cannot be implemented
// here without inventing a contract. This module implements only the part the
// confirmed API actually supports — execution mode and the engine's own
// live-trading policy flag — and the remainder stays explicitly open.
//
// ─── Fail-safe, not fail-open ────────────────────────────────────────────────
// Unknown resolves to BLOCKED, matching the deployment-policy gate in
// config/runtime.ts. A cockpit that has not yet been told whether the engine is
// risking real capital must not offer to spend it; "we are still loading" is
// never a licence to trade. The cost of being wrong in the other direction is a
// real order the operator did not intend.

import type { EngineMode as RuntimeEngineMode } from '@/config/runtime'
import type { EngineMode } from '@/types/engine'

/** Why writes are or are not permitted. One value, so copy can never drift. */
export type WriteGateReason =
  /** Paper mode, confirmed by both the engine's identity and its policy. */
  | 'permitted'
  /** The engine reports its execution mode as live. */
  | 'live-mode'
  /** The engine's execution policy has live trading switched on. */
  | 'live-trading-enabled'
  /** The engine is not reachable, so nothing can be confirmed. */
  | 'engine-unreachable'
  /** Reachable, but mode or policy has not been read yet. */
  | 'unconfirmed'

export interface WriteGate {
  /** True only when the engine is confirmed to be trading on paper. */
  permitted: boolean
  reason:    WriteGateReason
  /** Operator-facing sentence. Null when permitted. */
  detail:    string | null
}

export interface WriteGateInput {
  /** Resolved runtime implementation — 'live' | 'mock' | 'offline'. */
  runtimeMode: RuntimeEngineMode
  /** Engine's own execution mode from `/` or `/api/runtime`; null until read. */
  engineMode: EngineMode | null
  /** `/api/execution/policy` → live_trading_enabled; null until read. */
  liveTradingEnabled: boolean | null
}

const PERMITTED: WriteGate = { permitted: true, reason: 'permitted', detail: null }

/**
 * Derives the gate.
 *
 * Order matters. The two DEFINITE blocks are checked before the "we cannot say"
 * case, so a confirmed live engine is reported as live rather than as
 * unconfirmed — the operator should be told the specific reason their controls
 * are unavailable, and "the engine is trading live" is far more useful than
 * "still loading".
 */
export function deriveWriteGate(input: WriteGateInput): WriteGate {
  const { runtimeMode, engineMode, liveTradingEnabled } = input

  if (runtimeMode === 'offline') {
    return {
      permitted: false,
      reason:    'engine-unreachable',
      detail:    'The engine is unreachable — no order can be sent, and none should appear to be.',
    }
  }

  if (engineMode === 'live') {
    return {
      permitted: false,
      reason:    'live-mode',
      detail:    'The engine is in LIVE mode. Manual order flow is disabled — real capital is at risk.',
    }
  }

  if (liveTradingEnabled === true) {
    return {
      permitted: false,
      reason:    'live-trading-enabled',
      detail:    'The engine’s execution policy has live trading enabled. Manual order flow is disabled.',
    }
  }

  if (engineMode === null || liveTradingEnabled === null) {
    return {
      permitted: false,
      reason:    'unconfirmed',
      detail:    'Waiting for the engine to confirm it is trading on paper. Controls stay disabled until it does.',
    }
  }

  return PERMITTED
}
