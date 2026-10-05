// Server-side resolution of the runtime engine configuration.
//
// SERVER ONLY. This module performs the backend availability probe and reads
// non-public environment variables; it must never be imported from a client
// component. Client code reads the resolved result via `readRuntimeConfig()`
// in `./runtime.ts`.
//
// Environment variables (all read at REQUEST time, so one build serves every
// environment — see the header comment in ./runtime.ts):
//
//   SYNATRA_API_MODE       live | mock | auto        (default: auto)
//   SYNATRA_API_BASE_URL   e.g. /api  or  https://host/api   (default: /api)
//   SYNATRA_API_PROBE_URL  optional absolute URL for the server-side probe,
//                         e.g. http://127.0.0.1:8000/health — lets the server
//                         check the engine directly instead of looping back
//                         through the public reverse proxy.
//
// The legacy NEXT_PUBLIC_* names are still honoured as a fallback so existing
// deployments keep working, but they are build-time-inlined and therefore the
// non-portable option. Prefer the SYNATRA_* names.

import {
  type ApiMode,
  type DeploymentPolicy,
  type EngineMode,
  type RuntimeConfig,
  type StartupProbe,
  firstPresent,
  isAbsoluteUrl,
  isMockPermitted,
  normalizeApiMode,
  normalizeBaseUrl,
  normalizeDeployment,
  normalizeEnvironment,
} from './runtime'

/**
 * Thrown when the declared deployment policy forbids the requested mode.
 * Surfaced at process start by src/instrumentation.ts so a misconfigured deploy
 * dies on boot rather than serving fabricated trading data.
 */
export class InvalidDeploymentConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidDeploymentConfigError'
  }
}

export function readDeploymentPolicy(): DeploymentPolicy {
  return normalizeDeployment(process.env.SYNATRA_DEPLOYMENT)
}

/**
 * The hard gate. Throws when mock data is requested somewhere it must never
 * appear. Called at startup AND on every resolution — a single check that can
 * be skipped is not a guarantee.
 */
export function assertDeploymentPolicy(): void {
  const requested  = readRequestedMode()
  const deployment = readDeploymentPolicy()

  if (requested === 'mock' && !isMockPermitted(deployment)) {
    throw new InvalidDeploymentConfigError(
      `Refusing to start: SYNATRA_API_MODE=mock is forbidden when ` +
      `SYNATRA_DEPLOYMENT=${deployment}.\n\n` +
      'Mock mode serves fabricated balances, trades and market data. Shipping it ' +
      'to a real deployment is a data-integrity incident, so this is a fatal ' +
      'configuration error rather than a warning.\n\n' +
      'Fix one of the following:\n' +
      '  • Set SYNATRA_API_MODE=auto (or live) for this deployment, or\n' +
      '  • Set SYNATRA_DEPLOYMENT=development|test if this really is a ' +
      'non-production environment that is allowed to show synthetic data.\n\n' +
      'Note: SYNATRA_DEPLOYMENT defaults to "production" when unset, on purpose — ' +
      'forgetting to declare it must never be what unlocks fake data.',
    )
  }
}

/**
 * Probe budget per attempt. Short enough that a hung backend does not stall page
 * render, generous enough to survive process cold-start contention.
 *
 * Sized from measurement, not guesswork: a healthy probe through the public
 * proxy takes ~1.0s. At the original 2.5s a cold start under load intermittently
 * timed out and declared a perfectly healthy engine OFFLINE.
 */
const PROBE_TIMEOUT_MS = 4_000

/**
 * A single failure is not proof. "Engine Offline" is a loud, trust-destroying
 * alarm on a trading cockpit, so it must survive a corroborating second attempt
 * — one transient blip must never raise it. Costs nothing on the healthy path
 * (the first attempt returns), and the retry only ever runs when the backend
 * already looks down.
 */
const PROBE_ATTEMPTS = 2
const PROBE_RETRY_DELAY_MS = 250

/**
 * Hard ceiling on the ENTIRE probe operation, across every attempt and target.
 *
 * Per-attempt timeouts alone are not a bound: attempts × targets multiplies
 * them. A relative base with no reverse proxy in front makes the server derive
 * a probe URL pointing at itself; `/api/health` is not a route under basePath,
 * so Next renders the 404 page, which re-enters the root layout — the request
 * then stalls for the full product of every timeout. Measured at 16.7s before
 * this ceiling existed. Production is immune (nginx matches `^~ /api/` first),
 * but un-proxied `next start` and Docker are not.
 */
const PROBE_TOTAL_BUDGET_MS = 5_000

/**
 * Probe results are cached so a burst of requests costs one network call.
 * Failures expire faster than successes so recovery is picked up promptly
 * without hammering a backend that is already struggling.
 */
const CACHE_TTL_HEALTHY_MS = 15_000
const CACHE_TTL_FAILED_MS  = 5_000

interface CacheEntry {
  config:    RuntimeConfig
  expiresAt: number
  /** Inputs the entry was computed from; a change invalidates it. */
  key:       string
}

let cache: CacheEntry | null = null

/**
 * In-flight probe, shared by concurrent callers.
 *
 * Without this, every request arriving after the TTL expires starts its own
 * probe — a thundering herd against a backend that may already be failing, and
 * N simultaneous 2.5s stalls. One probe in flight at a time; everyone else
 * either awaits it (cold start) or is served stale (warm).
 */
let inFlight: Promise<RuntimeConfig> | null = null

function readRequestedMode(): ApiMode {
  return normalizeApiMode(
    firstPresent(process.env.SYNATRA_API_MODE, process.env.NEXT_PUBLIC_API_MODE),
  )
}

/**
 * Candidate health URLs, in priority order.
 *
 * Two topologies exist and both must work from one config:
 *   • Reverse proxy (staging/prod): the bridge maps `/api/health` onto the
 *     engine's `/health`, and the engine's own host root is NOT the engine.
 *   • Base pointing straight at the engine (typical local dev): the engine
 *     serves `/health` at its host root and has no `/api/health`.
 * Trying `<base>/health` first and host-root `/health` second covers both, and
 * mirrors the same ordering used by LiveEngineService.getHealth().
 */
function probeTargets(baseUrl: string, origin: string | null): string[] {
  const explicit = process.env.SYNATRA_API_PROBE_URL?.trim()
  if (explicit) return [explicit]

  const absoluteBase = isAbsoluteUrl(baseUrl)
    ? baseUrl
    : origin
      ? `${origin.replace(/\/+$/, '')}${baseUrl}`
      : null

  if (!absoluteBase) return []

  const targets = [`${absoluteBase}/health`]

  // Host-root fallback (dev: engine served directly at its origin).
  try {
    targets.push(`${new URL(absoluteBase).origin}/health`)
  } catch {
    // Malformed base — the primary target is still worth attempting.
  }

  return [...new Set(targets)]
}

type AttemptResult = 'ok' | 'timeout' | 'failed'

async function fetchOk(url: string, budgetMs: number): Promise<AttemptResult> {
  const controller = new AbortController()
  // Whichever expires first: this attempt's slice, or what remains of the
  // overall budget.
  const timer = setTimeout(() => controller.abort(), Math.min(PROBE_TIMEOUT_MS, budgetMs))
  try {
    const res = await fetch(url, {
      signal:  controller.signal,
      cache:   'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return 'failed'
    // A reverse proxy that falls through to a marketing site answers 200 with
    // HTML. Requiring JSON is what distinguishes "the engine replied" from
    // "something replied", and prevents a false healthy verdict.
    const contentType = res.headers.get('content-type') ?? ''
    return contentType.includes('json') ? 'ok' : 'failed'
  } catch {
    // Our own abort means "no answer yet", which is not the same fact as a
    // refused connection or a DNS failure.
    return controller.signal.aborted ? 'timeout' : 'failed'
  } finally {
    clearTimeout(timer)
  }
}

/**
 * `timeout` whenever any attempt ran out of time (or the budget ran out) and
 * none succeeded. A definite failure on the host-root fallback does not turn a
 * slow primary target into "unreachable" — in production the fallback is not
 * the engine at all.
 */
async function probeBackend(
  baseUrl: string,
  origin: string | null,
): Promise<{ outcome: 'reachable' | 'timeout' | 'unreachable'; detail: string }> {
  const targets = probeTargets(baseUrl, origin)
  if (targets.length === 0) {
    return {
      outcome: 'unreachable',
      detail:  'no absolute probe URL could be derived (relative base and unknown origin)',
    }
  }

  const deadline = Date.now() + PROBE_TOTAL_BUDGET_MS
  const remaining = () => deadline - Date.now()
  let timedOut = false

  for (let attempt = 1; attempt <= PROBE_ATTEMPTS; attempt++) {
    for (const target of targets) {
      if (remaining() <= 0) {
        return { outcome: 'timeout', detail: `probe budget exhausted: ${targets.join(', ')}` }
      }
      const result = await fetchOk(target, remaining())
      if (result === 'ok') {
        return { outcome: 'reachable', detail: `probe succeeded: ${target} (attempt ${attempt})` }
      }
      if (result === 'timeout') timedOut = true
    }
    if (attempt < PROBE_ATTEMPTS && remaining() > PROBE_RETRY_DELAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, PROBE_RETRY_DELAY_MS))
    }
  }

  return {
    outcome: timedOut ? 'timeout' : 'unreachable',
    detail:  `probe ${timedOut ? 'timed out' : 'failed'} after ${PROBE_ATTEMPTS} attempts: ${targets.join(', ')}`,
  }
}

/**
 * Resolves which engine implementation this request should use.
 *
 * `origin` is the public origin of the current request (scheme + host), used to
 * turn a relative API base into something the server can probe. Pass null when
 * unavailable; an explicit SYNATRA_API_PROBE_URL makes it unnecessary.
 *
 * Decision table:
 *
 *   requested  backend    deployment     → resolved
 *   ─────────  ─────────  ─────────────    ────────
 *   live       (n/a)      any            → live      (explicit; never probed)
 *   mock       (n/a)      dev/test       → mock      (explicit opt-in only)
 *   mock       (n/a)      staging/prod   → FATAL     (assertDeploymentPolicy throws)
 *   auto       healthy    any            → live
 *   auto       no answer  any            → live      (startupProbe 'timeout'; the
 *                                                     client's requests decide)
 *   auto       failed     any            → offline   (NEVER mock — see below)
 *
 * ─── Why `auto` no longer falls back to mock in development ──────────────────
 * It used to: `auto` + unreachable + development resolved to `mock`, on the
 * reasoning that it kept local work possible offline. In practice it did the
 * opposite of what a cockpit needs.
 *
 * A developer running `npm run dev` against a misconfigured or down backend got
 * a dashboard that looked entirely healthy — populated balances, positions,
 * P&L, a green status chip — with one line in the terminal explaining that none
 * of it was real. That is precisely the failure mode this product exists to
 * prevent, reproduced in the environment where the product is built. It also
 * hid a stale `SYNATRA_API_BASE_URL` for weeks: the app "worked", so nobody
 * looked, and the value it was pointing at had not existed for some time.
 *
 * Mock is still fully supported and is still the right tool for UI work with no
 * backend — it just has to be ASKED for now (`SYNATRA_API_MODE=mock`). A backend
 * outage and a deliberate decision to use synthetic data are different events
 * and must not resolve to the same state. `offline` is what an unreachable
 * engine means, in every deployment.
 */
export async function resolveRuntimeConfig(origin: string | null): Promise<RuntimeConfig> {
  const now = Date.now()
  const key = `${readRequestedMode()}|${process.env.SYNATRA_API_BASE_URL ?? ''}|${origin ?? ''}`

  // Fresh cache — the overwhelmingly common path, zero network cost.
  if (cache && cache.key === key && cache.expiresAt > now) return cache.config

  // Stale but usable: serve it immediately and refresh in the background, so a
  // slow or dead backend never adds probe latency to a page render. Only a cold
  // start (no cached value at all) waits on the probe.
  if (cache && cache.key === key) {
    if (!inFlight) {
      inFlight = computeConfig(origin, key).finally(() => { inFlight = null })
      // Detached on purpose; failures are already folded into the config.
      void inFlight.catch(() => undefined)
    }
    return cache.config
  }

  // Cold start (or the inputs changed) — coalesce concurrent callers onto one probe.
  if (!inFlight) {
    inFlight = computeConfig(origin, key).finally(() => { inFlight = null })
  }
  return inFlight
}

async function computeConfig(origin: string | null, key: string): Promise<RuntimeConfig> {
  // Re-asserted per resolution, not just at boot: env can be mutated in-process,
  // and the guarantee must not depend on instrumentation having run.
  assertDeploymentPolicy()

  const requestedMode      = readRequestedMode()
  const { baseUrl, problem } = normalizeBaseUrl(
    firstPresent(process.env.SYNATRA_API_BASE_URL, process.env.NEXT_PUBLIC_API_BASE_URL),
  )
  const environment = normalizeEnvironment(process.env.NODE_ENV)
  const deployment  = readDeploymentPolicy()
  const mockAllowed = isMockPermitted(deployment)

  if (problem) {
    console.error(
      `[Synatra] Invalid API base URL — ${problem}. Falling back to "${baseUrl}". ` +
      'Set SYNATRA_API_BASE_URL to an absolute http(s) URL or a root-relative path.',
    )
  }

  let mode: EngineMode
  let reason: string
  let healthy = true
  let startupProbe: StartupProbe = 'not-probed'

  if (requestedMode === 'live') {
    mode   = 'live'
    reason = 'API mode is explicitly "live".'
  } else if (requestedMode === 'mock') {
    mode   = 'mock'
    reason = 'API mode is explicitly "mock" — data on screen is synthetic.'
  } else {
    const probe = await probeBackend(baseUrl, origin)
    startupProbe = probe.outcome
    healthy = probe.outcome === 'reachable'

    // The probe detail names internal hosts (e.g. the SYNATRA_API_PROBE_URL
    // loopback). It is logged server-side but deliberately kept OUT of `reason`,
    // which is serialised into the HTML and readable by anyone with devtools.
    if (!healthy) {
      console.error(`[Synatra] Engine health probe failed — ${probe.detail}`)
    }

    if (probe.outcome === 'reachable') {
      mode   = 'live'
      reason = 'Backend reachable.'
    } else if (probe.outcome === 'timeout') {
      // No answer inside the page-render window is not evidence the engine is
      // down: this check allows PROBE_TOTAL_BUDGET_MS, a normal request allows
      // lib/api/client DEFAULT_TIMEOUT_MS. Resolving `offline` here froze the
      // whole tab as "unreachable" over an engine answering in ~5 s
      // (2026-09-25, engine latency 2.9–4.9 s). The client connects; its own
      // requests and the system status (startupProbe: 'timeout') decide.
      // healthy stays false, so the short failed-TTL re-probes soon.
      mode   = 'live'
      reason = 'The engine did not answer the startup check in time — connecting anyway; its first response decides its state.'
    } else {
      // An unreachable engine resolves to `offline` in EVERY deployment,
      // development included. See the decision-table note above for why the
      // development mock fallback was removed.
      mode   = 'offline'
      // Deliberately does NOT promise last-known-good data. This resolution
      // happens at page render, when the client store may be empty — a cold
      // start against a dead engine has no prior reading to show, and claiming
      // one would be its own small fabrication. Retention is the per-slice
      // freshness system's job (lib/display/freshness.ts) and it says so itself
      // when there IS something retained.
      reason = 'Backend unreachable — no synthetic data is being substituted.'

      // Actionable, and only in the environments where a human is watching a
      // terminal. The old fallback made this situation invisible; naming the
      // opt-in here is what keeps `offline` from feeling like a dead end.
      if (mockAllowed) {
        console.error(
          '[Synatra] Engine unreachable — running in OFFLINE mode. Nothing on screen will be ' +
          'fabricated.\n' +
          `  • To work against the real engine, set SYNATRA_API_BASE_URL (currently "${baseUrl}").\n` +
          '  • To work with synthetic data instead, set SYNATRA_API_MODE=mock explicitly.\n' +
          '  Mock is no longer entered automatically: a backend outage and a decision to use ' +
          'fake data are different events and must not look identical.',
        )
      }
    }
  }

  // Frozen: the resolved config is a fact about this process, not mutable state.
  const config: RuntimeConfig = Object.freeze({
    mode, requestedMode, baseUrl, deployment, environment, reason, startupProbe,
  })

  cache = {
    config,
    key,
    expiresAt: Date.now() + (healthy ? CACHE_TTL_HEALTHY_MS : CACHE_TTL_FAILED_MS),
  }

  return config
}

/** Test/ops escape hatch — drops the probe cache so the next call re-probes. */
export function clearRuntimeConfigCache(): void {
  cache = null
}
