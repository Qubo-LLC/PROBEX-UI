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

interface PreferencesStore {
  /** Watchlisted market ids, keyed for O(1) membership checks. */
  watchlist: Record<string, true>
  toggleWatchlist: (marketId: string) => void
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
