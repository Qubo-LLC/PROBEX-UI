// Endpoint diagnostics — module-level singleton, always on.
//
// Populated by:
//   • src/lib/services/index.ts — registers which registry impl was instantiated
//   • src/lib/api/client.ts     — records every completed Axios request
//
// Consumed by:
//   • System console → Diagnostics panel (production observability)
//
// Recording is unconditional: the panel is production UI (PROBEX_PRODUCT_SPEC.md
// §4 System). Cost is one small object write per HTTP response.

export interface RequestRecord {
  method:     string
  endpoint:   string
  status:     number | null
  durationMs: number | null
  startedAt:  number  // epoch ms
}

/** Rolling per-endpoint record — latest observation plus lifetime counters. */
export interface EndpointRecord {
  method:         string
  endpoint:       string
  lastStatus:     number | null   // null = network failure (no HTTP response)
  lastDurationMs: number
  lastAt:         number          // epoch ms
  count:          number
  errorCount:     number          // network failures + non-2xx responses
}

/** Resolved engine implementations the registry can install. */
export type RegistryImpl = 'MockEngineService' | 'LiveEngineService' | 'OfflineEngineService'

export interface DiagnosticsSnapshot {
  apiMode:                'mock' | 'live' | 'offline'
  apiBaseUrl:             string
  registryImpl:           RegistryImpl
  liveEngineInstantiated: boolean
  requestCount:           number
  lastRequest:            RequestRecord | null
  /** Keyed by "METHOD endpoint", insertion-ordered. */
  endpoints:              Record<string, EndpointRecord>
}

const _blank: DiagnosticsSnapshot = {
  apiMode:                'mock',
  apiBaseUrl:             '',
  registryImpl:           'MockEngineService',
  liveEngineInstantiated: false,
  requestCount:           0,
  lastRequest:            null,
  endpoints:              {},
}

let _snap: DiagnosticsSnapshot = { ..._blank }

export const diagnostics = {
  /** Called by services/index.ts at module init. */
  init(mode: 'mock' | 'live' | 'offline', baseUrl: string): void {
    _snap = { ..._snap, apiMode: mode, apiBaseUrl: baseUrl }
  },

  /** Called by services/index.ts after resolveServices() picks an impl. */
  setRegistry(impl: RegistryImpl): void {
    _snap = {
      ..._snap,
      registryImpl:           impl,
      liveEngineInstantiated: impl === 'LiveEngineService',
    }
  },

  /** Called by Axios request interceptor when a request leaves the client. */
  recordRequest(method: string, endpoint: string): void {
    _snap = {
      ..._snap,
      lastRequest: { method, endpoint, status: null, durationMs: null, startedAt: Date.now() },
    }
  },

  /**
   * Called by the Axios response interceptor for every completed request
   * (success and error paths). `status === 0` means no HTTP response arrived
   * (network failure / timeout) and is stored as `lastStatus: null`.
   */
  recordCompleted(method: string, endpoint: string, status: number, durationMs: number): void {
    const key      = `${method} ${endpoint}`
    const previous = _snap.endpoints[key]
    const isError  = status === 0 || status >= 400

    _snap = {
      ..._snap,
      requestCount: _snap.requestCount + 1,
      lastRequest:
        _snap.lastRequest && _snap.lastRequest.endpoint === endpoint
          ? { ..._snap.lastRequest, status, durationMs }
          : _snap.lastRequest,
      endpoints: {
        ..._snap.endpoints,
        [key]: {
          method,
          endpoint,
          lastStatus:     status === 0 ? null : status,
          lastDurationMs: durationMs,
          lastAt:         Date.now(),
          count:          (previous?.count ?? 0) + 1,
          errorCount:     (previous?.errorCount ?? 0) + (isError ? 1 : 0),
        },
      },
    }
  },

  /** @deprecated superseded by recordCompleted — kept for compatibility. */
  recordResponse(status: number, durationMs: number): void {
    if (!_snap.lastRequest) return
    _snap = {
      ..._snap,
      lastRequest: { ..._snap.lastRequest, status, durationMs },
    }
  },

  /** Returns a shallow copy of the current state. Safe to call from anywhere. */
  snapshot(): DiagnosticsSnapshot {
    return { ..._snap }
  },
}
