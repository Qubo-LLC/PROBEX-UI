// Runtime engine configuration — the single source of truth for WHICH engine
// implementation the app talks to.
//
// ─── Why this module exists ──────────────────────────────────────────────────
// `NEXT_PUBLIC_*` values are inlined into the client bundle by `next build`.
// That permanently welds one build artifact to one environment: the same bundle
// can never be promoted dev → staging → production, and a deploy that forgets a
// variable silently ships whatever the code's fallback happens to be. That is
// exactly how a production deploy ended up rendering mock trading data.
//
// So configuration is resolved at REQUEST time on the server (where process.env
// is genuinely runtime state) and handed to the browser as a small JSON blob on
// `window.__PROBEX_RUNTIME__`. One artifact, many environments, zero rebuilds.
//
// This file is import-safe from client components: it contains only types and
// pure readers. The resolver that performs the backend probe lives in
// `runtime.server.ts` and must never be imported from client code.

export type ApiMode = 'live' | 'mock' | 'auto'

/** What the app actually ended up running. `auto` always resolves to one of these. */
export type EngineMode = 'live' | 'mock' | 'offline'

export type AppEnvironment = 'development' | 'production' | 'test'

/**
 * Deployment policy — WHERE this artifact is running, and therefore what it is
 * permitted to do.
 *
 * ─── Why this is separate from NODE_ENV ──────────────────────────────────────
 * NODE_ENV describes how the JavaScript was COMPILED (React dev warnings, dead-
 * code elimination). It is a framework implementation detail that many things
 * set incidentally — Docker base images, CI runners, custom start scripts. Using
 * it to authorise fake trading data means a deployment mistake silently becomes
 * a data-integrity incident.
 *
 * Deployment policy describes INTENT, and only a human states it. Keeping the
 * two independent means "what the app tries to do" (mode) and "what this
 * environment is allowed to do" (policy) can never be conflated.
 *
 * Chosen over a boolean `PROBEX_ALLOW_MOCK` deliberately: a boolean is a
 * permission, and permissions get flipped "just for a minute" — worse, it makes
 * `ALLOW_MOCK=true` a *legal* production configuration, which merely relocates
 * the risk. A named tier makes mock-in-production unrepresentable rather than
 * discouraged, and gives later policies (telemetry, sampling, canary gating) one
 * honest signal to derive from instead of each inventing their own.
 */
export type DeploymentPolicy = 'development' | 'test' | 'staging' | 'production'

export const DEPLOYMENT_POLICIES: readonly DeploymentPolicy[] = [
  'development', 'test', 'staging', 'production',
] as const

/**
 * Unrecognised or absent → 'production'.
 *
 * Fail-safe, not fail-open: the strictest policy is the one you get by saying
 * nothing. Forgetting to declare a deployment must never be the thing that
 * unlocks fake data. Local development opts IN via .env.local.
 */
export function normalizeDeployment(raw: string | undefined): DeploymentPolicy {
  const value = (raw ?? '').trim().toLowerCase()
  return (DEPLOYMENT_POLICIES as readonly string[]).includes(value)
    ? (value as DeploymentPolicy)
    : 'production'
}

/** True only when the raw value was a policy we actually recognise. */
export function isKnownDeployment(raw: string | undefined): boolean {
  return (DEPLOYMENT_POLICIES as readonly string[]).includes((raw ?? '').trim().toLowerCase())
}

/**
 * The single authority on whether synthetic data may ever be served.
 *
 * Staging is intentionally as strict as production: staging exists to validate
 * the artifact that is about to ship, and a staging sign-off obtained against
 * fabricated balances and trades validates nothing. It stays a distinct tier so
 * telemetry and alerting can still tell the two apart.
 */
export function isMockPermitted(policy: DeploymentPolicy): boolean {
  return policy === 'development' || policy === 'test'
}

export interface RuntimeConfig {
  /** The resolved implementation. Never 'auto'. */
  mode:          EngineMode
  /** What was asked for, before probing. Kept for diagnostics/UI copy. */
  requestedMode: ApiMode
  /** API base the browser should call. Relative ('/api') means same-origin. */
  baseUrl:       string
  /** Declared deployment intent. The ONLY authority for mock permission. */
  deployment:    DeploymentPolicy
  /** NODE_ENV. Diagnostics only — never used to authorise anything. */
  environment:   AppEnvironment
  /** Human-readable explanation of why `mode` was chosen — surfaced in the UI. */
  reason:        string
}

/** Global the server injects and the client reads. */
export const RUNTIME_GLOBAL_KEY = '__PROBEX_RUNTIME__'

declare global {
  // eslint-disable-next-line no-var
  var __PROBEX_RUNTIME__: RuntimeConfig | undefined
}

/**
 * Same-origin default. Behind any reverse proxy that serves the API next to the
 * app (the production nginx bridge does exactly this), a relative base needs no
 * environment knowledge whatsoever — which is what makes one build portable.
 */
export const DEFAULT_BASE_URL = '/api'

/**
 * First value that is actually present. `??` is wrong here: an env var set to
 * the empty string is not `undefined`, so `PROBEX_X ?? NEXT_PUBLIC_X` silently
 * ignores the legacy fallback whenever the new var is declared-but-blank — a
 * shape templated env files and CI secret injection produce constantly. Losing
 * a base URL that way would look exactly like a broken backend.
 */
export function firstPresent(...values: (string | undefined)[]): string | undefined {
  return values.find((value) => (value ?? '').trim() !== '')
}

export function normalizeApiMode(raw: string | undefined): ApiMode {
  const value = (raw ?? '').trim().toLowerCase()
  return value === 'live' || value === 'mock' || value === 'auto' ? value : 'auto'
}

/**
 * Canonicalises the API base: trailing slashes stripped, blank → default.
 *
 * A base must be either an absolute http(s) URL or a root-relative path. Anything
 * else is a misconfiguration, and accepting it silently produces a confusing
 * "backend unreachable" state instead of naming the real problem — so a
 * malformed value falls back to the default and reports itself.
 *
 * This is not hypothetical: a Windows shell rewrote a literal `/api` argument
 * into `C:/Program Files/Git/api`, and the app took it without complaint.
 */
export function normalizeBaseUrl(raw: string | undefined): { baseUrl: string; problem: string | null } {
  const value = (raw ?? '').trim().replace(/\/+$/, '')
  if (value === '') return { baseUrl: DEFAULT_BASE_URL, problem: null }

  if (isAbsoluteUrl(value)) {
    try {
      new URL(value)
      return { baseUrl: value, problem: null }
    } catch {
      return { baseUrl: DEFAULT_BASE_URL, problem: `malformed absolute URL "${value}"` }
    }
  }

  if (value.startsWith('/')) return { baseUrl: value, problem: null }

  return {
    baseUrl: DEFAULT_BASE_URL,
    problem: `"${value}" is neither an absolute http(s) URL nor a root-relative path`,
  }
}

export function normalizeEnvironment(raw: string | undefined): AppEnvironment {
  return raw === 'production' || raw === 'test' ? raw : 'development'
}

/** True when the base points at another origin (so it can be probed directly). */
export function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/**
 * Reads the effective config.
 *
 * In the browser this is the server-resolved blob — including the outcome of the
 * backend probe. During SSR (and in the sliver before injection) it degrades to
 * an env-only read.
 *
 * ⚠️ The SSR fallback deliberately never returns 'mock' unless mock was asked
 * for explicitly. Mock is the only mode whose `peek*` methods return data
 * synchronously, so an SSR/client disagreement about mock is the one case that
 * produces a hydration mismatch. 'live' and 'offline' both start in the loading
 * state and therefore render identically on first paint.
 */
export function readRuntimeConfig(): RuntimeConfig {
  if (typeof window !== 'undefined' && window.__PROBEX_RUNTIME__) {
    return window.__PROBEX_RUNTIME__
  }

  const requestedMode = normalizeApiMode(
    firstPresent(process.env.PROBEX_API_MODE, process.env.NEXT_PUBLIC_API_MODE),
  )
  const { baseUrl } = normalizeBaseUrl(
    firstPresent(process.env.PROBEX_API_BASE_URL, process.env.NEXT_PUBLIC_API_BASE_URL),
  )
  const environment = normalizeEnvironment(process.env.NODE_ENV)
  const deployment  = normalizeDeployment(process.env.PROBEX_DEPLOYMENT)

  // Mock is honoured here only if the policy permits it; otherwise this falls
  // through to 'live', which renders identically to 'offline' on first paint.
  const mockOk = requestedMode === 'mock' && isMockPermitted(deployment)

  return Object.freeze({
    mode:          mockOk ? 'mock' : 'live',
    requestedMode,
    baseUrl,
    deployment,
    environment,
    reason:        'Runtime config not injected yet — using environment defaults.',
  })
}
