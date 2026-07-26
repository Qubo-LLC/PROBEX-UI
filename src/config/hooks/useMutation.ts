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
      if (mounted.current) {
        setState({ status: 'error', result: null, error: toServiceError(e) })
      }
      return null
    } finally {
      inFlight.current = false
    }
  }, [run, onSettled])

  const reset = useCallback(() => setState(IDLE), [])

  return { state, fire, reset, isPending: state.status === 'pending' }
}

// ─── Mutation catalogue ───────────────────────────────────────────────────────
// One entry per write endpoint, so the full set of state-changing operations is
// visible in a single place. `destructive: true` means the UI must confirm.

export const MUTATIONS = {
  emergencyStop:    { label: 'Emergency Stop',        destructive: true,  endpoint: 'POST /api/execution/emergency-stop' },
  createOrder:      { label: 'Create Order',          destructive: true,  endpoint: 'POST /api/execution/create' },
  closePosition:    { label: 'Close Position',        destructive: true,  endpoint: 'POST /api/execution/close/:market_id' },
  cancelOrder:      { label: 'Cancel Order',          destructive: true,  endpoint: 'POST /api/execution/cancel/:order_id' },
  paperStart:       { label: 'Start Paper Trading',   destructive: false, endpoint: 'POST /api/paper/start' },
  paperStop:        { label: 'Stop Paper Trading',    destructive: false, endpoint: 'POST /api/paper/stop' },
  paperReset:       { label: 'Reset Paper Trading',   destructive: true,  endpoint: 'POST /api/paper/reset' },
  paperResolve:     { label: 'Resolve Paper Trades',  destructive: false, endpoint: 'POST /api/paper/resolve' },
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
  return useMutation(
    useCallback(() => {
      if (input === null) throw new Error('No order specified')
      return services.engine.createOrder(input)
    }, [input]),
    onSettled,
  )
}

export function useClosePosition(marketId: string | null, onSettled?: () => void): UseMutationReturn {
  return useMutation(
    useCallback(() => {
      if (marketId === null) throw new Error('No market specified')
      return services.engine.closePosition(marketId)
    }, [marketId]),
    onSettled,
  )
}

export function useCancelOrder(orderId: string | null, onSettled?: () => void): UseMutationReturn {
  return useMutation(
    useCallback(() => {
      if (orderId === null) throw new Error('No order specified')
      return services.engine.cancelOrder(orderId)
    }, [orderId]),
    onSettled,
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
