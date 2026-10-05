// Shared Axios client for the Synatra backend/engine. The base URL comes solely
// from NEXT_PUBLIC_API_BASE_URL (via config/env) — no hardcoded URLs. The base
// already includes the `/api` prefix, so endpoint paths (from the endpoint
// registry) are appended directly. Failures are normalized to the same
// ServiceException codes the service layer already uses, so live services and
// hooks get consistent error handling.
//
// Authentication is intentionally NOT wired here yet — the request interceptor is
// the single place to attach it once the backend auth contract is defined.
//
// Dev diagnostics: in NODE_ENV=development every request/response is recorded to
// the diagnostics singleton and logged to the console in a structured format.
// These branches are dead-code-eliminated in production builds.

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { env } from '@/config/env'
import { readRuntimeConfig } from '@/config/runtime'
import { ServiceException, CANCELED_CODE } from '@/lib/services/response'
import { diagnostics } from '@/lib/diagnostics'
import {
  circuitKey, isCircuitOpen, circuitCooldownSeconds,
  recordSuccess, recordFailure, recordAnswered,
} from './circuitBreaker'

// ─── Request timing metadata ─────────────────────────────────────────────────
// Attached to each outgoing request so the response interceptor can compute
// wall-clock duration. TypeScript module augmentation lets us carry this on the
// config object without casting.

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _reqMeta?: { method: string; endpoint: string; startTime: number }
  }
}

const DEFAULT_TIMEOUT_MS = 15_000

// ─── Interceptor factories ───────────────────────────────────────────────────
// Both clients (apiClient and hostClient) share identical interceptor logic;
// the only difference is the label used in console output.

function attachRequestInterceptor(client: AxiosInstance, label: string): void {
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const method   = (config.method ?? 'get').toUpperCase()
      const endpoint = config.url ?? ''
      config._reqMeta = { method, endpoint, startTime: Date.now() }

      // Refuse to send while this endpoint's circuit is open. A hanging engine
      // route costs a backend worker for the full timeout, and the polling
      // loader would otherwise keep one parked on it indefinitely — see
      // circuitBreaker.ts for the incident this prevents.
      const key = circuitKey(method, endpoint, config.baseURL)
      if (isCircuitOpen(key)) {
        const seconds = circuitCooldownSeconds(key)
        diagnostics.recordRequest(method, endpoint)
        diagnostics.recordCompleted(method, endpoint, 0, 0)
        return Promise.reject(
          new ServiceException(
            'CIRCUIT_OPEN',
            `${endpoint} stopped responding — pausing requests for ${seconds}s`,
            true,
          ),
        )
      }

      // Diagnostics recording is always on — it feeds the System console
      // Diagnostics panel in production. Console logging stays dev-only.
      diagnostics.recordRequest(method, endpoint)
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${label}] ${method} ${endpoint}`)
      } else if (env.DEBUG) {
        console.debug(`[${label}] → ${method} ${config.baseURL ?? ''}${endpoint}`)
      }
      return config
    },
    (error: unknown) => Promise.reject(error),
  )
}

function attachResponseInterceptor(client: AxiosInstance, label: string): void {
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      const meta       = response.config._reqMeta
      const durationMs = meta ? Date.now() - meta.startTime : 0
      const method     = meta?.method ?? (response.config.method ?? 'GET').toUpperCase()
      const endpoint   = meta?.endpoint ?? (response.config.url ?? '')
      const status     = response.status

      diagnostics.recordCompleted(method, endpoint, status, durationMs)
      recordSuccess(circuitKey(method, endpoint, response.config.baseURL))
      if (process.env.NODE_ENV === 'development') {
        console.debug(
          `[${label}] ${method} ${endpoint} | Status:${status} | Duration:${durationMs}ms`,
        )
      }
      return response
    },
    (error: AxiosError) => {
      // A CIRCUIT_OPEN rejection is raised by the REQUEST interceptor and never
      // reaches the network, so it arrives here already normalised — and
      // already recorded in diagnostics. Returning early avoids both a
      // duplicate diagnostics entry under an empty endpoint (it carries no
      // Axios config) and the normaliser relabelling it as a generic network
      // error, which would erase the reason the request was refused.
      if (error instanceof ServiceException) return Promise.reject(error)

      const meta       = error.config?._reqMeta
      const durationMs = meta ? Date.now() - meta.startTime : 0
      const method     = meta?.method ?? (error.config?.method ?? 'GET').toUpperCase()
      const endpoint   = meta?.endpoint ?? (error.config?.url ?? '')
      const status     = error.response?.status ?? 0

      // A cancellation is OUR OWN doing — the caller unmounted or superseded the
      // request — so it is not evidence about the backend and must not be
      // treated as one. It deliberately skips the circuit breaker: an aborted
      // request looks exactly like a network failure (no response, no status),
      // and counting it would let ordinary route changes trip circuits and
      // suppress endpoints that were never unhealthy. It is still recorded in
      // diagnostics, where seeing cancellations is useful.
      if (isCancellation(error)) {
        diagnostics.recordCompleted(method, endpoint, 0, durationMs)
        return Promise.reject(
          new ServiceException(CANCELED_CODE, 'Request canceled', false),
        )
      }

      diagnostics.recordCompleted(method, endpoint, status, durationMs)

      // Only the failure modes that COST the backend a worker feed the breaker.
      // A 4xx/5xx is a fast answer and merely clears the streak.
      const key = circuitKey(method, endpoint, error.config?.baseURL)
      if (error.response === undefined) recordFailure(key)
      else                              recordAnswered(key)

      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[${label}] ${method} ${endpoint} | Status:${status || 'ERR'} | Duration:${durationMs}ms`,
        )
      }
      return Promise.reject(toServiceException(error))
    },
  )
}

// ─── /api client ─────────────────────────────────────────────────────────────

// Base URL comes from the RUNTIME config (server-resolved, injected per
// deployment) rather than a build-time constant, so one artifact can be pointed
// at dev / staging / production without rebuilding. Defaults to the relative
// '/api', which is correct for any reverse proxy that serves the API alongside
// the app — no environment knowledge required.
const apiBaseURL = readRuntimeConfig().baseUrl

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseURL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

attachRequestInterceptor(apiClient, 'LIVE')
attachResponseInterceptor(apiClient, 'LIVE')

// ─── Cancellation ────────────────────────────────────────────────────────────

/**
 * True when a request ended because it was aborted via its AbortSignal.
 *
 * Axios reports this as `ERR_CANCELED`, which is distinct from `ECONNABORTED`
 * (the timeout). Both arrive with no `response`, so the code is the only thing
 * that separates "we stopped caring" from "the engine never answered" — and
 * those two must never be conflated: one is routine, the other is a fault.
 */
function isCancellation(error: AxiosError): boolean {
  return error.code === 'ERR_CANCELED' || error.name === 'CanceledError'
}

// ─── Error normalizer ────────────────────────────────────────────────────────

function toServiceException(error: AxiosError): ServiceException {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new ServiceException('TIMEOUT', 'Request timed out', true)
    }
    return new ServiceException('NETWORK', error.message || 'Network error', true)
  }
  const status = error.response.status
  const code =
    status === 401 ? 'UNAUTHORIZED' :
    status === 403 ? 'FORBIDDEN'    :
    status === 404 ? 'NOT_FOUND'    :
    status === 429 ? 'RATE_LIMITED' :
    status >= 500  ? 'SERVER_ERROR' :
                     'HTTP_ERROR'
  return new ServiceException(code, `Request failed (${status})`, status >= 500 || status === 429)
}

// ─── Host-root client ────────────────────────────────────────────────────────
// Strips the /api suffix so /health and / resolve against the bare host.

const hostBaseURL = apiBaseURL.replace(/\/api\/?$/, '')

export const hostClient: AxiosInstance = axios.create({
  baseURL: hostBaseURL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

attachRequestInterceptor(hostClient, 'LIVE')
attachResponseInterceptor(hostClient, 'LIVE')

// ─── Typed helpers ───────────────────────────────────────────────────────────

/**
 * Builds the per-request Axios config.
 *
 * `signal` is threaded through the READ helpers only. Aborting a GET is always
 * safe — the response is discarded and nothing changed server-side. Aborting a
 * POST is not: the request may already have reached the engine and been
 * applied, and the caller has no way to tell which. Mutations therefore have no
 * cancellation path on purpose (useMutation drops concurrent invocations
 * instead of racing them).
 */
function requestConfig(
  params?: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal,
): AxiosRequestConfig | undefined {
  if (params === undefined && signal === undefined) return undefined
  const config: AxiosRequestConfig = {}
  if (params !== undefined) config.params = params
  if (signal !== undefined) config.signal = signal
  return config
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await apiClient.get<T>(path, requestConfig(params, signal))
  return res.data
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiClient.post<T>(path, body)
  return res.data
}

/** Like apiGet but uses the host-root base (for /health, / — outside /api). */
export async function apiGetHost<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await hostClient.get<T>(path, requestConfig(params, signal))
  return res.data
}
