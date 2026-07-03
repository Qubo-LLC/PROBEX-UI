// Central endpoint registry — the single source of truth for every backend path
// the frontend may call. Paths are RELATIVE to NEXT_PUBLIC_API_BASE_URL, which
// already includes the `/api` prefix (e.g. `https://<host>:<port>/api`), so a
// path of '/execution/status' resolves to …/api/execution/status.
//
// status:
//   'confirmed'        — path verified against the backend (Postman / backend team).
//   'placeholder'      — endpoint exists in the backend's Postman collection, but its
//                        exact path is not confirmed yet → path is `null`.
//   'awaiting-backend' — no backend endpoint exists for this frontend feature yet.
//
// No routes are invented here. Any unconfirmed entry has `path: null`, so it cannot
// be turned into a request: `endpointPath()` throws ENDPOINT_NOT_CONFIGURED, and the
// `null` type means a raw path can't even be passed to the client at compile time.

import { env } from '@/config/env'
import { ServiceException } from '@/lib/services/response'

export type EndpointStatus = 'confirmed' | 'placeholder' | 'awaiting-backend'
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
  },

  // ── Markets / positions ──────────────────────────────────────────────────────
  markets: {
    list:     def('GET', '/markets',       'confirmed', 'Markets page / MarketsView',    'Active Markets'),
    history:  def('GET', '/price-history', 'confirmed', 'BTC price feed (global)',       'Price History'),
    volume:   def('GET', null, 'placeholder',      'Market detail volume chart',        'Volume History'),
    edges:    def('GET', '/edges',         'confirmed', 'Live edge / recommendation',    'Active Edges'),
    related:  def('GET', null, 'awaiting-backend', 'Market detail – related markets'),
    research: def('GET', null, 'awaiting-backend', 'Market detail – research panel'),
    activity: def('GET', null, 'awaiting-backend', 'Market detail – activity feed'),
  },
  positions: {
    list: def('GET', '/positions', 'confirmed', 'Positions / Portfolio', 'Active Positions'),
  },

  // ── Frontend domains with NO backend endpoint yet ───────────────────────────
  consensus: {
    market:  def('GET', null, 'awaiting-backend', 'Market consensus panel'),
    global:  def('GET', null, 'awaiting-backend', 'Global consensus bar'),
    history: def('GET', null, 'awaiting-backend', 'Consensus history chart'),
  },
  portfolio: {
    summary:     def('GET', null, 'awaiting-backend', 'Portfolio summary'),
    allocation:  def('GET', null, 'awaiting-backend', 'Portfolio allocation'),
    performance: def('GET', null, 'awaiting-backend', 'Portfolio performance chart'),
    winRate:     def('GET', null, 'awaiting-backend', 'Portfolio win-rate history chart'),
    activity:    def('GET', null, 'awaiting-backend', 'Portfolio activity feed'),
  },
  research: {
    list:       def('GET', null, 'awaiting-backend', 'Research terminal'),
    get:        def('GET', null, 'awaiting-backend', 'Research reader'),
    categories: def('GET', null, 'awaiting-backend', 'Research sidebar'),
  },
  analytics: {
    dashboard:             def('GET', null, 'awaiting-backend', 'Analytics dashboard'),
    consensusAccuracy:     def('GET', null, 'awaiting-backend', 'Consensus accuracy history'),
    consensusStrength:     def('GET', null, 'awaiting-backend', 'Consensus strength history'),
    confidenceTrend:       def('GET', null, 'awaiting-backend', 'Confidence trend history'),
    etfFlows:              def('GET', null, 'awaiting-backend', 'ETF flow history'),
    institutionalFlow:     def('GET', null, 'awaiting-backend', 'Institutional flow history'),
    marketActivity:        def('GET', null, 'awaiting-backend', 'Market activity history'),
    onChainHistory:        def('GET', null, 'awaiting-backend', 'On-chain metric history'),
    onChainSnapshots:      def('GET', null, 'awaiting-backend', 'On-chain latest snapshots'),
    segmentPerformance:    def('GET', null, 'awaiting-backend', 'Segment performance analytics'),
    signalPerformance:     def('GET', null, 'awaiting-backend', 'Signal performance analytics'),
    consensusSummary:      def('GET', null, 'awaiting-backend', 'Consensus analytics summary'),
    institutionalSummary:  def('GET', null, 'awaiting-backend', 'Institutional flow summary'),
    etfSummary:            def('GET', null, 'awaiting-backend', 'ETF analytics summary'),
    onChainSummary:        def('GET', null, 'awaiting-backend', 'On-chain analytics summary'),
    portfolioSummary:      def('GET', null, 'awaiting-backend', 'Portfolio analytics summary'),
  },
  wallet: {
    balance:      def('GET', null, 'awaiting-backend', 'Wallet balance'),
    transactions: def('GET', null, 'awaiting-backend', 'Wallet transactions'),
  },
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
 * placeholders/awaiting entries (path === null) can never reach the client.
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
