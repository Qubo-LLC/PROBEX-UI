'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const STORAGE_KEY = 'synatra-sidebar'

// ─── Types ────────────────────────────────────────────────────────────────

interface SidebarState {
  /** Whether the sidebar is in collapsed (icon-only) mode */
  isCollapsed: boolean
  /** Whether the mobile overlay is open */
  isMobileOpen: boolean
}

interface SidebarActions {
  toggle:        () => void
  collapse:      () => void
  expand:        () => void
  openMobile:    () => void
  closeMobile:   () => void
  toggleMobile:  () => void
}

export type SidebarStore = SidebarState & SidebarActions

// ─── Store ────────────────────────────────────────────────────────────────

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed:  false,
      isMobileOpen: false,

      toggle:  () => set((s) => ({ isCollapsed: !s.isCollapsed })),
      collapse: () => set({ isCollapsed: true }),
      expand:   () => set({ isCollapsed: false }),

      openMobile:   () => set({ isMobileOpen: true }),
      closeMobile:  () => set({ isMobileOpen: false }),
      toggleMobile: () => set((s) => ({ isMobileOpen: !s.isMobileOpen })),
    }),
    {
      name:    STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist desktop collapse state — mobile overlay is always closed on refresh
      partialize: (state) => ({ isCollapsed: state.isCollapsed }),
    },
  ),
)

// ─── Selector hooks ────────────────────────────────────────────────────────

export const useSidebarCollapsed = (): boolean =>
  useSidebarStore((s) => s.isCollapsed)

export const useMobileOpen = (): boolean =>
  useSidebarStore((s) => s.isMobileOpen)

export const useSidebarToggle = (): (() => void) =>
  useSidebarStore((s) => s.toggle)
