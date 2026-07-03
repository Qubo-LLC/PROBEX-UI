import type { AssetClass } from '@/types/market'

/**
 * Application-wide constants
 * ───────────────────────────
 * Never hardcode these values in components or services.
 */

// ─── Asset class ──────────────────────────────────────────────────────────

/**
 * The active asset class for the MVP.
 * All market queries default to this class.
 * When multi-asset support is added, this becomes a user preference.
 */
export const ACTIVE_ASSET_CLASS: AssetClass = 'bitcoin'

// ─── App identity ─────────────────────────────────────────────────────────

export const APP_NAME = 'Probex' as const
export const APP_FULL_NAME = 'QUBO Probex' as const
export const APP_TAGLINE = 'Prediction Intelligence' as const
export const APP_VERSION = '2.0.0' as const

// ─── Sidebar ──────────────────────────────────────────────────────────────

export const SIDEBAR_EXPANDED_WIDTH  = 200 as const  // px
export const SIDEBAR_COLLAPSED_WIDTH = 52 as const   // px
export const TOPNAV_HEIGHT           = 52 as const   // px

// ─── Pagination ───────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE        = 20 as const
export const MARKET_TABLE_PAGE_SIZE   = 25 as const
export const ACTIVITY_FEED_PAGE_SIZE  = 15 as const
export const TRANSACTION_PAGE_SIZE    = 20 as const

// ─── Query stale times (ms) ───────────────────────────────────────────────

export const STALE_TIME = {
  MARKET_LIST:    30_000,   // 30s
  MARKET_DETAIL:  10_000,   // 10s
  MARKET_HISTORY: 60_000,   // 60s
  PORTFOLIO:      30_000,
  WALLET:         15_000,
  CONSENSUS:      10_000,
  ANALYTICS:     300_000,   // 5m
  WATCHLIST:      60_000,
  NOTIFICATIONS:  30_000,
  ADMIN_DATA:     10_000,
} as const

// ─── Live update intervals (ms) ───────────────────────────────────────────

export const UPDATE_INTERVAL = {
  PRICE_TICK:        1_500,   // 1.5s — probability updates
  CONSENSUS_TICK:    3_000,   // 3s — consensus score updates
  ACTIVITY_FEED:     2_000,   // 2s — new trade events
  TICKER_SCROLL:     2_500,   // 2.5s — top bar ticker items
  PORTFOLIO_SYNC:   15_000,   // 15s — portfolio value refresh
} as const

// ─── Consensus debounce ───────────────────────────────────────────────────

/** Batch consensus updates before triggering re-renders (architecture review rec.) */
export const CONSENSUS_UPDATE_DEBOUNCE_MS = 500 as const

// ─── Trading ──────────────────────────────────────────────────────────────

export const MIN_ORDER_AMOUNT_USD  = 1    as const   // $1 minimum
export const MAX_ORDER_AMOUNT_USD  = 10_000 as const // $10,000 maximum (MVP)
export const PLATFORM_FEE_BPS      = 200  as const   // 2% fee in basis points

// ─── Wallet ───────────────────────────────────────────────────────────────

export const POLYGON_MAINNET_CHAIN_ID = 137   as const
export const POLYGON_AMOY_CHAIN_ID    = 80002 as const
export const POLYGON_BLOCK_TIME_MS    = 2_100 as const  // ~2.1s average

export const TX_CONFIRMATION_BLOCKS   = 5     as const  // confirmations before "confirmed"

// ─── Formatting ───────────────────────────────────────────────────────────

export const CURRENCY_FORMAT: Intl.NumberFormatOptions = {
  style:    'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const

export const COMPACT_CURRENCY_FORMAT: Intl.NumberFormatOptions = {
  style:             'currency',
  currency:          'USD',
  notation:          'compact',
  maximumFractionDigits: 1,
} as const

// ─── Routes ───────────────────────────────────────────────────────────────

export const ROUTES = {
  // Auth
  LOGIN:           '/auth/login',
  SIGNUP:          '/auth/signup',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD:  '/auth/reset-password',
  VERIFY:          '/auth/verify',

  // Cockpit (PROBEX_PRODUCT_SPEC.md §3)
  HOME:       '/dashboard',
  LIVE:       '/dashboard/live',
  STRATEGY:   '/dashboard/strategy',
  POSITIONS:  '/dashboard/positions',
  EXECUTION:  '/dashboard/execution',
  SURVIVAL:   '/dashboard/survival',
  EVENTS:     '/dashboard/events',
  SYSTEM:     '/dashboard/system',
  SETTINGS:   '/dashboard/settings',

  // Legacy (routes 302 to cockpit homes; removed in M5)
  MARKETS:    '/dashboard/markets',
  PORTFOLIO:  '/dashboard/portfolio',
  WATCHLIST:  '/dashboard/watchlist',
  WALLET:     '/dashboard/wallet',
  RESEARCH:   '/dashboard/research',
  ANALYTICS:  '/dashboard/analytics',
  CONSENSUS:  '/dashboard/consensus',
  ADMIN:      '/dashboard/admin',
} as const

/** Route builder for market detail pages */
export function MARKET_DETAIL_PATH(marketId: string): string {
  return `/dashboard/markets/${marketId}`
}

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

// ─── Route helpers ──────────────────────────────────────────────────

/** @deprecated Use ROUTES.MARKETS + "/" + marketId. Kept for compatibility. */
export function MARKET_DETAIL_ROUTE(marketId: string): string {
  return `${ROUTES.MARKETS}/${marketId}`
}
