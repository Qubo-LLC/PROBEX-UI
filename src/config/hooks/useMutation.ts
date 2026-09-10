'use client'

// Engine mutation hooks. The read side (useServices.ts) polls; this is the
// write side — nothing fires until a caller invokes it.
//
// Every mutation here changes live engine state. Two rules hold throughout:
//
//   1. The hook never self-triggers. No effect, no polling, no retry-on-mount.
//      A mutation happens because the operator clicked something, or not at all.
//   2. Destructive mutations are marked `destructive` in MUTATIONS below, and
//      the UI is expected to gate them behind ConfirmDialog. The hook does not
//      enforce that — it can't know intent — but the flag makes an unguarded
//      call obvious in review.
//
// After a successful mutation the engine's own state has changed, so callers
// pass `onSettled` to trigger a refresh of the affected store slices rather
// than waiting up to a full poll interval for the UI to catch up.

import { useCallback, useEffect, useRef, useState } from 'react'
import { services } from '@/lib/services'
import { useWriteGate } from './useWriteGate'
import { isExpiredResource } from '@/lib/api/resourceLifecycle'
import { toServiceError, type ServiceError } from '@/lib/services/response'
import type { CreateOrderInput } from '@/lib/services/interfaces'
import type { MutationResult } from '@/types/engine'

// ─── State machine ────────────────────────────────────────────────────────────

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error'

export interface MutationState {
  status: MutationStatus
  /** Engine response on success — `message` is safe to surface verbatim. */
  result: MutationResult | null
  error:  ServiceError | null
}

const IDLE: MutationState = { status: 'idle', result: null, error: null }

export interface UseMutationReturn {
  state: MutationState
  /** Fires the mutation. Resolves to the result, or null if it failed. */
  fire:  () => Promise<MutationResult | null>
  /** Returns to idle — use when closing a dialog that showed the outcome. */
  reset: () => void
  /** Convenience for disabling buttons. */
  isPending: boolean
  /**
   * Why this mutation may not be fired right now, or null when it may.
   *
   * Only ORDER-FLOW mutations are ever gated (see MUTATIONS below). The UI is
   * expected to disable the control and show this string; fire() also refuses
   * independently, so a control that forgets to check still cannot send.
   */
  blockedReason: string | null
}

/**
 * Wraps a single mutation call in an idle→pending→success|error state machine.
 *
 * Concurrent invocations are dropped rather than queued: double-clicking
 * "Emergency Stop" must not send two halts. The in-flight guard is a ref, not
 * state, so it takes effect synchronously within the same tick.
 */
function useMutation(
  run:        () => Promise<{ data: MutationResult }>,
  onSettled?: () => void,
  /** Non-null blocks the mutation entirely and explains why. */
  blockedReason: string | null = null,
): UseMutationReturn {
  const [state, setState] = useState<MutationState>(IDLE)
  const inFlight = useRef(false)
  // Guards against setState after unmount when a dialog closes mid-request.
  const mounted  = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const fire = useCallback(async (): Promise<MutationResult | null> => {
    // Defence in depth. The button is already disabled when a reason exists;
    // this makes the guarantee independent of any one call site remembering to
    // wire it, which is the whole point of centralising the gate.
    if (blockedReason !== null) return null
    if (inFlight.current) return null
    inFlight.current = true
    setState({ status: 'pending', result: null, error: null })

    try {
      const { data } = await run()
      if (mounted.current) {
        setState({
          // The engine can return 2xx while reporting a logical failure.
          status: data.success ? 'success' : 'error',
          result: data,
          error:  data.success ? null : { code: 'ENGINE_REJECTED', message: data.message ?? 'The engine rejected the request', retryable: false },
        })
      }
      onSettled?.()
      return data
    } catch (e) {
      // An ephemeral id that 404s did not fail — it finished. A position that
      // resolved, or an order that filled, between the list poll the operator
      // clicked from and this request arriving is the ordinary case
      // (ID_LIFECYCLE_MANAGEMENT.md), and "Request failed (404)" describes it
      // to the operator as a fault they should investigate.
      //
      // The id is deliberately NOT refreshed and the call is NOT retried:
      // re-issuing a destructive mutation against whatever resource is current
      // would close a position the operator never selected.
      const expired = isExpiredResource(e)
      if (mounted.current) {
        setState({
          status: 'error',
          result: null,
          error: expired
            ? {
                code:      'RESOURCE_EXPIRED',
                message:   'This no longer exists — it resolved or filled before the request arrived. The list has been refreshed.',
                retryable: false,
              }
            : toServiceError(e),
        })
      }
      // Refresh the authoritative list on expiry too, so the stale row the
      // operator acted on disappears instead of inviting a second attempt.
      if (expired) onSettled?.()
      return null
    } finally {
      inFlight.current = false
    }
  }, [run, onSettled, blockedReason])

  const reset = useCallback(() => setState(IDLE), [])

  return { state, fire, reset, isPending: state.status === 'pending', blockedReason }
}

// ─── Mutation catalogue ───────────────────────────────────────────────────────
// One entry per write endpoint, so the full set of state-changing operations is
// visible in a single place.
//
//   destructive — the UI must confirm before firing.
//   orderFlow   — this write can move real capital when the engine is live, so
//                 it is gated by useWriteGate and unavailable outside paper
//                 mode (QUB-49: "without manual live-trading controls").
//
// Emergency Stop is deliberately NOT order flow. It only ever REDUCES exposure,
// and it is the one control an operator needs most precisely when the engine is
// live — gating it would disable the safety brake exactly when it matters most.
// Paper-session controls are not order flow either: they operate the simulator,
// which is the in-scope subject of this cockpit.

export const MUTATIONS = {
  emergencyStop:    { label: 'Emergency Stop',        destructive: true,  orderFlow: false, endpoint: 'POST /api/execution/emergency-stop' },
  createOrder:      { label: 'Create Order',          destructive: true,  orderFlow: true,  endpoint: 'POST /api/execution/create' },
  closePosition:    { label: 'Close Position',        destructive: true,  orderFlow: true,  endpoint: 'POST /api/execution/close/:market_id' },
  cancelOrder:      { label: 'Cancel Order',          destructive: true,  orderFlow: true,  endpoint: 'POST /api/execution/cancel/:order_id' },
  paperStart:       { label: 'Start Paper Trading',   destructive: false, orderFlow: false, endpoint: 'POST /api/paper/start' },
  paperStop:        { label: 'Stop Paper Trading',    destructive: false, orderFlow: false, endpoint: 'POST /api/paper/stop' },
  paperReset:       { label: 'Reset Paper Trading',   destructive: true,  orderFlow: false, endpoint: 'POST /api/paper/reset' },
  paperResolve:     { label: 'Resolve Paper Trades',  destructive: false, orderFlow: false, endpoint: 'POST /api/paper/resolve' },
} as const

// ─── Execution mutations ──────────────────────────────────────────────────────

/** Halts trading and closes all open positions. Always confirm before firing. */
export function useEmergencyStop(onSettled?: () => void): UseMutationReturn {
  return useMutation(
    useCallback(() => services.engine.emergencyStop(), []),
    onSettled,
  )
}

/**
 * Places an order. Pass `previewOnly: true` to have the engine validate and
 * report without executing — the create endpoint supports this natively and the
 * UI uses it to show the operator what would happen before committing.
 */
export function useCreateOrder(input: CreateOrderInput | null, onSettled?: () => void): UseMutationReturn {
  const gate = useWriteGate()
  return useMutation(
    useCallback(() => {
      if (input === null) throw new Error('No order specified')
      return services.engine.createOrder(input)
    }, [input]),
    onSettled,
    gate.detail,
  )
}

export function useClosePosition(marketId: string | null, onSettled?: () => void): UseMutationReturn {
  const gate = useWriteGate()
  return useMutation(
    useCallback(() => {
      if (marketId === null) throw new Error('No market specified')
      return services.engine.closePosition(marketId)
    }, [marketId]),
    onSettled,
    gate.detail,
  )
}

export function useCancelOrder(orderId: string | null, onSettled?: () => void): UseMutationReturn {
  const gate = useWriteGate()
  return useMutation(
    useCallback(() => {
      if (orderId === null) throw new Error('No order specified')
      return services.engine.cancelOrder(orderId)
    }, [orderId]),
    onSettled,
    gate.detail,
  )
}

// ─── Paper-trading mutations ──────────────────────────────────────────────────

export function useStartPaperTrading(onSettled?: () => void): UseMutationReturn {
  return useMutation(useCallback(() => services.engine.startPaperTrading(), []), onSettled)
}

export function useStopPaperTrading(onSettled?: () => void): UseMutationReturn {
  return useMutation(useCallback(() => services.engine.stopPaperTrading(), []), onSettled)
}

/** DESTRUCTIVE — clears the entire paper trading history. Always confirm. */
export function useResetPaperTrading(onSettled?: () => void): UseMutationReturn {
  return useMutation(useCallback(() => services.engine.resetPaperTrading(), []), onSettled)
}

export function useResolvePaperTrades(onSettled?: () => void): UseMutationReturn {
  return useMutation(useCallback(() => services.engine.resolvePaperTrades(), []), onSettled)
}
