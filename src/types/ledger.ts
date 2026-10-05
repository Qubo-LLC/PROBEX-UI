// Trade ledger contract (remediation spec Part 1 §6).
//
// One wire item shape serves /api/trades/ledger and /api/positions/history:
// in paper mode both read the same persisted records.
//
// Two backend contracts exist and this type covers both, field by field:
//   DEPLOYED (today): settled records only, `limit` ≤ 500, no cursor, `count` =
//     page length, `summary` computed over the PAGE.
//   ENGINE BRANCH `remediation/phase-1` (not deployed): adds `seq`, `trade_id`,
//     `status`, `total`, `has_more`, `next_before_seq`, a population-scoped
//     `summary` with `summary_scope`, and per-record provenance.
// Everything the deployed engine does not send is OPTIONAL here, and maps to
// null — never to a guessed value.

/** One ledger/history item as it arrives. */
export interface LedgerItemDTO {
  // present on both contracts (settled records)
  market_id:          string
  direction:          string                 // 'YES' | 'NO'
  size:               number | null          // USD stake
  entry_price:        number | null          // 0–1
  exit_price:         number | null          // 0–1; null while open (deployed: also null for losses — a known defect)
  pnl:                number | null          // USD; null while open
  pnl_percent:        number | null          // 0–100; null while open
  edge_pct:           number | null
  hold_time_seconds:  number | null
  opened_at:          string                 // naive ISO (engine UTC)
  closed_at:          string | null
  won:                boolean | null
  // engine branch: the engine's own outcome (WIN | LOSS | PUSH | CANCELLED);
  // `won` is null for anything but WIN / LOSS there
  outcome?:           string | null
  asset_category?:    string | null
  asset_symbol?:      string | null
  duration_minutes?:  number | null
  // engine branch only
  seq?:               number | null
  trade_id?:          string | null
  status?:            'open' | 'settled'
  mode?:              string | null
  session_id?:        string | null
  execution_model?:   string | null
  market_question?:   string | null
  market_closes_at?:  string | null
  shares?:            number | null
  confidence?:        number | null
  resolution_source?: 'venue_final' | 'simulated' | null
  order_id?:          string | null          // live executor positions only
}

export interface LedgerSummaryDTO {
  total_pnl:           number
  wins:                number
  losses:              number
  win_rate:            number | null          // 0–100
  // engine branch only
  total_trades?:       number
  settled?:            number
  open?:               number
  realized_pnl?:       number
  volume_usd?:         number
  open_exposure_usd?:  number
  all_values_finite?:  boolean
}

export interface LedgerSummaryScopeDTO {
  population: string
  session_id: string | null
  filters:    Record<string, unknown>
  from:       string | null
  to:         string | null
  count:      number
  as_of:      string
}

/** Response of /api/trades/ledger (`ledger`) or /api/positions/history (`history`). */
export interface LedgerPageDTO {
  available:        boolean
  ledger?:          LedgerItemDTO[]
  history?:         LedgerItemDTO[]
  count:            number
  limit?:           number
  timestamp:        string
  summary?:         LedgerSummaryDTO
  // engine branch only
  mode?:            string
  durable?:         boolean
  total?:           number
  has_more?:        boolean
  next_before_seq?: number | null
  summary_scope?:   LedgerSummaryScopeDTO
}

// ─── Domain ──────────────────────────────────────────────────────────────────

export type LedgerStatus = 'open' | 'settled'
export type ResolutionSource = 'venue_final' | 'simulated'

export interface LedgerItem {
  /** Stable position in the engine's append-only record; null on the deployed contract and for open trades. */
  seq:              number | null
  tradeId:          string | null
  status:           LedgerStatus
  mode:             string | null
  sessionId:        string | null
  /** e.g. "simulated_instant_full_fill" (paper). Null when not reported. */
  executionModel:   string | null
  marketId:         string
  marketQuestion:   string | null
  assetSymbol:      string | null
  assetCategory:    string | null
  durationMinutes:  number | null
  marketClosesAt:   number | null           // epoch ms
  direction:        'yes' | 'no'
  sizeUsd:          number | null
  shares:           number | null
  entryPriceCents:  number | null
  exitPriceCents:   number | null
  pnl:              number | null
  pnlFraction:      number | null           // 0.44 = +44%
  won:              boolean | null
  /** Engine outcome as reported (engine branch); null when not reported. */
  outcome:          string | null
  edgePct:          number | null
  confidence:       number | null
  openedAt:         number                  // epoch ms
  closedAt:         number | null
  holdTimeSeconds:  number | null
  resolutionSource: ResolutionSource | null
  orderId:          string | null
}

/**
 * How this response can be navigated. `cursor`: the engine pages by seq and
 * reports a reliable total. `capped`: the engine returned at most `limit`
 * records and cannot page (today's deployment) — older records exist but are
 * not retrievable.
 */
export type LedgerPaging =
  | { kind: 'cursor'; total: number; hasMore: boolean; nextBeforeSeq: number | null }
  | { kind: 'capped'; returned: number; requestedLimit: number | null }

export interface LedgerSummary {
  totalTrades:     number | null
  settled:         number | null
  open:            number | null
  wins:            number
  losses:          number
  winRate:         number | null           // 0–1
  realizedPnl:     number
  volumeUsd:       number | null
  openExposureUsd: number | null
  allFinite:       boolean | null
}

/**
 * What population `summary` describes. `population`: every record matching
 * the filters in the session (engine branch). `page`: only the records in this
 * response — the deployed engine computes its summary over the page.
 */
export type SummaryScope =
  | { kind: 'population'; sessionId: string | null; from: number | null; to: number | null; count: number }
  | { kind: 'page'; count: number }

export interface LedgerPage {
  available:     boolean
  items:         LedgerItem[]
  paging:        LedgerPaging
  summary:       LedgerSummary | null
  summaryScope:  SummaryScope | null
  /** false: live-mode records are in-memory (capped at 100, lost on restart). Null: not reported. */
  durable:       boolean | null
  mode:          string | null
  /** True when the endpoint accepts `status` and `before_seq` (engine branch). */
  supportsCursor: boolean
  timestamp:     number
}

export interface LedgerPageQuery {
  limit:       number
  beforeSeq?:  number
  status?:     'all' | 'open' | 'settled'
  direction?:  'YES' | 'NO'
}
