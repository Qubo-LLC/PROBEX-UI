// Store barrel. Post-M5: theme (5-theme system), sidebar (nav collapse), and
// the engine ApplicationStore (imported directly from './applicationStore' by
// the data layer). V3 Phase 2 adds two product-UI stores, each introduced only
// once a real consumer needed them (uiStore ← Markets filters/focus-market;
// preferencesStore ← restored WatchlistButton). Neither holds engine data.

export {
  useThemeStore,
  useTheme,
  useSetTheme,
} from './themeStore'

export {
  useSidebarStore,
  useSidebarCollapsed,
  useMobileOpen,
  useSidebarToggle,
} from './sidebarStore'

export {
  useUIStore,
} from './uiStore'
export type { MarketSortField, SortDir, MarketViewMode } from './uiStore'

export {
  usePreferencesStore,
  useIsWatchlisted,
} from './preferencesStore'
