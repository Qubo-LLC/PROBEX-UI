import { describe, it, expect } from 'vitest'
import {
  normalizeApiMode, normalizeBaseUrl, normalizeDeployment,
  normalizeEnvironment, isMockPermitted, isKnownDeployment,
  firstPresent, isAbsoluteUrl, DEFAULT_BASE_URL,
} from './runtime'

// The runtime config is the contract layer QUB-48 names: it decides which
// engine the dashboard talks to and whether synthetic data may be shown at all.
// Its defaults are safety properties, so they are asserted as such.

describe('normalizeApiMode', () => {
  it('accepts the three documented modes', () => {
    expect(normalizeApiMode('live')).toBe('live')
    expect(normalizeApiMode('mock')).toBe('mock')
    expect(normalizeApiMode('auto')).toBe('auto')
  })

  it('is case- and whitespace-tolerant', () => {
    expect(normalizeApiMode('  LIVE ')).toBe('live')
  })

  it('defaults anything unrecognised to auto', () => {
    expect(normalizeApiMode(undefined)).toBe('auto')
    expect(normalizeApiMode('')).toBe('auto')
    expect(normalizeApiMode('production')).toBe('auto')
  })
})

describe('normalizeDeployment', () => {
  it('accepts the four declared tiers', () => {
    for (const tier of ['development', 'test', 'staging', 'production'] as const) {
      expect(normalizeDeployment(tier)).toBe(tier)
    }
  })

  it('defaults to production when unset or unrecognised', () => {
    // Fail-safe, not fail-open: forgetting to declare a deployment must never
    // be the thing that unlocks fake trading data.
    expect(normalizeDeployment(undefined)).toBe('production')
    expect(normalizeDeployment('')).toBe('production')
    expect(normalizeDeployment('prod')).toBe('production')
  })

  it('distinguishes a real declaration from the fallback', () => {
    expect(isKnownDeployment('staging')).toBe(true)
    expect(isKnownDeployment('prod')).toBe(false)
    expect(isKnownDeployment(undefined)).toBe(false)
  })
})

describe('isMockPermitted', () => {
  it('permits synthetic data only in development and test', () => {
    expect(isMockPermitted('development')).toBe(true)
    expect(isMockPermitted('test')).toBe(true)
  })

  it('forbids synthetic data in staging as strictly as in production', () => {
    // A staging sign-off obtained against fabricated balances validates nothing.
    expect(isMockPermitted('staging')).toBe(false)
    expect(isMockPermitted('production')).toBe(false)
  })
})

describe('normalizeBaseUrl', () => {
  it('strips trailing slashes so the configured value is canonical', () => {
    expect(normalizeBaseUrl('https://host/api/').baseUrl).toBe('https://host/api')
    expect(normalizeBaseUrl('https://host/api').baseUrl).toBe('https://host/api')
  })

  it('accepts root-relative paths', () => {
    expect(normalizeBaseUrl('/api').baseUrl).toBe('/api')
    expect(normalizeBaseUrl('/api').problem).toBeNull()
  })

  it('falls back to the same-origin default when blank', () => {
    expect(normalizeBaseUrl('').baseUrl).toBe(DEFAULT_BASE_URL)
    expect(normalizeBaseUrl(undefined).baseUrl).toBe(DEFAULT_BASE_URL)
  })

  it('rejects a value that is neither absolute nor root-relative, and says so', () => {
    // A Windows shell once rewrote a literal `/api` argument into
    // `C:/Program Files/Git/api` and the app accepted it silently.
    const result = normalizeBaseUrl('C:/Program Files/Git/api')
    expect(result.baseUrl).toBe(DEFAULT_BASE_URL)
    expect(result.problem).toBeTruthy()
  })
})

describe('firstPresent', () => {
  it('skips declared-but-blank values rather than treating them as set', () => {
    // `??` is wrong here: an env var set to "" is not undefined, so the legacy
    // fallback would be ignored whenever the new var is templated-but-empty.
    expect(firstPresent('', 'legacy')).toBe('legacy')
    expect(firstPresent('   ', 'legacy')).toBe('legacy')
    expect(firstPresent(undefined, 'legacy')).toBe('legacy')
    expect(firstPresent('new', 'legacy')).toBe('new')
    expect(firstPresent(undefined, undefined)).toBeUndefined()
  })
})

describe('isAbsoluteUrl / normalizeEnvironment', () => {
  it('recognises absolute http(s) URLs only', () => {
    expect(isAbsoluteUrl('https://host/api')).toBe(true)
    expect(isAbsoluteUrl('http://host:8000/api')).toBe(true)
    expect(isAbsoluteUrl('/api')).toBe(false)
  })

  it('defaults an unrecognised NODE_ENV to development', () => {
    expect(normalizeEnvironment('production')).toBe('production')
    expect(normalizeEnvironment('test')).toBe('test')
    expect(normalizeEnvironment(undefined)).toBe('development')
  })
})
