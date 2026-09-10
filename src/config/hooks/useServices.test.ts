import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ok, ServiceException, CANCELED_CODE } from '@/lib/services/response'

// ─── The request lifecycle QUB-48 specifies ──────────────────────────────────
//
// "implement non-overlapping polling, cancellation, stale state, and
//  last-good-data behavior."
//
// All four live in useServiceQuery, which is private to useServices.ts — so it
// is exercised through useEngineHealth, the thinnest public wrapper over it.
// The engine service is replaced with a controllable double: these are
// assertions about OUR request handling, not about any backend payload, so
// nothing here encodes a contract the engine would have to honour.

const getHealth = vi.fn()

vi.mock('@/lib/services', () => ({
  services: {
    // No peek* member: that is what makes a live-mode hook start in `loading`
    // rather than seeding synchronously from a mock snapshot.
    engine: {
      getHealth: (...args: unknown[]) => getHealth(...args),
    },
  },
}))

// Deferred promise, so a test can hold a request open and inspect the hook
// mid-flight rather than racing it.
function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

const health = (uptime: number) => ({ uptimeSeconds: uptime }) as never

beforeEach(() => {
  vi.useFakeTimers()
  getHealth.mockReset()
  // Remove the mount jitter so timing is deterministic.
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function importHook() {
  const mod = await import('./useServices')
  return mod.useEngineHealth
}

describe('useServiceQuery — request lifecycle', () => {
  it('starts in the loading state and resolves to success', async () => {
    getHealth.mockResolvedValue(ok(health(10)))
    const useEngineHealth = await importHook()

    const { result } = renderHook(() => useEngineHealth())
    expect(result.current.status).toBe('loading')

    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual(health(10))
  })

  it('does not overlap polls — a slow request suppresses the next tick', async () => {
    const first = deferred<ReturnType<typeof ok>>()
    getHealth.mockReturnValueOnce(first.promise).mockResolvedValue(ok(health(2)))
    const useEngineHealth = await importHook()

    renderHook(() => useEngineHealth(1_000))

    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(getHealth).toHaveBeenCalledTimes(1)

    // Three intervals elapse while the first request is still in flight.
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000) })
    expect(getHealth).toHaveBeenCalledTimes(1)

    // Once it settles, polling resumes.
    await act(async () => { first.resolve(ok(health(1))); await vi.advanceTimersByTimeAsync(1_000) })
    expect(getHealth).toHaveBeenCalledTimes(2)
  })

  it('keeps last-good data when a poll refresh fails', async () => {
    getHealth
      .mockResolvedValueOnce(ok(health(100)))
      .mockRejectedValue(new ServiceException('TIMEOUT', 'Request timed out', true))
    const useEngineHealth = await importHook()

    const { result } = renderHook(() => useEngineHealth(1_000))

    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(result.current.status).toBe('success')

    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
    // The failure must not blank the cockpit — this is the Markets flicker fix.
    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual(health(100))
  })

  // ─── Freshness (2026-09-07) ────────────────────────────────────────────────
  // Retaining last-good data was already correct. What was missing is that the
  // retained reading rendered IDENTICALLY to a fresh one — same status, same
  // data, nothing to tell an operator the numbers had stopped moving. These
  // assert the half that was absent.

  it('stamps the time of the last successful response', async () => {
    getHealth.mockResolvedValue(ok(health(100)))
    const useEngineHealth = await importHook()

    const { result } = renderHook(() => useEngineHealth())
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })

    // Stamped when the response was applied, which is a tick before the
    // assertion — assert the window, not an exact equality.
    expect(result.current.lastUpdatedAt).toBeGreaterThan(Date.now() - 50)
    expect(result.current.lastUpdatedAt).toBeLessThanOrEqual(Date.now())
    expect(result.current.isStale).toBe(false)
    expect(result.current.lastError).toBeNull()
  })

  it('MARKS retained data as stale and records why', async () => {
    getHealth
      .mockResolvedValueOnce(ok(health(100)))
      .mockRejectedValue(new ServiceException('TIMEOUT', 'Request timed out', true))
    const useEngineHealth = await importHook()

    const { result } = renderHook(() => useEngineHealth(1_000))
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    const firstSuccessAt = result.current.lastUpdatedAt

    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })

    expect(result.current.isStale).toBe(true)
    expect(result.current.lastError?.code).toBe('TIMEOUT')
    // `error` stays null so the panel keeps rendering; `lastError` is the one
    // that is set while data is still on screen.
    expect(result.current.error).toBeNull()
    // The age of the reading must NOT advance on a failed refresh.
    expect(result.current.lastUpdatedAt).toBe(firstSuccessAt)
  })

  it('clears staleness and re-stamps the timestamp on recovery', async () => {
    getHealth
      .mockResolvedValueOnce(ok(health(100)))
      .mockRejectedValueOnce(new ServiceException('NETWORK', 'Network error', true))
      .mockResolvedValue(ok(health(300)))
    const useEngineHealth = await importHook()

    const { result } = renderHook(() => useEngineHealth(1_000))
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    const firstSuccessAt = result.current.lastUpdatedAt!

    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
    expect(result.current.isStale).toBe(true)

    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
    expect(result.current.isStale).toBe(false)
    expect(result.current.lastError).toBeNull()
    expect(result.current.data).toEqual(health(300))
    expect(result.current.lastUpdatedAt!).toBeGreaterThan(firstSuccessAt)
  })

  it('does not mark data stale when WE cancelled the read', async () => {
    // A cancellation is our own doing, not evidence about the backend. Treating
    // it as staleness would flag every route change as an engine fault.
    const pending = deferred<never>()
    getHealth
      .mockResolvedValueOnce(ok(health(100)))
      .mockReturnValue(pending.promise)
    const useEngineHealth = await importHook()

    const { result, unmount } = renderHook(() => useEngineHealth(1_000))
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })

    unmount()
    await act(async () => {
      pending.reject(new ServiceException(CANCELED_CODE, 'Request canceled', false))
      await Promise.resolve()
    })

    expect(result.current.isStale).toBe(false)
    expect(result.current.lastError).toBeNull()
  })

  it('an error before any data carries no timestamp to be stale about', async () => {
    getHealth.mockRejectedValue(new ServiceException('NETWORK', 'Network error', true))
    const useEngineHealth = await importHook()

    const { result } = renderHook(() => useEngineHealth())
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })

    expect(result.current.status).toBe('error')
    expect(result.current.lastUpdatedAt).toBeNull()
    expect(result.current.isStale).toBe(false)
  })

  it('surfaces an error only when no data has arrived yet', async () => {
    getHealth.mockRejectedValue(new ServiceException('NETWORK', 'Network error', true))
    const useEngineHealth = await importHook()

    const { result } = renderHook(() => useEngineHealth())
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })

    expect(result.current.status).toBe('error')
    expect(result.current.error?.code).toBe('NETWORK')
  })

  // ─── Cancellation ──────────────────────────────────────────────────────────

  it('passes an AbortSignal to every read', async () => {
    getHealth.mockResolvedValue(ok(health(1)))
    const useEngineHealth = await importHook()

    renderHook(() => useEngineHealth())
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })

    expect(getHealth).toHaveBeenCalledTimes(1)
    const signal = getHealth.mock.calls[0]?.[0]
    expect(signal).toBeInstanceOf(AbortSignal)
    expect((signal as AbortSignal).aborted).toBe(false)
  })

  it('aborts the in-flight read on unmount', async () => {
    const pending = deferred<ReturnType<typeof ok>>()
    getHealth.mockReturnValue(pending.promise)
    const useEngineHealth = await importHook()

    const { unmount } = renderHook(() => useEngineHealth())
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })

    const signal = getHealth.mock.calls[0]?.[0] as AbortSignal
    expect(signal.aborted).toBe(false)

    unmount()
    // This is the whole point: the request is released, not merely ignored.
    expect(signal.aborted).toBe(true)
  })

  it('does not render an error state for a read it cancelled itself', async () => {
    getHealth.mockRejectedValue(new ServiceException(CANCELED_CODE, 'Request canceled', false))
    const useEngineHealth = await importHook()

    const { result } = renderHook(() => useEngineHealth())
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })

    // A cancellation is our own act. Reporting it back to the operator as a
    // fault is exactly the flash this guard exists to prevent.
    expect(result.current.status).toBe('loading')
    expect(result.current.error).toBeNull()
  })

  it('stops polling after unmount', async () => {
    getHealth.mockResolvedValue(ok(health(1)))
    const useEngineHealth = await importHook()

    const { unmount } = renderHook(() => useEngineHealth(1_000))
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(getHealth).toHaveBeenCalledTimes(1)

    unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
    expect(getHealth).toHaveBeenCalledTimes(1)
  })

  it('pauses polling while the tab is hidden', async () => {
    getHealth.mockResolvedValue(ok(health(1)))
    const useEngineHealth = await importHook()

    renderHook(() => useEngineHealth(1_000))
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(getHealth).toHaveBeenCalledTimes(1)

    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000) })
    expect(getHealth).toHaveBeenCalledTimes(1)

    hidden.mockReturnValue(false)
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
    expect(getHealth).toHaveBeenCalledTimes(2)
  })
})
