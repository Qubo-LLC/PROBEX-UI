// Runtime RESOLUTION — which engine implementation a request actually gets.
//
// `runtime.test.ts` covers the pure normalisers. This file covers the decision
// that uses them, because that decision is a safety property: it is what stands
// between "the backend is down" and "here is a dashboard full of invented
// trades".
//
// ─── The behaviour these tests pin, and why it changed ───────────────────────
// `auto` + unreachable + development used to resolve to `mock`. It read as
// developer convenience and behaved as a trap: a local setup pointing at a
// backend that had stopped existing rendered a fully populated, apparently
// healthy cockpit, and the only signal was one line in a terminal nobody was
// watching. A stale PROBEX_API_BASE_URL survived weeks that way — the app
// "worked", so nobody looked at it.
//
// An unreachable engine now resolves to `offline` in every deployment. Mock is
// still fully supported; it just has to be asked for.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolveRuntimeConfig, clearRuntimeConfigCache, assertDeploymentPolicy, InvalidDeploymentConfigError } from './runtime.server'

const ORIGIN = 'http://localhost:3000'

/** A fetch double standing in for the engine's /health. */
function engine(reachable: boolean, contentType = 'application/json') {
  return vi.fn(async () => {
    if (!reachable) throw new Error('ECONNREFUSED')
    return {
      ok: true,
      headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    } as unknown as Response
  })
}

const ENV_KEYS = [
  'PROBEX_API_MODE', 'PROBEX_API_BASE_URL', 'PROBEX_API_PROBE_URL', 'PROBEX_DEPLOYMENT',
  'NEXT_PUBLIC_API_MODE', 'NEXT_PUBLIC_API_BASE_URL',
] as const

let saved: Record<string, string | undefined> = {}

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]))
  for (const k of ENV_KEYS) delete process.env[k]
  clearRuntimeConfigCache()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  clearRuntimeConfigCache()
  vi.restoreAllMocks()
})

describe('LIVE — a configured, reachable backend', () => {
  it('resolves to live when the probe succeeds', async () => {
    vi.stubGlobal('fetch', engine(true))
    process.env.PROBEX_DEPLOYMENT  = 'development'
    process.env.PROBEX_API_MODE    = 'auto'
    process.env.PROBEX_API_BASE_URL = 'https://engine.example/api'

    const c = await resolveRuntimeConfig(ORIGIN)
    expect(c.mode).toBe('live')
    expect(c.baseUrl).toBe('https://engine.example/api')
    expect(c.reason).toBe('Backend reachable.')
  })

  it('honours an explicit live mode without probing at all', async () => {
    const fetchSpy = engine(false)
    vi.stubGlobal('fetch', fetchSpy)
    process.env.PROBEX_DEPLOYMENT = 'development'
    process.env.PROBEX_API_MODE   = 'live'

    const c = await resolveRuntimeConfig(ORIGIN)
    expect(c.mode).toBe('live')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a 200 that is not JSON — a proxy falling through to HTML is not the engine', async () => {
    vi.stubGlobal('fetch', engine(true, 'text/html'))
    process.env.PROBEX_DEPLOYMENT   = 'development'
    process.env.PROBEX_API_MODE     = 'auto'
    process.env.PROBEX_API_BASE_URL = 'https://engine.example/api'

    const c = await resolveRuntimeConfig(ORIGIN)
    expect(c.mode).toBe('offline')
  })
})

describe('MOCK — explicit opt-in only', () => {
  it('resolves to mock when asked for, under a permitting policy', async () => {
    vi.stubGlobal('fetch', engine(true))
    process.env.PROBEX_DEPLOYMENT = 'development'
    process.env.PROBEX_API_MODE   = 'mock'

    const c = await resolveRuntimeConfig(ORIGIN)
    expect(c.mode).toBe('mock')
    expect(c.reason).toMatch(/synthetic/i)
  })

  it('is FATAL under a policy that forbids it', () => {
    process.env.PROBEX_DEPLOYMENT = 'production'
    process.env.PROBEX_API_MODE   = 'mock'
    expect(() => assertDeploymentPolicy()).toThrow(InvalidDeploymentConfigError)
  })

  it('is forbidden in staging as strictly as in production', () => {
    process.env.PROBEX_DEPLOYMENT = 'staging'
    process.env.PROBEX_API_MODE   = 'mock'
    expect(() => assertDeploymentPolicy()).toThrow(InvalidDeploymentConfigError)
  })
})

describe('OFFLINE — no automatic mock fallback', () => {
  // The regression this whole change exists to prevent.
  it('resolves an unreachable backend to offline IN DEVELOPMENT', async () => {
    vi.stubGlobal('fetch', engine(false))
    process.env.PROBEX_DEPLOYMENT   = 'development'
    process.env.PROBEX_API_MODE     = 'auto'
    process.env.PROBEX_API_BASE_URL = 'http://127.0.0.1:9/api'

    const c = await resolveRuntimeConfig(ORIGIN)
    expect(c.mode).toBe('offline')
    expect(c.mode).not.toBe('mock')
  })

  it('resolves an unreachable backend to offline in test, staging and production too', async () => {
    for (const deployment of ['test', 'staging', 'production'] as const) {
      clearRuntimeConfigCache()
      vi.stubGlobal('fetch', engine(false))
      process.env.PROBEX_DEPLOYMENT   = deployment
      process.env.PROBEX_API_MODE     = 'auto'
      process.env.PROBEX_API_BASE_URL = 'http://127.0.0.1:9/api'

      expect((await resolveRuntimeConfig(ORIGIN)).mode).toBe('offline')
    }
  })

  it('never claims to be showing data it does not have', async () => {
    // A cold start against a dead engine has no last-known-good reading, so the
    // reason must not promise one. Retention is the freshness layer's claim to
    // make, per-slice, and only when something was actually retained.
    vi.stubGlobal('fetch', engine(false))
    process.env.PROBEX_DEPLOYMENT   = 'development'
    process.env.PROBEX_API_MODE     = 'auto'
    process.env.PROBEX_API_BASE_URL = 'http://127.0.0.1:9/api'

    const c = await resolveRuntimeConfig(ORIGIN)
    expect(c.reason).not.toMatch(/last known/i)
    expect(c.reason).toMatch(/no synthetic data/i)
  })
})

describe('the runtime always initialises', () => {
  // A failed probe must degrade the runtime, never fail the render. Every
  // branch below has to produce a usable, frozen config.
  it('returns a complete config even when the probe fails', async () => {
    vi.stubGlobal('fetch', engine(false))
    process.env.PROBEX_DEPLOYMENT   = 'development'
    process.env.PROBEX_API_MODE     = 'auto'
    process.env.PROBEX_API_BASE_URL = 'https://engine.example/api'

    const c = await resolveRuntimeConfig(ORIGIN)
    expect(c).toBeDefined()
    expect(Object.isFrozen(c)).toBe(true)
    expect(c.baseUrl).toBe('https://engine.example/api')
    expect(c.deployment).toBe('development')
    expect(c.reason.length).toBeGreaterThan(0)
  })

  it('does not throw when the probe target cannot even be derived', async () => {
    // Relative base and no origin: nothing to probe. Must still resolve.
    vi.stubGlobal('fetch', engine(false))
    process.env.PROBEX_DEPLOYMENT = 'development'
    process.env.PROBEX_API_MODE   = 'auto'

    const c = await resolveRuntimeConfig(null)
    expect(c.mode).toBe('offline')
    expect(c.baseUrl).toBe('/api')
  })

  it('falls back to the default base when the configured one is malformed', async () => {
    vi.stubGlobal('fetch', engine(false))
    process.env.PROBEX_DEPLOYMENT   = 'development'
    process.env.PROBEX_API_MODE     = 'auto'
    process.env.PROBEX_API_BASE_URL = 'C:/Program Files/Git/api'

    const c = await resolveRuntimeConfig(ORIGIN)
    expect(c.baseUrl).toBe('/api')
  })

  it('surfaces the failure rather than swallowing it', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', engine(false))
    process.env.PROBEX_DEPLOYMENT   = 'development'
    process.env.PROBEX_API_MODE     = 'auto'
    process.env.PROBEX_API_BASE_URL = 'https://engine.example/api'

    await resolveRuntimeConfig(ORIGIN)

    const logged = errorSpy.mock.calls.flat().join(' ')
    expect(logged).toMatch(/probe failed/i)
    // And it must name the two escape hatches, or "offline" reads as a dead end.
    expect(logged).toMatch(/PROBEX_API_BASE_URL/)
    expect(logged).toMatch(/PROBEX_API_MODE=mock/)
  })
})

describe('probe target derivation', () => {
  it('tries <base>/health then host-root /health, covering both topologies', async () => {
    const seen: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => { seen.push(url); throw new Error('down') }))
    process.env.PROBEX_DEPLOYMENT   = 'development'
    process.env.PROBEX_API_MODE     = 'auto'
    process.env.PROBEX_API_BASE_URL = 'https://engine.example/api'

    await resolveRuntimeConfig(ORIGIN)
    expect(seen).toContain('https://engine.example/api/health')
    expect(seen).toContain('https://engine.example/health')
  })

  it('an explicit PROBEX_API_PROBE_URL wins outright', async () => {
    const seen: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => { seen.push(url); throw new Error('down') }))
    process.env.PROBEX_DEPLOYMENT    = 'development'
    process.env.PROBEX_API_MODE      = 'auto'
    process.env.PROBEX_API_BASE_URL  = 'https://engine.example/api'
    process.env.PROBEX_API_PROBE_URL = 'http://127.0.0.1:8000/health'

    await resolveRuntimeConfig(ORIGIN)
    expect([...new Set(seen)]).toEqual(['http://127.0.0.1:8000/health'])
  })

  it('resolves a relative base against the request origin', async () => {
    const seen: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => { seen.push(url); throw new Error('down') }))
    process.env.PROBEX_DEPLOYMENT = 'development'
    process.env.PROBEX_API_MODE   = 'auto'

    await resolveRuntimeConfig(ORIGIN)
    expect(seen).toContain(`${ORIGIN}/api/health`)
  })
})
