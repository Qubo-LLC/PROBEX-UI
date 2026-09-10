import { describe, it, expect, vi, afterEach } from 'vitest'
import { normalizeHealthStatus, resetHealthStatusWarnings } from './health'

// This module exists because a bare `as` cast let the engine's real wire value
// ("healthy") fail every downstream comparison silently. These tests pin the
// mapping and — more importantly — pin the FAILURE direction: an unrecognised
// value must resolve to "we cannot say", never to a confident claim.

afterEach(() => resetHealthStatusWarnings())

describe('normalizeHealthStatus', () => {
  it('maps the wire values observed on the live engine', () => {
    expect(normalizeHealthStatus('healthy')).toBe('online')
    expect(normalizeHealthStatus('online')).toBe('online')
    expect(normalizeHealthStatus('unhealthy')).toBe('degraded')
  })

  it('maps canonical values identity-wise', () => {
    expect(normalizeHealthStatus('degraded')).toBe('degraded')
    expect(normalizeHealthStatus('offline')).toBe('offline')
  })

  it('is case- and whitespace-insensitive', () => {
    expect(normalizeHealthStatus('HEALTHY')).toBe('online')
    expect(normalizeHealthStatus('  Healthy  ')).toBe('online')
  })

  it('maps "unhealthy" to degraded, never to offline', () => {
    // Captured live with 3/4 probes passing and the process still trading.
    // Reporting that engine as "offline" would tell the operator it had
    // stopped while it was still holding positions.
    expect(normalizeHealthStatus('unhealthy')).not.toBe('offline')
  })

  it('returns null for absent or blank input', () => {
    expect(normalizeHealthStatus(null)).toBeNull()
    expect(normalizeHealthStatus(undefined)).toBeNull()
    expect(normalizeHealthStatus('')).toBeNull()
    expect(normalizeHealthStatus('   ')).toBeNull()
  })

  it('returns null for an unrecognised value rather than guessing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(normalizeHealthStatus('critical')).toBeNull()
    expect(normalizeHealthStatus('degraded-ish')).toBeNull()
    warn.mockRestore()
  })

  it('warns once per unrecognised value, not once per poll', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    normalizeHealthStatus('critical')
    normalizeHealthStatus('critical')
    normalizeHealthStatus('critical')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
