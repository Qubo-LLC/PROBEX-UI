// Central env access — application code reads from here, never process.env
// directly. NEXT_PUBLIC_* is client-safe; non-prefixed vars are server-only
// (see getServerEnv). Call validateEnv() at startup to catch missing vars.

// ─── Public (client-safe) ────────────────────────────────────────────────

export const env = {
  /** 'development' | 'production' | 'test' */
  NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test',

  /** 'mock' | 'live' — controls which service implementation is used */
  API_MODE: (process.env.NEXT_PUBLIC_API_MODE ?? 'mock') as 'mock' | 'live',

  /**
   * Single source of truth for the backend base URL (shared API client + live
   * services). Already includes the `/api` prefix, e.g. `https://<host>:<port>/api`
   * — set only via env (see .env.example), never hardcoded.
   */
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',

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

interface EnvRequirement {
  key: string
  serverOnly: boolean
  required: boolean
  description: string
}

const ENV_REQUIREMENTS: EnvRequirement[] = [
  // The engine API base is the only variable live mode cannot run without.
  // Consensus/WS/auth/database vars return to this list when those layers
  // actually ship — requiring them today would fail production builds for
  // features the app does not yet consume.
  {
    key: 'NEXT_PUBLIC_API_BASE_URL',
    serverOnly: false,
    required: env.API_MODE === 'live',
    description: 'Probex backend API base URL',
  },
]

/**
 * Validate env at startup. Runs at module scope in the root layout, so in a
 * production build (`next build`, NODE_ENV=production) it executes during static
 * generation — a thrown error there FAILS THE BUILD. That is intentional: it
 * turns silent misconfiguration into a loud, early failure.
 *
 * Fatal (throw in production, warn in dev):
 *   • a required var is missing
 *   • production build with NEXT_PUBLIC_API_MODE unset — the exact bug that
 *     shipped the DuckDNS deploy in MOCK mode, because the code defaults an
 *     unset mode to 'mock' and nothing caught it. Explicit `mock` is allowed
 *     (for intentional demo builds); only the *unset* case fails.
 *
 * Non-fatal (always warn):
 *   • live mode with an http:// base URL — an HTTPS page blocks it as mixed
 *     content, which looks exactly like "no data".
 */
export function validateEnv(): void {
  const problems: string[] = []
  const warnings: string[] = []

  for (const req of ENV_REQUIREMENTS) {
    if (!req.required) continue
    const value = process.env[req.key]
    if (!value || value.trim() === '') {
      problems.push(`  ${req.key} — ${req.description}`)
    }
  }

  // Guard against the silent mock fallback in a production build.
  if (env.NODE_ENV === 'production') {
    const rawMode = process.env.NEXT_PUBLIC_API_MODE
    if (!rawMode || rawMode.trim() === '') {
      problems.push(
        '  NEXT_PUBLIC_API_MODE — must be set explicitly for a production build ' +
        '(unset defaults to "mock", which ships fake data). Set NEXT_PUBLIC_API_MODE=live.',
      )
    }
  }

  if (env.API_MODE === 'live' && env.API_BASE_URL.startsWith('http://')) {
    warnings.push(
      `  NEXT_PUBLIC_API_BASE_URL is http:// (${env.API_BASE_URL}). An HTTPS deployment ` +
      'blocks these requests as mixed content — use https:// or a same-origin /api path.',
    )
  }

  if (warnings.length > 0) {
    console.warn(['[Probex] Environment warnings:', ...warnings].join('\n'))
  }

  if (problems.length > 0) {
    const message = [
      '[Probex] Environment misconfiguration:',
      ...problems,
      '',
      'Set these in the build environment (NEXT_PUBLIC_* are inlined at build time, ' +
      'not at runtime). See .env.example and docs/DEPLOYMENT.md.',
    ].join('\n')

    if (env.NODE_ENV === 'production') {
      throw new Error(message)
    } else {
      console.warn(message)
    }
  }
}
