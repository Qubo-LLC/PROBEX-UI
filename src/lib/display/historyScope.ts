// History scope — what a history table is actually showing, stated so a page
// can never be read as the whole record. (remediation spec §7 Position History)
//
// The Settled Positions header used to print `most recent 30 of ${count}`,
// where `count` is the engine's PAGE length (the `limit` this console asked
// for, 100). With 524 settled trades in the session it read "30 of 100", and
// nothing said that the engine cannot currently return the oldest 24 at all.

/**
 * The most records /api/positions/history and /api/trades/ledger will return
 * in one response. CONFIRMED live 2026-09-24: limit > 500 → HTTP 422, and the
 * routes have no working cursor or offset yet, so older records are
 * unreachable until the backend pagination contract ships (spec §8).
 */
export const ENGINE_HISTORY_MAX = 500

export interface HistoryScopeInput {
  /** Rows rendered. */
  shown:        number
  /** Rows this console holds (the response it received). */
  loaded:       number
  /** Settled trades in the session, from the session-scoped surface; null when unknown. */
  sessionTotal: number | null
  /**
   * The engine's own record count when it pages by cursor (engine branch).
   * Then every record is retrievable (the Trade ledger pages through them), so
   * no "not retrievable" clause is stated. Null/absent on the deployed engine.
   */
  cursorTotal?: number | null
}

export interface HistoryScope {
  line:        string
  /** Records that exist but cannot currently be retrieved; null when none or unknown. */
  unreachable: number | null
}

export function describeHistoryScope({ shown, loaded, sessionTotal, cursorTotal = null }: HistoryScopeInput): HistoryScope {
  const parts = [shown < loaded ? `Showing ${shown} of ${loaded} loaded` : `Showing all ${loaded} loaded`]
  if (cursorTotal !== null) {
    parts.push(`${cursorTotal.toLocaleString()} settled ${cursorTotal === 1 ? 'record' : 'records'} in the engine's store`)
    if (cursorTotal > loaded) parts.push('older records are on the Trade ledger')
    return { line: parts.join(' · '), unreachable: null }
  }
  let unreachable: number | null = null
  if (sessionTotal !== null) {
    parts.push(`${sessionTotal.toLocaleString()} settled this session`)
    if (sessionTotal > ENGINE_HISTORY_MAX) {
      unreachable = sessionTotal - ENGINE_HISTORY_MAX
      parts.push(`the engine can return at most the newest ${ENGINE_HISTORY_MAX}; ${unreachable.toLocaleString()} older ${unreachable === 1 ? 'record is' : 'records are'} not retrievable yet`)
    }
  }
  return { line: parts.join(' · '), unreachable }
}
