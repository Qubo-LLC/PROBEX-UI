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

export type MarketSortField = 'volume24h' | 'liquidity' | 'probability' | 'closesAt'
export type SortDir = 'asc' | 'desc'
export type MarketViewMode = 'grid' | 'table'

interface UIStore {
  // ── Markets catalog filters ────────────────────────────────────────────
  // 2026-07-24: replaced `marketSegment` — the Bitcoin-category taxonomy it
  // filtered on (price-targets/volatility/…) never exists on a real market, so
  // those pills always returned nothing. `marketTimeframe` filters on
  // `durationMinutes` (5 or 15 today), a field the backend genuinely sends.
  marketTimeframe: number | null
  marketSearch:   string
  marketSortBy:   MarketSortField
  marketSortDir:  SortDir
  marketViewMode: MarketViewMode

  setMarketTimeframe: (minutes: number | null) => void
  setMarketSearch:   (query: string) => void
  setMarketSort:     (field: MarketSortField, dir?: SortDir) => void
  setMarketViewMode: (mode: MarketViewMode) => void
  resetMarketFilters: () => void

  // ── Focus-market context object (V3 signature: selection carries across views) ──
  focusMarketId: string | null
  setFocusMarket: (id: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  marketTimeframe: null,
  marketSearch:   '',
  marketSortBy:   'volume24h',
  marketSortDir:  'desc',
  marketViewMode: 'grid',

  setMarketTimeframe: (minutes) => set({ marketTimeframe: minutes }),
  setMarketSearch:   (query)   => set({ marketSearch: query }),
  setMarketSort:     (field, dir) => set((s) => ({ marketSortBy: field, marketSortDir: dir ?? s.marketSortDir })),
  setMarketViewMode: (mode)    => set({ marketViewMode: mode }),
  resetMarketFilters: () => set({ marketTimeframe: null, marketSearch: '' }),

  focusMarketId: null,
  setFocusMarket: (id) => set({ focusMarketId: id }),
}))

// Note: consumers select individual fields (e.g. `useUIStore(s => s.marketSegment)`),
// matching the single-field selector convention used by themeStore/sidebarStore —
// a combined-object selector would return a new reference on every store update
// (including unrelated fields) and re-render needlessly.
