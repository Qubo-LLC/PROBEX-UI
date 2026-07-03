// Shared Axios client for the Probex backend/engine. The base URL comes solely
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
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { env } from '@/config/env'
import { ServiceException } from '@/lib/services/response'
import { diagnostics } from '@/lib/diagnostics'

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
      if (process.env.NODE_ENV === 'development') {
        console.debug(
          `[${label}] ${method} ${endpoint} | Status:${status} | Duration:${durationMs}ms`,
        )
      }
      return response
    },
    (error: AxiosError) => {
      const meta       = error.config?._reqMeta
      const durationMs = meta ? Date.now() - meta.startTime : 0
      const method     = meta?.method ?? (error.config?.method ?? 'GET').toUpperCase()
      const endpoint   = meta?.endpoint ?? (error.config?.url ?? '')
      const status     = error.response?.status ?? 0

      diagnostics.recordCompleted(method, endpoint, status, durationMs)
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

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL, // '' until NEXT_PUBLIC_API_BASE_URL is provided
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

attachRequestInterceptor(apiClient, 'LIVE')
attachResponseInterceptor(apiClient, 'LIVE')

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

const hostBaseURL = env.API_BASE_URL.replace(/\/api\/?$/, '')

export const hostClient: AxiosInstance = axios.create({
  baseURL: hostBaseURL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

attachRequestInterceptor(hostClient, 'LIVE')
attachResponseInterceptor(hostClient, 'LIVE')

// ─── Typed helpers ───────────────────────────────────────────────────────────

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const res = await apiClient.get<T>(path, params ? { params } : undefined)
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
): Promise<T> {
  const res = await hostClient.get<T>(path, params ? { params } : undefined)
  return res.data
}
