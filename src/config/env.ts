// Central env access — application code reads from here, never process.env
// directly. NEXT_PUBLIC_* is client-safe; non-prefixed vars are server-only
// (see getServerEnv). Call validateEnv() at startup to catch missing vars.

// ─── Public (client-safe) ────────────────────────────────────────────────

export const env = {
  /** 'development' | 'production' | 'test' */
  NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test',

  /**
   * @deprecated Build-time mirror of the legacy NEXT_PUBLIC_API_MODE.
   * Service selection now comes from the runtime config (config/runtime.ts),
   * which supports 'auto' and is resolved per request. Kept only so existing
   * deployments that still set the NEXT_PUBLIC_* names keep working.
   */
  API_MODE: (process.env.NEXT_PUBLIC_API_MODE ?? 'auto') as 'mock' | 'live' | 'auto',

  /**
   * Single source of truth for the backend base URL (shared API client + live
   * services). Already includes the `/api` prefix, e.g. `https://<host>:<port>/api`
   * — set only via env (see .env.example), never hardcoded.
   *
   * Trailing slashes are stripped so the configured value is canonical: whether
   * the deploy sets `.../api` or `.../api/`, requests are built as `/api/<path>`
   * (axios appends the endpoint), and the bare `/api` — which the nginx bridge
   * 301-redirects to `/api/` — is never sent. This makes the exact trailing
   * slash in the env var irrelevant.
   */
  API_BASE_URL: (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, ''),

  /** Base URL for the Consensus Engine API */
  CONSENSUS_API_URL: process.env.NEXT_PUBLIC_CONSENSUS_API_URL ?? '',

  /** WebSocket endpoint for live market updates */
  WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? '',

  /**
   * Active Polygon network.
   * 137 = mainnet, 80002 = Amoy testnet
   */
  CHAIN_ID: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '80002') as 137 | 80002,

  /** WalletConnect project ID (public, safe to expose) */
  WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',

  /** Application URL (for OAuth callbacks, meta tags) */
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',

  /** Whether to enable verbose debug logging */
  DEBUG: process.env.NEXT_PUBLIC_DEBUG === 'true',
} as const

// ─── Server-only (never expose to client) ───────────────────────────────
// Function wrapper throws if imported client-side, preventing secret leakage.
export function getServerEnv() {
  if (typeof window !== 'undefined') {
    throw new Error(
      '[Probex] getServerEnv() called on the client. ' +
      'Server-only environment variables must only be accessed in server components, ' +
      'API routes, or middleware.'
    )
  }

  return {
    /** JWT signing secret */
    JWT_SECRET: process.env.JWT_SECRET ?? '',

    /** Database connection string */
    DATABASE_URL: process.env.DATABASE_URL ?? '',

    /** KYC provider API key */
    KYC_API_KEY: process.env.KYC_API_KEY ?? '',

    /** Internal API secret for service-to-service calls */
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET ?? '',

    /** Session cookie secret */
    SESSION_SECRET: process.env.SESSION_SECRET ?? '',
  } as const
}

// ─── Build-time validation ───────────────────────────────────────────────

/**
 * Startup environment sanity check. Runs at module scope in the root layout.
 *
 * This deliberately no longer THROWS on a missing API variable. It used to, as
 * a guard against a production build silently defaulting to mock data — but a
 * build-time guard cannot protect a deployment that never runs a build (the
 * production incident was a `next dev` host, where NODE_ENV is 'development'
 * and the guard was skipped entirely).
 *
 * That failure mode is now structurally impossible rather than merely policed:
 * service selection happens at runtime, and in production an unreachable
 * backend resolves to the Engine Offline state, never to mock
 * (config/runtime.server.ts). With no silent-mock path left to guard, a hard
 * build failure would only block the very portability this design provides —
 * an artifact must be buildable without knowing where it will be deployed.
 *
 * What remains are warnings for configurations that are legal but likely wrong.
 */
export function validateEnv(): void {
  const warnings: string[] = []

  const legacyMode = process.env.NEXT_PUBLIC_API_MODE
  const legacyBase = process.env.NEXT_PUBLIC_API_BASE_URL

  if ((legacyMode ?? '') !== '' || (legacyBase ?? '') !== '') {
    warnings.push(
      '  NEXT_PUBLIC_API_MODE / NEXT_PUBLIC_API_BASE_URL are set. These are inlined ' +
      'at BUILD time, which welds the artifact to one environment. Prefer the ' +
      'runtime equivalents PROBEX_API_MODE / PROBEX_API_BASE_URL, which are read ' +
      'per request and let one build serve dev, staging and production.',
    )
  }

  const base = process.env.PROBEX_API_BASE_URL ?? legacyBase ?? ''
  if (env.NODE_ENV === 'production' && base.startsWith('http://')) {
    warnings.push(
      `  API base URL is http:// (${base}). An HTTPS deployment blocks these requests ` +
      'as mixed content, which presents exactly like "no data". Use https://, or the ' +
      'default same-origin "/api" path.',
    )
  }

  if (warnings.length > 0) {
    console.warn(['[Probex] Environment warnings:', ...warnings].join('\n'))
  }
}
