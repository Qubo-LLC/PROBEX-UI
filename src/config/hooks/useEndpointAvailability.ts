'use client'

// useEndpointAvailability — the V3 availability switchboard
// (PROBEX_V3_IMPLEMENTATION_BLUEPRINT §3, Phase 0).
//
// Reads the endpoint registry (the untouched source of truth in
// lib/api/endpoints.ts) and answers a single static question for any widget:
// "does the backend capability that powers me exist yet?"
//
//   available === true   → the endpoint is 'confirmed' and callable; the widget
//                          renders its live data path (loading/error/empty/data).
//   available === false  → the endpoint is 'awaiting-backend' or 'placeholder';
//                          the widget renders the <AwaitingBackend> frame instead.
//
// This is deliberately a STATIC registry check, not a data check. Whether live
// data is currently loading/empty is the four-state concern of the widget's own
// ServiceState; availability is the prior question of whether the capability
// exists at all. Separating them keeps the truth-first contract clean and makes
// activation a one-line registry flip with zero widget change.

import { useMemo } from 'react'
import { isEndpointReady, type EndpointDef, type EndpointStatus } from '@/lib/api/endpoints'

export interface EndpointAvailability {
  /** True when the endpoint is confirmed, has a path, and the base URL is set. */
  available: boolean
  /** The raw registry status, for widgets that want to distinguish reasons. */
  status:    EndpointStatus
  /** The registry feature label, for the AwaitingBackend notice. */
  feature:   string
}

export function useEndpointAvailability(entry: EndpointDef): EndpointAvailability {
  return useMemo(
    () => ({
      available: isEndpointReady(entry),
      status:    entry.status,
      feature:   entry.feature,
    }),
    [entry],
  )
}
