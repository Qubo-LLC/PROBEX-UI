import { describe, expect, it } from 'vitest'
import { describeHistoryScope, ENGINE_HISTORY_MAX } from './historyScope'

describe('describeHistoryScope', () => {
  it('states the page, the session total and the unreachable remainder — the incident numbers', () => {
    const scope = describeHistoryScope({ shown: 30, loaded: 100, sessionTotal: 524 })
    expect(scope.line).toBe(
      'Showing 30 of 100 loaded · 524 settled this session · the engine can return at most the newest 500; 24 older records are not retrievable yet',
    )
    expect(scope.unreachable).toBe(24)
  })

  it('never presents the loaded page as the total', () => {
    const scope = describeHistoryScope({ shown: 100, loaded: 100, sessionTotal: 524 })
    expect(scope.line.startsWith('Showing all 100 loaded')).toBe(true)
    expect(scope.line).toContain('524 settled this session')
  })

  it('omits the session clause when the session total is unknown', () => {
    expect(describeHistoryScope({ shown: 5, loaded: 5, sessionTotal: null })).toEqual({
      line: 'Showing all 5 loaded',
      unreachable: null,
    })
  })

  it('reports no unreachable records within the engine maximum', () => {
    expect(describeHistoryScope({ shown: 30, loaded: 100, sessionTotal: ENGINE_HISTORY_MAX }).unreachable).toBeNull()
  })

  it('singular wording', () => {
    expect(describeHistoryScope({ shown: 1, loaded: 1, sessionTotal: 501 }).line).toMatch(/1 older record is not retrievable/)
  })
})

describe('describeHistoryScope — cursor contract (engine branch)', () => {
  it('states the engine total and points to the ledger; claims nothing is unreachable', () => {
    const scope = describeHistoryScope({ shown: 30, loaded: 100, sessionTotal: 524, cursorTotal: 524 })
    expect(scope.line).toBe("Showing 30 of 100 loaded · 524 settled records in the engine's store · older records are on the Trade ledger")
    expect(scope.unreachable).toBeNull()
    expect(scope.line).not.toMatch(/not retrievable/)
  })

  it('no ledger pointer when everything is already loaded', () => {
    expect(describeHistoryScope({ shown: 12, loaded: 12, sessionTotal: 12, cursorTotal: 12 }).line)
      .toBe("Showing all 12 loaded · 12 settled records in the engine's store")
  })
})
