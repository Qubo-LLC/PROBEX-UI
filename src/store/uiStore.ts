'use client'

// uiStore — ephemeral product view state (PROBEX_V3_RESTORATION_PLAN §2,
// PROBEX_V3_IMPLEMENTATION_BLUEPRINT §2). V1 spread this across marketStore +
// portfolioStore + analyticsStore (5 stores); V3 consolidates all session-only
// product UI state into ONE store. Never holds engine data — that is
// applicationStore's sole domain.
//
// First real consumer: Phase 2's MarketFilterBar (segment/search/sort/view)
// and the focus-market context object shared by Markets ↔ Market Detail.
//
// Not persisted — this is session state, not a user preference (contrast
// with preferencesStore, which is localStorage-backed).

import { create } from 'zustand'
import type { BitcoinSegment } from '@/types/market'

export type MarketSortField = 'volume24h' | 'liquidity' | 'probability' | 'closesAt'
export type SortDir = 'asc' | 'desc'
export type MarketViewMode = 'grid' | 'table'

interface UIStore {
  // ── Markets catalog filters ────────────────────────────────────────────
  marketSegment:  BitcoinSegment | null
  marketSearch:   string
  marketSortBy:   MarketSortField
  marketSortDir:  SortDir
  marketViewMode: MarketViewMode

  setMarketSegment:  (segment: BitcoinSegment | null) => void
  setMarketSearch:   (query: string) => void
  setMarketSort:     (field: MarketSortField, dir?: SortDir) => void
  setMarketViewMode: (mode: MarketViewMode) => void
  resetMarketFilters: () => void

  // ── Focus-market context object (V3 signature: selection carries across views) ──
  focusMarketId: string | null
  setFocusMarket: (id: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  marketSegment:  null,
  marketSearch:   '',
  marketSortBy:   'volume24h',
  marketSortDir:  'desc',
  marketViewMode: 'grid',

  setMarketSegment:  (segment) => set({ marketSegment: segment }),
  setMarketSearch:   (query)   => set({ marketSearch: query }),
  setMarketSort:     (field, dir) => set((s) => ({ marketSortBy: field, marketSortDir: dir ?? s.marketSortDir })),
  setMarketViewMode: (mode)    => set({ marketViewMode: mode }),
  resetMarketFilters: () => set({ marketSegment: null, marketSearch: '' }),

  focusMarketId: null,
  setFocusMarket: (id) => set({ focusMarketId: id }),
}))

// Note: consumers select individual fields (e.g. `useUIStore(s => s.marketSegment)`),
// matching the single-field selector convention used by themeStore/sidebarStore —
// a combined-object selector would return a new reference on every store update
// (including unrelated fields) and re-render needlessly.
