'use client'

// preferencesStore — real user preferences, persisted to localStorage
// (PROBEX_V3_RESTORATION_PLAN §2). First real consumer: Markets/Live/Detail's
// restored WatchlistButton. This is genuine local persistence (not fake
// data) — an improvement over V1's sessionStorage-only implementation,
// which lost the watchlist on every browser restart. Documents P3-02
// (server-side sync) as the eventual cross-device upgrade.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const STORAGE_KEY = 'probex-preferences'

/** User-set profit-target overrides (USD). `null` = fall back to the engine's
 *  own daily/weekly target from /api/survival. The engine's targets are
 *  intentionally tiny ($0.46/day, $2.31/week), so any real profit instantly
 *  fills the progress bar to 100% — letting the operator set a personal,
 *  meaningful goal makes the target bars actually informative. This is a
 *  DISPLAY-only overlay: it changes what the bar measures against, not the
 *  engine's own behaviour. */
export interface ProfitTargets {
  daily:  number | null
  weekly: number | null
}

interface PreferencesStore {
  /**
   * Watchlisted market ids, keyed for O(1) membership checks.
   *
   * ─── Why expired ids are NOT auto-pruned ───────────────────────────────────
   * These are ephemeral ids (ID_LIFECYCLE_MANAGEMENT.md) and they accumulate:
   * a market watched today is dead within ~15 minutes but its id stays here.
   * Pruning on "absent from /api/markets" looks like the obvious fix and is a
   * worse bug than the leak — /api/markets is the endpoint that stalls, and on
   * 2026-08-20 it timed out for the better part of an hour. A prune driven by
   * absence would have silently deleted the operator's entire watchlist during
   * an outage, permanently, with no way to recover it.
   *
   * Absence from a list is not proof of expiry; it is proof we could not ask.
   * So entries are kept, and WatchlistPage renders unmatched ids as "no longer
   * active" only when the list genuinely resolved — and as "status unknown"
   * when it did not. Growth is bounded in practice by the operator, who is the
   * only thing that adds to it.
   */
  watchlist: Record<string, true>
  toggleWatchlist: (marketId: string) => void

  /** Personal profit-target overlay; null values defer to the engine's targets. */
  profitTargets: ProfitTargets
  /** Set (or clear, with null) a personal target for a period. */
  setProfitTarget: (period: keyof ProfitTargets, value: number | null) => void
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      watchlist: {},
      toggleWatchlist: (marketId) =>
        set((s) => {
          const next = { ...s.watchlist }
          if (next[marketId]) delete next[marketId]
          else next[marketId] = true
          return { watchlist: next }
        }),

      profitTargets: { daily: null, weekly: null },
      setProfitTarget: (period, value) =>
        set((s) => ({ profitTargets: { ...s.profitTargets, [period]: value } })),
    }),
    {
      name:    STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

/** True if the given market is on the watchlist. Single-field selector — only
 *  re-renders when this market's membership actually flips. */
export const useIsWatchlisted = (marketId: string): boolean =>
  usePreferencesStore((s) => Boolean(s.watchlist[marketId]))
