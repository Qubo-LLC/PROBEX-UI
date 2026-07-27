// Engine Offline service.
//
// Used when the app is configured for real data but the backend cannot be
// reached AND the environment is production. It is deliberately NOT a degraded
// mock: every read rejects, so the existing four-state UI (loading/success/
// empty/error) renders honest error states and the operator sees "engine
// offline" instead of a dashboard full of invented positions and P&L.
//
// Implemented as a Proxy rather than ~90 hand-written stubs so it cannot drift
// out of sync with IEngineService as the interface grows.

import { ServiceException } from './response'
import type { IEngineService } from './interfaces'

export const ENGINE_OFFLINE_CODE = 'ENGINE_OFFLINE'

/**
 * Creates a service whose every call rejects with a retryable ENGINE_OFFLINE
 * error.
 *
 * `peek*` members resolve to `undefined` — exactly as they do on
 * LiveEngineService — so hooks fall through to their loading state on first
 * paint and there is no synchronous snapshot to disagree about during
 * hydration.
 */
export function createOfflineEngineService(reason: string): IEngineService {
  const message = `Engine offline — ${reason}`

  return new Proxy({} as IEngineService, {
    get(_target, property) {
      if (typeof property !== 'string') return undefined

      // Never look thenable: an accidental `await services.engine` must not
      // hang or resolve to a half-built object.
      if (property === 'then') return undefined

      // Match the live service: no synchronous snapshots.
      if (property.startsWith('peek')) return undefined

      return () => Promise.reject(new ServiceException(ENGINE_OFFLINE_CODE, message, true))
    },

    // Must agree with `get`, or feature-detection lies: `'peekHealth' in svc`
    // returning true while the property reads back undefined is exactly the
    // kind of inconsistency that makes a Proxy hard to reason about.
    has(_target, property) {
      return (
        typeof property === 'string' &&
        property !== 'then' &&
        !property.startsWith('peek')
      )
    },
  })
}
