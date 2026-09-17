'use client'

// useMarketHistory — one market's recorded snapshots from
// /api/markets/:market_id/history.
//
// Lifted out of MarketCharts (which fetched it privately) because the history
// is the one record that OUTLIVES a market: /api/markets/:id answers 404 the
// moment a window rotates out, but its snapshots — carrying the question,
// prices and BTC path — remain. Market Detail needs them for the identity of an
// expired market and its recorded trajectory, not only for the charts.
//
// Fetched per-market on mount rather than through the polled store: the payload
// is market-scoped and only relevant while the page is open. Refetches when
// marketId changes; aborts in flight when the operator moves on.
//
// The adapter (toMarketPriceHistory) sorts snapshots OLDEST-FIRST — the wire
// is newest-first (re-verified 2026-09-16) — and parses the naive UTC clock.

import { useEffect, useState } from 'react'
import { services } from '@/lib/services'
import { readEphemeral } from '@/lib/api/resourceLifecycle'
import { isCanceledError } from '@/lib/services/response'
import type { MarketPriceHistory } from '@/types/engine'

/** Backend caps at 1000; 200 snapshots is well beyond one market's life. */
const SNAPSHOT_LIMIT = 200

export type MarketHistoryState =
  | { status: 'loading' }
  /** The engine holds no record for this id — the normal end of a market's
   *  life, not a fault. */
  | { status: 'expired' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: MarketPriceHistory }

export function useMarketHistory(marketId: string): MarketHistoryState {
  const [state, setState] = useState<MarketHistoryState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setState({ status: 'loading' })

    // No `refreshId` on purpose: substituting a DIFFERENT market's history under
    // a heading that names this one would be a silent lie. This is "give me
    // THIS market", not "give me the current one".
    readEphemeral(marketId, (id) =>
      services.engine
        .getMarketPriceHistory(id, SNAPSHOT_LIMIT, controller.signal)
        .then((r) => r.data),
    ).then((outcome) => {
      if (!active) return
      if (outcome.kind === 'ok')           setState({ status: 'ready', data: outcome.value })
      else if (outcome.kind === 'expired') setState({ status: 'expired' })
      // readEphemeral folds an abort into `unavailable`; cancelling is the
      // caller's own act and must not surface as "history unavailable".
      else if (!isCanceledError(outcome.error)) setState({ status: 'error', message: outcome.error.message })
    })

    return () => { active = false; controller.abort() }
  }, [marketId])

  return state
}
