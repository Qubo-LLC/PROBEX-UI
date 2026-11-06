// The sleeve runway — the engine's sleeve-based paper trading (CRYPTO, EVENTS, and
// HOUSE once it exists), from /api/runway and /api/runway/live.
//
// These replace every figure the dashboard used to take from the retired
// PaperTrader (/api/paper-stats, /api/paper/status, the paper position ledger)
// and from the global survival brain's capital (/api/survival). The engine builds
// both endpoints from its sleeve ledgers only (src/runway.py).

// ─── Wire shapes (snake_case, as the engine sends them) ──────────────────────

export interface SleeveHaltDTO {
  state:  string            // ALIVE | DRAWDOWN_STOP | DEAD
  halted: boolean
  reason: string | null
  since:  number | null     // epoch seconds
}

export interface SleevePositionDTO {
  position_id: string
  market_id:   string
  token:       string
  direction:   string
  shares:      number
  price:       number
  fee_per_share: number
  opened_at:   number
  strategy_id: string
  sizing:      string       // "research" | "risk"
  mark:        number | null
}

export interface SleeveDTO {
  sleeve_id:      string
  allocation:     number
  cash:           number
  equity:         number
  open_positions: number
  open_exposure:  number
  realized_pnl:   number
  unrealized_pnl: number
  high_water_mark: number
  drawdown:       number
  drawdown_pct_of_allocation: number | null
  reserve:        number
  halt:           SleeveHaltDTO
  counts:         Record<string, number>
  rejections:     Record<string, number>
  positions:      SleevePositionDTO[]
  has_research_positions: boolean
}

export interface CurvePointDTO { ts: number; equity: number; event?: string }

export interface ActivityDTO {
  kind:        'order_filled' | 'order_cancelled' | 'settlement'
  sleeve_id:   string
  ts:          number
  window:      string | null
  market_id:   string | null
  token:       string | null
  price:       number | null
  shares:      number | null
  cancel_reason: string | null
  time_to_fill:  number | null
  payout_per_share: number | null
  outcome:     string | null
  pnl:         number | null
  research_sizing: boolean
  position_id: string | null
}

export interface SizerViewDTO {
  equity_start: number
  equity:       number
  placed:       number
  skipped:      Record<string, number>
  pnl:          number
  curve:        CurvePointDTO[]
  sizing:       string
  label?:          string
  balance_source?: string
  default?:        boolean
  deprecated?:     boolean
}

export interface RunwayDTO {
  generated_at: number
  source:       string
  label:        string
  sleeves:      Record<string, SleeveDTO>
  reserve:      { by_sleeve: Record<string, number>; total: number }
  combined:     Omit<SleeveDTO, 'sleeve_id' | 'high_water_mark' | 'drawdown_pct_of_allocation' | 'halt' | 'counts' | 'rejections' | 'positions' | 'has_research_positions'> | null
  equity_curves: Record<string, CurvePointDTO[]>
  activity:     ActivityDTO[]
  views:        Record<string, SizerViewDTO>
}

export interface LiveTokenDTO {
  token:       string
  bid:         number | null
  ask:         number | null
  mid:         number | null
  quote:       { side: string; token: string; price: number; size: number } | null
  not_quoting: string | null
}

export interface LiveWindowDTO {
  asset:            string
  duration_minutes: number
  window:           string | null
  window_start:     string
  window_end:       string
  seconds_left:     number
  elapsed_seconds:  number
  tokens:           LiveTokenDTO[]
}

export interface RunwayLiveDTO {
  generated_at:    number
  rule:            string
  visibility_only: boolean
  label:           string
  windows:         LiveWindowDTO[]
}

// ─── Domain shapes (camelCase, epoch ms) ─────────────────────────────────────

export interface SleeveHalt { state: string; halted: boolean; reason: string | null; sinceMs: number | null }

export interface SleevePosition {
  positionId: string; marketId: string; token: string; direction: string; shares: number
  price: number; feePerShare: number; openedAtMs: number; strategyId: string; sizing: string; mark: number | null
}

export interface Sleeve {
  sleeveId:      string
  allocation:    number
  cash:          number
  equity:        number
  openPositions: number
  openExposure:  number
  realizedPnl:   number
  unrealizedPnl: number
  highWaterMark: number
  drawdown:      number
  drawdownPct:   number | null
  reserve:       number
  halt:          SleeveHalt
  counts:        Record<string, number>
  rejections:    Record<string, number>
  positions:     SleevePosition[]
  researchSized: boolean
}

export interface CurvePoint { tsMs: number; equity: number; event: string | null }

export interface Activity {
  kind:          ActivityDTO['kind']
  sleeveId:      string
  tsMs:          number
  window:        string | null
  marketId:      string | null
  token:         string | null
  price:         number | null
  shares:        number | null
  cancelReason:  string | null
  timeToFill:    number | null
  payoutPerShare: number | null
  outcome:       string | null
  pnl:           number | null
  researchSized: boolean
  positionId:    string | null
}

export interface SizerView {
  equityStart: number; equity: number; placed: number; skipped: Record<string, number>
  pnl: number; curve: CurvePoint[]; sizing: string
  /** Where the view's starting balance comes from (live actual: the pUSD balance in live). */
  balanceSource: string | null
}

export interface RunwayCombined {
  allocation: number; cash: number; equity: number; openPositions: number; openExposure: number
  realizedPnl: number; unrealizedPnl: number; drawdown: number; reserve: number
}

export interface Runway {
  generatedAtMs: number
  source:        string
  label:         string
  /** Sleeves in a fixed order: CRYPTO, EVENTS, HOUSE, then any other. */
  sleeves:       Sleeve[]
  reserveTotal:  number
  reserveBySleeve: Record<string, number>
  combined:      RunwayCombined | null
  equityCurves:  Record<string, CurvePoint[]>
  activity:      Activity[]
  views:         Record<string, SizerView>
}

export interface LiveToken {
  token: string; bid: number | null; ask: number | null; mid: number | null
  quote: { side: string; token: string; price: number; size: number } | null
  notQuoting: string | null
}

export interface LiveWindow {
  asset: string; durationMinutes: number; window: string | null
  windowStartMs: number; windowEndMs: number; secondsLeft: number; elapsedSeconds: number
  tokens: LiveToken[]
}

export interface RunwayLive {
  generatedAtMs: number; rule: string; visibilityOnly: boolean; label: string; windows: LiveWindow[]
}

// ─── Global halt (emergency stop) — /api/sleeves/global-halt ─────────────────

export interface GlobalHaltDTO {
  global_halted:     string | null
  stop_file:         boolean
  sleeve_stop_files: Record<string, boolean>
  timestamp:         string
}

export interface GlobalHalt {
  /** The halt reason, or null when the sleeves are not globally halted. */
  halted:          string | null
  /** data/STOP exists on the VM: the file kill path, which the dashboard cannot clear. */
  stopFile:        boolean
  sleeveStopFiles: Record<string, boolean>
}

// ─── /api/sleeves/events/positions (the Events positions panel; read-only) ───

export interface EventsPositionDTO {
  position_id: string; market_id: string; question: string | null; url: string | null
  strategy_id: string | null; side: string; entry_price: number; shares: number; cost: number
  current_price: number | null; resolution_date: string | null; opened_at: number
  gamma_closed: boolean | null; uma_status: string | null; status: 'open' | 'settled'
  unrealized_pnl: number | null; realized_pnl: number | null; settled_at?: number; outcome?: string | null
}

export interface EventsPositionsDTO {
  sleeve_id: string; simulated: boolean; label: string; generated_at: number
  positions: EventsPositionDTO[]; open: number; settled: number; open_cost: number
  unrealized_pnl: number; realized_pnl: number; price_source: string
}

export interface EventsPosition {
  positionId: string; marketId: string; question: string | null; url: string | null
  strategyId: string | null; side: string; entryPrice: number; shares: number; cost: number
  currentPrice: number | null; resolutionDate: string | null; openedAtMs: number
  status: 'open' | 'settled'; unrealizedPnl: number | null; realizedPnl: number | null
  outcome: string | null; umaStatus: string | null
}

export interface EventsPositions {
  generatedAtMs: number; positions: EventsPosition[]; open: number; settled: number; openCost: number
  unrealizedPnl: number; realizedPnl: number; priceSource: string; label: string
}

// ─── /api/shadow (shadow-live, scope §3B.4) and /api/strategies/ranking (§3B.6) ───

export interface ShadowRowDTO {
  type: string; ts: number; account: string; strategy_id?: string; market_id?: string; token?: string
  price?: number; shares?: number; cost?: number; pnl?: number; equity?: number; reason?: string; question?: string
}
export interface ShadowAccountDTO {
  settings: Record<string, number>
  state: { cash: number; start: number; realized_pnl: number; halted: string | null; positions: unknown[]; counts: Record<string, number> } | null
  equity_curve: { ts: number; equity: number }[]
  trades: ShadowRowDTO[]; skipped: ShadowRowDTO[]; skipped_by_reason: Record<string, number>; orders_built: number
}
export interface ShadowDTO { label: string; accounts: Record<string, ShadowAccountDTO> }

export interface RankingRowDTO {
  id: string; tier: string; status: 'passed' | 'testing' | 'retired'; target_n: number | null; n: number | null
  entries?: number; edge_cents: number | null; ci_cents: [number, number] | null; capacity_usd_day: number | null; evidence: string
}
export interface RankingDTO { updated: string; rules: string; candidates: RankingRowDTO[]; passed: string[] }

// ─── /api/research/ledgers (v7.8 item 3): active candidates' research and paper ledgers ───
export interface ResearchLedgerDTO {
  id: string; name: string; status: string; n: number; target: number
  ev_per_dollar: number | null; ci: [number | null, number | null] | null; pnl: number | null; unit: string; note: string
}
export interface ResearchLedgersDTO { available: boolean; ts?: number; note?: string; ledgers: ResearchLedgerDTO[] }
