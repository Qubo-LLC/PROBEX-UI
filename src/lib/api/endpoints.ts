// Central endpoint registry. Paths are relative to NEXT_PUBLIC_API_BASE_URL
// (which includes the `/api` prefix). Only 'confirmed' entries are callable —
// every other status throws ENDPOINT_NOT_CONFIGURED via endpointPath(), so a
// broken or undeployed route can never reach the client.
//
// status:
//   'confirmed'        — verified live, returns data.
//   'backend-error'    — deployed but returns 5xx / hangs (route exists, broken).
//   'contract-pending' — in the collection but 404 on the live server (not deployed).
//   'placeholder'      — in the collection, exact path unconfirmed → path null.
//   'awaiting-backend' — no backend endpoint exists for this feature.

import { env } from '@/config/env'
import { ServiceException } from '@/lib/services/response'

export type EndpointStatus = 'confirmed' | 'backend-error' | 'contract-pending' | 'placeholder' | 'awaiting-backend'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface EndpointDef {
  readonly method:  HttpMethod
  /** Relative to API base (which already has `/api`); `null` until configured. */
  readonly path:    string | null
  readonly status:  EndpointStatus
  /** Frontend feature/page that consumes it. */
  readonly feature: string
  /** Backend Postman collection item this maps to, when known. */
  readonly source?: string
}

const def = (
  method: HttpMethod,
  path: string | null,
  status: EndpointStatus,
  feature: string,
  source?: string,
): EndpointDef =>
  source === undefined
    ? { method, path, status, feature }
    : { method, path, status, feature, source }

export const ENDPOINTS = {
  // ── Engine (present in the backend Postman collection) ──────────────────────
  engine: {
    executionStatus:  def('GET',  '/execution/status', 'confirmed', 'Engine execution status',     'Execution Status'),
    executionPolicy:  def('GET',  '/execution/policy', 'confirmed', 'Execution order-flow policy',  'Execution Policy'),
    executionTrades:  def('GET',  '/execution/trades', 'confirmed', 'Execution active/closed trades', 'Execution Trades'),
    paperStats:       def('GET',  '/paper-stats',      'confirmed', 'Paper trading session stats',  'Paper Trading Stats'),
    // NOTE: /health is at the host root, NOT under the /api base prefix.
    // Use apiGetHost() from lib/api/client instead of the normal apiGet().
    health:           def('GET',  '/health',    'confirmed', 'Engine health probe',             'Health'),
    // NOTE: also at the host root (outside /api) — use apiGetHost().
    apiRoot:          def('GET',  '/',          'confirmed', 'Engine identity (bot/version/mode)', 'Api Root'),
    stats:            def('GET',  '/stats',     'confirmed', 'Dashboard / analytics stats',     'Stats'),
    updateStats:      def('POST', null,         'placeholder', 'Engine stats write',            'Update Stats'),
    runtime:          def('GET',  '/runtime',   'confirmed', 'Engine runtime status',           'Engine Runtime'),
    variableConfig:   def('GET',  '/config',    'confirmed', 'Engine variable config',          'Variable Config'),
    survivalStrategy: def('GET',  '/survival',  'confirmed', 'Survival strategy engine',        'Survival Strategy Engine'),
    events:           def('GET',  '/events',    'confirmed', 'Activity feed / events',          'Events'),
    systemMetrics:    def('GET',  '/system/metrics', 'confirmed', 'System diagnostics (uptime/memory/cpu)', 'System Metrics'),
  },

  // ── Markets / positions ──────────────────────────────────────────────────────
  markets: {
    // 2026-07-25: INTERMITTENT STALL, not an outage. Stalled 4/4 at 30s+ in one
    // window, then served 12/12 at ~0.47s an hour later. Returns only the
    // markets being actively scanned right now (count is typically 1–3) — this
    // is NOT the same dataset as historySummary, which is the historical
    // archive. Kept 'confirmed'; the 15s client timeout degrades a stall into a
    // retryable TIMEOUT rather than a hang. Reported to backend as P1.
    list:     def('GET', '/markets',       'confirmed', 'Actively-scanned markets (intermittent stall — see docs/API_AUDIT.md)', 'Active Markets'),
    history:  def('GET', '/price-history', 'confirmed', 'BTC price feed (global)',       'Price History'),
    // Still broken: hangs with no response.
    detail:        def('GET', '/markets/:market_id',         'backend-error', 'Market detail page', 'Specific Market Details'),
    // 2026-07-25: these two were fixed backend-side and now return rich data.
    volume:        def('GET', '/markets/:market_id/history', 'confirmed', 'Market detail price/volume chart', 'Market Price History'),
    // Historical archive (100+ markets with min/max/avg pricing) — a DIFFERENT
    // dataset from `list` above, which is only what is being scanned right now.
    historySummary: def('GET', '/markets/history/summary',   'confirmed', 'Historical markets archive', 'Market History Summary'),
    edges:    def('GET', '/edges',         'confirmed', 'Live edge / recommendation',    'Active Edges'),
    related:  def('GET', null, 'awaiting-backend', 'Market detail – related markets'),
    research: def('GET', null, 'awaiting-backend', 'Market detail – research panel'),
    activity: def('GET', null, 'awaiting-backend', 'Market detail – activity feed'),
  },
  positions: {
    list:    def('GET', '/positions',         'confirmed', 'Positions / Portfolio', 'Active Positions'),
    history: def('GET', '/positions/history', 'confirmed', 'Positions history (envelope only — items empty so far)', 'Positions History'),
  },

  // ── Paper-trading control ────────────────────────────────────────────────────
  // status is a confirmed GET. start/stop/reset/resolve are deployed POST
  // mutations (405 on GET), left contract-pending until a mutation layer exists.
  // 2026-07-25: all four mutations verified live (405 on GET = route registered,
  // wrong method) and are now wired through the mutation layer in live.ts.
  paper: {
    status:  def('GET',  '/paper/status',  'confirmed', 'Paper trading status',  'Paper Status'),
    start:   def('POST', '/paper/start',   'confirmed', 'Start paper trading',   'Start Paper Trading'),
    stop:    def('POST', '/paper/stop',    'confirmed', 'Stop paper trading',    'Stop Paper Trading'),
    reset:   def('POST', '/paper/reset',   'confirmed', 'Reset paper trading (DESTRUCTIVE — clears history)', 'Reset Paper Trading'),
    resolve: def('POST', '/paper/resolve', 'confirmed', 'Resolve paper trades',  'Resolve Paper Trades'),
  },

  // ── Execution mutations ──────────────────────────────────────────────────────
  // 2026-07-25: create + emergency-stop verified live (405 on GET). close/cancel
  // were not probed (they need a live position/order to be meaningful) but are
  // the same router family, so they are wired alongside. Every one of these is
  // gated behind an explicit confirm in the UI — see components/execution.
  executionControl: {
    orders:        def('GET',  '/execution/orders', 'confirmed', 'All orders (active/closed envelope)', 'All Orders'),
    // Order detail by id — verified 2026-07-25 (clean 404 for unknown id).
    orderById:       def('GET', '/execution/orders/:order_id',        'confirmed', 'Single order by id', 'Specific Order'),
    activeOrderById: def('GET', '/execution/orders/active/:order_id', 'confirmed', 'Single active order by id', 'Active Order'),
    closedOrderById: def('GET', '/execution/orders/closed/:order_id', 'confirmed', 'Single closed order by id', 'Closed Order'),
    create:        def('POST', '/execution/create', 'confirmed', 'Manually create an order', 'Create Order (Manual)'),
    close:         def('POST', '/execution/close/:market_id', 'confirmed', 'Manually close a position', 'Close Position (Manual)'),
    cancel:        def('POST', '/execution/cancel/:order_id', 'confirmed', 'Cancel a pending order', 'Cancel Order (Manual)'),
    emergencyStop: def('POST', '/execution/emergency-stop', 'confirmed', 'Emergency halt — close all positions', 'Emergency Stop'),
  },

  // ── Consensus ────────────────────────────────────────────────────────────────
  consensus: {
    global:  def('GET', '/consensus',         'confirmed', 'Global consensus bar / score card', 'Global Consensus'),
    bias:    def('GET', '/consensus/bias',    'confirmed', 'Institutional/retail-style bias breakdown', 'Consensus Bias'),
    history: def('GET', '/consensus/history', 'confirmed', 'Consensus history chart', 'Consensus History'),
    market:  def('GET', null, 'awaiting-backend', 'Per-market consensus panel — no such endpoint exists; /api/consensus is platform-wide only'),
  },

  // ── Portfolio ────────────────────────────────────────────────────────────────
  portfolio: {
    // 2026-07-25: returns 500 Internal Server Error. Was 'confirmed'.
    // Composite snapshot — the individual balance/positions/survival/summary
    // routes all still work, so nothing is lost while this is down.
    live:        def('GET', '/portfolio',             'backend-error', 'Portfolio live snapshot (500)', 'Full Portfolio'),
    summary:     def('GET', '/portfolio/summary',     'confirmed', 'Portfolio summary', 'Portfolio Summary'),
    history:     def('GET', '/portfolio/history',     'confirmed', 'Portfolio value history chart', 'Portfolio History'),
    performance: def('GET', '/portfolio/performance', 'confirmed', 'Portfolio performance over a lookback window', 'Portfolio Performance'),
    allocation:  def('GET', null, 'awaiting-backend', 'Portfolio allocation breakdown — no such endpoint exists yet'),
    activity:    def('GET', null, 'awaiting-backend', 'Portfolio activity feed — use /api/events instead, no dedicated endpoint'),
  },

  // ── Research ─────────────────────────────────────────────────────────────────
  research: {
    // 2026-07-25: INTERMITTENT STALL — 3/3 stalls in one window, then 11/12 at
    // ~0.47s with a single 34s outlier. Same pattern as markets.list. Kept
    // 'confirmed'; the client timeout turns a stall into a retryable error.
    reports:    def('GET', '/research/reports', 'confirmed', 'Research reports / library (intermittent stall)', 'Research Reports'),
    get:        def('GET', null, 'awaiting-backend', 'Research reader (single report detail) — no such endpoint exists yet'),
    categories: def('GET', null, 'awaiting-backend', 'Research sidebar categories — no such endpoint exists yet'),
  },

  // ── Analytics (live, but empty until trades accumulate) ──────────────────────
  analytics: {
    segments:    def('GET', '/analytics/segments',    'confirmed', 'Segment performance analytics', 'Analytics Segments'),
    signals:     def('GET', '/analytics/signals',     'confirmed', 'Signal performance analytics', 'Analytics Signals'),
    summary:     def('GET', '/analytics/summary',     'confirmed', 'Overall analytics summary', 'Analytics Summary'),
    topSegments: def('GET', '/analytics/top-segments', 'confirmed', 'Top-performing segments', 'Top Segments'),
    hourly:      def('GET', '/analytics/hourly',      'confirmed', 'Hourly performance breakdown', 'Hourly Analytics'),
    // No backend concept of these V1-era ideas — correctly left as no-endpoint.
    consensusAccuracy:    def('GET', null, 'awaiting-backend', 'Consensus accuracy history — no backend concept'),
    etfFlows:             def('GET', null, 'awaiting-backend', 'ETF flow history — no backend concept for a BTC 5m bot'),
    institutionalFlow:    def('GET', null, 'awaiting-backend', 'Institutional flow history — no backend concept'),
    onChainHistory:       def('GET', null, 'awaiting-backend', 'On-chain metric history — no backend concept'),
    onChainSnapshots:     def('GET', null, 'awaiting-backend', 'On-chain latest snapshots — no backend concept'),
  },

  // ── Trade Ledger (live, empty until a trade settles) ─────────────────────────
  trades: {
    ledger: def('GET', '/trades/ledger', 'confirmed', 'Settled trade ledger', 'Trade Ledger'),
  },

  // ── Wallet ───────────────────────────────────────────────────────────────────
  wallet: {
    balance:      def('GET', '/balance', 'confirmed', 'Wallet / capital balance', 'Balance Check'),
    transactions: def('GET', null, 'awaiting-backend', 'Wallet transaction history — no such endpoint exists yet'),
  },

  // ── Survival ─────────────────────────────────────────────────────────────────
  survival: {
    patterns: def('GET', '/survival/patterns', 'confirmed', 'Survival brain pattern analysis', 'Survival Patterns'),
  },

  // ── Frontend domains still with NO backend endpoint ─────────────────────────
  notifications: {
    list: def('GET', null, 'awaiting-backend', 'Notification center'),
  },
  admin: {
    kpis:          def('GET', null, 'awaiting-backend', 'Admin KPIs header'),
    users:         def('GET', null, 'awaiting-backend', 'Admin user management'),
    adminMarkets:  def('GET', null, 'awaiting-backend', 'Admin market management'),
    auditLog:      def('GET', null, 'awaiting-backend', 'Admin audit log'),
    kycQueue:      def('GET', null, 'awaiting-backend', 'Admin KYC review'),
    systemHealth:  def('GET', null, 'awaiting-backend', 'Admin system health'),
    riskDashboard: def('GET', null, 'awaiting-backend', 'Admin risk dashboard'),
  },
  settings: {
    sessions: def('GET', null, 'awaiting-backend', 'Settings – device sessions'),
  },
} as const

/** True when an endpoint is safe to call (confirmed, has a path, base configured). */
export function isEndpointReady(e: EndpointDef): boolean {
  return e.status === 'confirmed' && e.path !== null && env.API_BASE_URL !== ''
}

/**
 * Returns the relative path for a confirmed, configured endpoint, or throws.
 * This is the ONLY supported way to turn a registry entry into a request path —
 * anything other than 'confirmed' (backend-error, contract-pending, placeholder,
 * awaiting-backend) can never reach the client.
 */
export function endpointPath(e: EndpointDef): string {
  if (e.status !== 'confirmed' || e.path === null) {
    throw new ServiceException('ENDPOINT_NOT_CONFIGURED', `Endpoint not configured: ${e.feature}`, false)
  }
  if (env.API_BASE_URL === '') {
    throw new ServiceException('API_BASE_URL_MISSING', 'NEXT_PUBLIC_API_BASE_URL is not configured', false)
  }
  return e.path
}

/**
 * Like endpointPath(), but substitutes `:name` path parameters.
 *
 * Throws if a declared `:param` has no value supplied, so a malformed URL can
 * never be sent (e.g. a literal `/execution/close/:market_id`). Values are
 * URL-encoded. Market and order ids are 0x-prefixed hex, but encoding keeps
 * this safe for any future id format.
 */
export function endpointPathWith(
  e: EndpointDef,
  params: Record<string, string>,
): string {
  const path = endpointPath(e)
  return path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, key: string) => {
    const value = params[key]
    if (value === undefined || value === '') {
      throw new ServiceException(
        'ENDPOINT_PARAM_MISSING',
        `Missing path parameter ":${key}" for ${e.feature}`,
        false,
      )
    }
    return encodeURIComponent(value)
  })
}
