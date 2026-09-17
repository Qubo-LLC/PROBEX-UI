'use client'

// useMarketLookup — a market id → readable identity resolver, built from the
// records the store already polls.
//
// ─── Why a lookup and not a field ────────────────────────────────────────────
// /api/events names a market only by its 64-hex condition id. No event carries
// a title, an asset or a window. But the same id appears in records that DO
// describe it — the scanned-markets list (question), the settled-trade ledger
// and the positions history (asset_symbol, duration_minutes), and the open
// positions — all of which are already in the store for other pages. Joining
// on the id costs no request and invents nothing: a label is produced only
// when one of those records actually holds that id, and it is built from that
// record's own fields.
//
// The result is marked `derived` at the row, because it is: the event did not
// say "BTC 15m", another record did.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseMarketRows } from '@/lib/mappers/markets'
import { parsePositionRows } from '@/lib/mappers/positions'
import { compactWindowTitle } from '@/lib/display/market'
import { marketIdentity } from '@/lib/display/positionDisplay'
import type { MarketIdentity, MarketLookup } from '@/lib/display/eventDisplay'

/** `null` when neither descriptor is present — marketIdentity's own fallback
 *  is a truncated id, which is exactly what a lookup must NOT return as an
 *  identity, so the row can tell "unknown market" from "known market". */
function fromDescriptors(assetSymbol: string | null, durationMinutes: number | null, marketId: string): string | null {
  if (assetSymbol === null) return null
  return marketIdentity(assetSymbol, durationMinutes, marketId)
}

export function useMarketLookup(): MarketLookup {
  const markets   = useApplicationStore((s) => s.engine.markets.data)
  const ledger    = useApplicationStore((s) => s.engine.tradesLedger.data)
  const history   = useApplicationStore((s) => s.engine.positionsHistory.data)
  const positions = useApplicationStore((s) => s.engine.positions.data)

  const table = useMemo(() => {
    const map = new Map<string, MarketIdentity>()
    // Weakest source first; a later, richer source overwrites.
    if (positions) {
      const parsed = parsePositionRows(positions)
      if (parsed.kind === 'rows') {
        for (const p of parsed.rows) {
          if (p.marketId === null) continue
          const label = p.marketTitle !== null ? compactWindowTitle(p.marketTitle) : fromDescriptors(p.assetSymbol, p.durationMinutes, p.marketId)
          if (label !== null) map.set(p.marketId, { label, source: 'positions' })
        }
      }
    }
    if (history) {
      for (const t of history.history) {
        const label = fromDescriptors(t.assetSymbol, t.durationMinutes, t.marketId)
        if (label !== null) map.set(t.marketId, { label, source: 'ledger' })
      }
    }
    if (ledger) {
      for (const t of ledger.ledger) {
        const label = fromDescriptors(t.assetSymbol, t.durationMinutes, t.marketId)
        if (label !== null) map.set(t.marketId, { label, source: 'ledger' })
      }
    }
    // The scanned list carries the question itself — the best identity there is.
    if (markets) {
      const parsed = parseMarketRows(markets)
      if (parsed.kind === 'rows') {
        for (const m of parsed.rows) map.set(m.id, { label: compactWindowTitle(m.title), source: 'markets' })
      }
    }
    return map
  }, [markets, ledger, history, positions])

  return useMemo<MarketLookup>(() => (id) => table.get(id) ?? null, [table])
}
