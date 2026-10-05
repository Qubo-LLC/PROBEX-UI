// Trade Ledger view logic (remediation spec Part 1 §6, §8, §12).
//
// Pure functions only. Every statement here is derived from fields the engine
// reports; anything the engine does not model (orders and fills in paper mode,
// position ids, settlement ids) is stated as NOT MODELLED, never filled in.

import type { LedgerItem, LedgerPaging } from '@/types/ledger'
import { ENGINE_HISTORY_MAX } from './historyScope'

/** Plain-language statement of how much of the record is on screen. */
export function describePaging(paging: LedgerPaging, loaded: number, sessionTotal: number | null): string {
  if (paging.kind === 'cursor') {
    return paging.hasMore
      ? `Showing ${loaded.toLocaleString()} of ${paging.total.toLocaleString()} records, newest first`
      : `All ${paging.total.toLocaleString()} records loaded`
  }
  const parts = [`Showing the ${paging.returned.toLocaleString()} most recent records`]
  parts.push(`this engine cannot page — it returns at most ${ENGINE_HISTORY_MAX} per request`)
  if (sessionTotal !== null && sessionTotal > paging.returned) {
    const retrievable = Math.min(sessionTotal, ENGINE_HISTORY_MAX)
    const unreachable = sessionTotal - retrievable
    parts.push(
      `${sessionTotal.toLocaleString()} settled this session` +
        (unreachable > 0 ? `; ${unreachable.toLocaleString()} older ${unreachable === 1 ? 'is' : 'are'} not retrievable until the engine supports paging` : ''),
    )
  }
  return parts.join(' · ')
}

/** True when a capped response can be widened by one larger request. */
export function canLoadMoreCapped(paging: LedgerPaging, sessionTotal: number | null): boolean {
  return paging.kind === 'capped'
    && paging.returned === paging.requestedLimit
    && paging.returned < ENGINE_HISTORY_MAX
    && (sessionTotal === null || sessionTotal > paging.returned)
}

/** Client-side search over LOADED records only (the UI labels it so). */
export function searchLoaded(items: readonly LedgerItem[], text: string): LedgerItem[] {
  const q = text.trim().toLowerCase()
  if (!q) return [...items]
  return items.filter((i) =>
    [i.marketId, i.marketQuestion, i.assetSymbol, i.tradeId, i.durationMinutes ? `${i.durationMinutes}m` : null]
      .some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)),
  )
}

export function statusLabel(item: LedgerItem): string {
  if (item.status === 'open') return 'Open'
  if (item.won === true) return 'Settled · won'
  if (item.won === false) return 'Settled · lost'
  // PUSH / CANCELLED exist in the engine's outcome enum; neither is a loss.
  if (item.outcome) return `Settled · ${item.outcome.toLowerCase()}`
  return 'Settled'
}

export interface RelationshipStep {
  step:   'Trade' | 'Order' | 'Fill' | 'Position' | 'Settlement' | 'P&L'
  status: 'recorded' | 'not-modelled' | 'not-reported' | 'pending'
  text:   string
}

// A record's own mode wins; otherwise the engine's current mode (from
// /api/runtime) decides — in paper mode the ledger routes serve the paper
// trader's records (CONFIRMED in engine code). The deployed engine sends no
// per-record mode, so without this fallback paper trades were described in
// live-mode terms ("no order id reported").
const isSimulated = (item: LedgerItem, engineMode: string | null): boolean =>
  item.executionModel === 'simulated_instant_full_fill' || (item.mode ?? engineMode) === 'paper'

/**
 * The trade → order → fill → position → settlement → P&L chain for one record,
 * built only from what the engine records.
 */
export function relationshipFor(item: LedgerItem, engineMode: string | null = null): RelationshipStep[] {
  const steps: RelationshipStep[] = []
  steps.push({
    step: 'Trade',
    status: 'recorded',
    text: item.tradeId
      ? `${item.tradeId}${item.seq !== null ? ` · record #${item.seq}` : ''}`
      : item.seq !== null ? `Record #${item.seq} (no trade id reported)` : 'No trade id reported by this engine version',
  })

  if (isSimulated(item, engineMode)) {
    steps.push({ step: 'Order', status: 'not-modelled', text: 'Not modelled — paper trades place no order.' })
    steps.push({ step: 'Fill', status: 'not-modelled', text: 'Simulated as an instant full fill at the quoted price; no fill record exists.' })
  } else {
    steps.push({ step: 'Order', status: item.orderId ? 'recorded' : 'not-reported', text: item.orderId ?? 'No order id reported' })
    steps.push({ step: 'Fill', status: 'not-modelled', text: 'The engine keeps no fill records.' })
  }

  steps.push({
    step: 'Position',
    status: 'recorded',
    text: isSimulated(item, engineMode)
      ? 'This record is its own position — the paper engine holds one position per trade, keyed by market.'
      : 'Position keyed by market; the engine keeps no separate position id.',
  })

  if (item.status === 'open') {
    steps.push({ step: 'Settlement', status: 'pending', text: 'Open — not settled yet.' })
    steps.push({ step: 'P&L', status: 'pending', text: 'Realised when the market settles.' })
    return steps
  }

  const source = item.resolutionSource === 'venue_final' ? 'from the venue’s final result'
    : item.resolutionSource === 'simulated' ? 'SIMULATED from prices, not a venue result'
      : 'resolution source not recorded (record predates provenance)'
  steps.push({ step: 'Settlement', status: 'recorded', text: `Settled ${source}.` })
  steps.push({
    step: 'P&L',
    status: item.pnl !== null ? 'recorded' : 'not-reported',
    text: item.pnl !== null ? 'Realised on this record.' : 'Not reported.',
  })
  return steps
}

/**
 * Lifecycle check the record itself supports: was it opened at or after its
 * market's close, as the engine recorded that close? Null when the close time
 * was not recorded (every record before the phase-2 engine).
 */
export function openedAfterClose(item: LedgerItem): boolean | null {
  if (item.marketClosesAt === null) return null
  return item.openedAt >= item.marketClosesAt
}
