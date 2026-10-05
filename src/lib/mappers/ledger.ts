// Ledger mapper: wire → domain for /api/trades/ledger and /api/positions/history.
// See src/types/ledger.ts for the two contracts this reconciles.

import { naiveUtcToMs } from '@/lib/services/dto'
import type {
  LedgerItem,
  LedgerItemDTO,
  LedgerPage,
  LedgerPageDTO,
  LedgerPaging,
  LedgerSummary,
  SummaryScope,
} from '@/types/ledger'

// Non-finite numbers are passed through, not hidden: an impossible value is
// evidence, and financialTrust reports it.
const num = (v: number | null | undefined): number | null => (typeof v === 'number' ? v : null)
const str = (v: string | null | undefined): string | null => (typeof v === 'string' && v !== '' ? v : null)
const ms = (v: string | null | undefined): number | null => (v ? naiveUtcToMs(v) : null)

export function toLedgerItem(dto: LedgerItemDTO): LedgerItem {
  const status = dto.status ?? (dto.closed_at ? 'settled' : 'open')
  const settled = status === 'settled'
  return {
    seq:              num(dto.seq),
    tradeId:          str(dto.trade_id),
    status,
    mode:             str(dto.mode),
    sessionId:        str(dto.session_id),
    executionModel:   str(dto.execution_model),
    marketId:         dto.market_id,
    marketQuestion:   str(dto.market_question),
    assetSymbol:      str(dto.asset_symbol),
    assetCategory:    str(dto.asset_category),
    durationMinutes:  num(dto.duration_minutes),
    marketClosesAt:   ms(dto.market_closes_at),
    direction:        dto.direction.toLowerCase() === 'no' ? 'no' : 'yes',
    sizeUsd:          num(dto.size),
    shares:           num(dto.shares),
    entryPriceCents:  dto.entry_price === null ? null : dto.entry_price * 100,
    // Not inferred. The deployed engine nulls a paper LOSS's 0.0 exit price (a
    // falsy check, fixed on the engine branch), but live positions closed by
    // emergency-stop also carry null for a different reason — so null stays
    // null and the UI says "not reported".
    exitPriceCents:   dto.exit_price !== null ? dto.exit_price * 100 : null,
    pnl:              settled ? num(dto.pnl) : null,
    pnlFraction:      settled && dto.pnl_percent !== null ? dto.pnl_percent / 100 : null,
    won:              settled ? dto.won : null,
    outcome:          settled ? str(dto.outcome) : null,
    edgePct:          num(dto.edge_pct),
    confidence:       num(dto.confidence),
    openedAt:         naiveUtcToMs(dto.opened_at),
    closedAt:         ms(dto.closed_at),
    holdTimeSeconds:  num(dto.hold_time_seconds),
    resolutionSource: dto.resolution_source ?? null,
    orderId:          str(dto.order_id),
  }
}

function toSummary(dto: LedgerPageDTO): LedgerSummary | null {
  const s = dto.summary
  if (!s) return null
  return {
    totalTrades:     s.total_trades ?? null,
    settled:         s.settled ?? null,
    open:            s.open ?? null,
    wins:            s.wins,
    losses:          s.losses,
    winRate:         s.win_rate === null ? null : s.win_rate / 100,
    realizedPnl:     s.realized_pnl ?? s.total_pnl,
    volumeUsd:       s.volume_usd ?? null,
    openExposureUsd: s.open_exposure_usd ?? null,
    allFinite:       s.all_values_finite ?? null,
  }
}

export function toLedgerPage(dto: LedgerPageDTO, context: { requestedLimit?: number } = {}): LedgerPage {
  const raw = dto.ledger ?? dto.history ?? []
  const items = raw.map(toLedgerItem)
  const supportsCursor = typeof dto.has_more === 'boolean'

  // The deployed /trades/ledger does not echo `limit` (only /positions/history
  // does), so the limit this client sent is the fallback — it is what decides
  // whether a fuller response is possible.
  const requestedLimit = dto.limit ?? context.requestedLimit ?? null
  const paging: LedgerPaging = supportsCursor
    ? { kind: 'cursor', total: dto.total ?? items.length, hasMore: dto.has_more === true, nextBeforeSeq: dto.next_before_seq ?? null }
    : { kind: 'capped', returned: items.length, requestedLimit }

  let summaryScope: SummaryScope | null = null
  if (dto.summary_scope) {
    summaryScope = {
      kind: 'population',
      sessionId: dto.summary_scope.session_id,
      from: ms(dto.summary_scope.from),
      to: ms(dto.summary_scope.to),
      count: dto.summary_scope.count,
    }
  } else if (dto.summary) {
    // Deployed engine: the summary is computed over the returned page
    // (CONFIRMED in engine code: closed_trades[-limit:] precedes the sums).
    summaryScope = { kind: 'page', count: items.length }
  }

  return {
    available:      dto.available,
    items,
    paging,
    summary:        toSummary(dto),
    summaryScope,
    durable:        typeof dto.durable === 'boolean' ? dto.durable : null,
    mode:           str(dto.mode),
    supportsCursor,
    timestamp:      naiveUtcToMs(dto.timestamp),
  }
}

/**
 * Append an older page to what is already loaded. Keyed by seq when the engine
 * provides it (cursor contract), so a record can never appear twice.
 */
export function appendOlderPage(loaded: readonly LedgerItem[], older: readonly LedgerItem[]): LedgerItem[] {
  const seen = new Set(loaded.map((i) => (i.seq !== null ? `s${i.seq}` : `${i.marketId}|${i.openedAt}`)))
  const merged = [...loaded]
  for (const item of older) {
    const key = item.seq !== null ? `s${item.seq}` : `${item.marketId}|${item.openedAt}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(item)
    }
  }
  return merged
}

/** Plain-language statement of what a summary covers. Never says "total" for a page. */
export function describeSummaryScope(scope: SummaryScope | null): string {
  if (!scope) return 'The engine did not report a summary.'
  if (scope.kind === 'page') {
    return `These figures cover only the ${scope.count.toLocaleString()} records in this response — the engine computes its summary over the page, not the session.`
  }
  return `All ${scope.count.toLocaleString()} records matching the filters${scope.sessionId ? ` in session ${scope.sessionId}` : ''}.`
}
