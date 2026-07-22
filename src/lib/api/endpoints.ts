// Central endpoint registry — the single source of truth for every backend path
// the frontend may call. Paths are RELATIVE to NEXT_PUBLIC_API_BASE_URL, which
// already includes the `/api` prefix (e.g. `https://<host>:<port>/api`), so a
// path of '/execution/status' resolves to …/api/execution/status.
//
// status:
//   'confirmed'        — path verified LIVE against the deployed backend (returns data).
//   'backend-error'    — path is deployed and reachable, but the live server returns a
//                        5xx or hangs/times out. Distinct from 404: the route EXISTS,
//                        it is broken. Never wire UI to one of these — track as a Jake bug.
//   'contract-pending' — path is defined in the Postman collection (the target
//                        contract) BUT the deployed server currently returns 404 for
//                        it. The path is recorded for documentation/roadmap, but the
//                        endpoint is NOT callable — it becomes 'confirmed' only once the
//                        route is actually deployed (verified via a live probe).
//   'placeholder'      — endpoint exists in the backend's Postman collection, but its
//                        exact path is not confirmed yet → path is `null`.
//   'awaiting-backend' — no backend endpoint exists for this frontend feature yet.
//
// SOURCE-OF-TRUTH HISTORY:
//   2026-07-21 audit — collection (50 endpoints) vs live server diverged sharply:
//     only 15 GET endpoints served data; the entire portfolio/analytics/consensus/
//     research/paper-control cluster returned 404 (not deployed).
//   2026-07-22 redeploy — a live re-probe found the backend redeployed in paper mode.
//     20 of those previously-404 GET endpoints now return 200 with real data. The
//     8 POST mutation endpoints (execution create/close/cancel/emergency-stop, paper
//     start/stop/reset/resolve) now all return 405 on GET (were 404) — proving the
//     routes are deployed and method-gated, not missing. Two GENUINE backend failures
//     surfaced for the first time: GET /api/markets/history/summary (500) and
//     GET /api/markets/:id/history (500, plain-text "Internal Server Error" body, not
//     JSON) — plus GET /api/markets/:id itself hangs (connection timeout after 12s,
//     3 attempts). All three are 'backend-error', not 'contract-pending'.
//
// No routes are invented here. Only 'confirmed' entries are callable — everything else
// (backend-error, contract-pending, placeholder, awaiting-backend) throws
// ENDPOINT_NOT_CONFIGURED via endpointPath(), so a broken or undeployed entry can
// never reach the client.

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
    list:     def('GET', '/markets',       'confirmed', 'Markets page / MarketsView',    'Active Markets'),
    history:  def('GET', '/price-history', 'confirmed', 'BTC price feed (global)',       'Price History'),
    // 2026-07-22: deployed and reachable, but genuinely broken — see header note.
    // Do NOT wire UI to these; they are Jake bugs, not missing routes.
    detail:        def('GET', '/markets/:market_id',         'backend-error', 'Market detail page', 'Specific Market Details'),
    volume:        def('GET', '/markets/:market_id/history', 'backend-error', 'Market detail volume chart', 'Market Price History'),
    historySummary: def('GET', '/markets/history/summary',   'backend-error', 'Markets history summary', 'Market History Summary'),
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
  // status is a GET read (deployed, confirmed 200 2026-07-22). start/stop/reset/
  // resolve are POST mutations — a 2026-07-22 GET probe returns 405 (not 404),
  // proving all four are now DEPLOYED and method-gated. They stay un-integrated
  // in this phase: no mutation layer exists yet in the frontend (apiPost is
  // defined but unused), and wiring live trading controls was explicitly scoped
  // out pending a dedicated mutation-layer + confirm-dialog UX decision.
  paper: {
    status:  def('GET',  '/paper/status',  'confirmed',       'Paper trading status',  'Paper Status'),
    start:   def('POST', '/paper/start',   'contract-pending', 'Start paper trading',   'Start Paper Trading'),
    stop:    def('POST', '/paper/stop',    'contract-pending', 'Stop paper trading',    'Stop Paper Trading'),
    reset:   def('POST', '/paper/reset',   'contract-pending', 'Reset paper trading',   'Reset Paper Trading'),
    resolve: def('POST', '/paper/resolve', 'contract-pending', 'Resolve paper trades',  'Resolve Paper Trades'),
  },

  // ── Execution mutations (deployed 2026-07-22, confirmed via 405 on GET) ─────
  // Same rationale as `paper.*` above — deployed, method-gated, intentionally
  // not integrated until a mutation layer + safety UX exists. emergency-stop in
  // particular should be prioritized whenever that layer is built.
  executionControl: {
    orders:        def('GET',  '/execution/orders', 'confirmed', 'All orders (active/closed envelope)', 'All Orders'),
    create:        def('POST', '/execution/create', 'contract-pending', 'Manually create an order', 'Create Order (Manual)'),
    close:         def('POST', '/execution/close/:market_id', 'contract-pending', 'Manually close a position', 'Close Position (Manual)'),
    cancel:        def('POST', '/execution/cancel/:order_id', 'contract-pending', 'Cancel a pending order', 'Cancel Order (Manual)'),
    emergencyStop: def('POST', '/execution/emergency-stop', 'contract-pending', 'Emergency halt — close all positions', 'Emergency Stop'),
  },

  // ── Consensus (deployed 2026-07-22) ─────────────────────────────────────────
  consensus: {
    global:  def('GET', '/consensus',         'confirmed', 'Global consensus bar / score card', 'Global Consensus'),
    bias:    def('GET', '/consensus/bias',    'confirmed', 'Institutional/retail-style bias breakdown', 'Consensus Bias'),
    history: def('GET', '/consensus/history', 'confirmed', 'Consensus history chart', 'Consensus History'),
    market:  def('GET', null, 'awaiting-backend', 'Per-market consensus panel — no such endpoint exists; /api/consensus is platform-wide only'),
  },

  // ── Portfolio (deployed 2026-07-22) ─────────────────────────────────────────
  portfolio: {
    live:        def('GET', '/portfolio',             'confirmed', 'Portfolio live snapshot', 'Full Portfolio'),
    summary:     def('GET', '/portfolio/summary',     'confirmed', 'Portfolio summary', 'Portfolio Summary'),
    history:     def('GET', '/portfolio/history',     'confirmed', 'Portfolio value history chart', 'Portfolio History'),
    performance: def('GET', '/portfolio/performance', 'confirmed', 'Portfolio performance over a lookback window', 'Portfolio Performance'),
    allocation:  def('GET', null, 'awaiting-backend', 'Portfolio allocation breakdown — no such endpoint exists yet'),
    activity:    def('GET', null, 'awaiting-backend', 'Portfolio activity feed — use /api/events instead, no dedicated endpoint'),
  },

  // ── Research (deployed 2026-07-22) ──────────────────────────────────────────
  research: {
    reports:    def('GET', '/research/reports', 'confirmed', 'Research reports / library', 'Research Reports'),
    get:        def('GET', null, 'awaiting-backend', 'Research reader (single report detail) — no such endpoint exists yet'),
    categories: def('GET', null, 'awaiting-backend', 'Research sidebar categories — no such endpoint exists yet'),
  },

  // ── Analytics (deployed 2026-07-22 — all live, but empty until trades accumulate) ─
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

  // ── Trade Ledger (deployed 2026-07-22 — live, empty until a trade settles) ──
  trades: {
    ledger: def('GET', '/trades/ledger', 'confirmed', 'Settled trade ledger', 'Trade Ledger'),
  },

  // ── Wallet (deployed 2026-07-22) ────────────────────────────────────────────
  wallet: {
    balance:      def('GET', '/balance', 'confirmed', 'Wallet / capital balance', 'Balance Check'),
    transactions: def('GET', null, 'awaiting-backend', 'Wallet transaction history — no such endpoint exists yet'),
  },

  // ── Survival (patterns deployed 2026-07-22) ─────────────────────────────────
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
