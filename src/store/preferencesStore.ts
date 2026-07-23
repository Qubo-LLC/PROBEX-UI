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
  /** Watchlisted market ids, keyed for O(1) membership checks. */
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
