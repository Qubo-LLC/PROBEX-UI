'use client'

// MarketsPage — Markets › Live: the engine's current scan, as a ledger.
//
// ─── What was wrong (2026-09-17) ─────────────────────────────────────────────
// A grid of MarketCards with a grid/table toggle beside a MarketTable that
// carried the same facts — the last card wall in the product. The card added
// nothing the row did not have except invented words: "High conviction /
// Moderate / Low conviction" tiers cut at 0.7 and 0.5 on a confidence the
// engine reports as a number and never grades. The sort menu offered
// "Liquidity", a field that has never been on the wire, and "Probability" for
// what the wire calls yes_price. And when the scan was empty — as it has been
// for days while the scan loop reports itself running — the page said "No
// markets this cycle … hasn't returned qualifying 5-minute candidates yet",
// which is a guess about why, on a surface that also covers 15-minute and
// non-Bitcoin markets.
//
// ─── What this is ────────────────────────────────────────────────────────────
// One representation, the shared MarketTable. Five states, each a fact:
//   unavailable   the list did not answer (ErrorState; nothing is removed)
//   loading       waiting for the first answer
//   unrecognized  items arrived in a shape this app will not guess at
//   empty         the scan holds nothing — said with the scanner's own health
//                 word and the archive's count and newest record, as records
//   rows          the scan, with the time it was read
// The archive is read once, only when the scan is empty, so the empty state
// can say where the recorded markets are without pretending they are live.

import { useEffect, useMemo, useState } from 'react'
import { stamp } from '@/lib/display/time'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { useUIStore } from '@/store/uiStore'
import { services } from '@/lib/services'
import { parseMarketRows } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { scannerReading, emptyScanSentence, type ArchiveSummary } from '@/lib/display/marketsLive'
import { MARKET_DETAIL_PATH, ROUTES } from '@/config/constants'
import { MarketFilterBar } from './MarketFilterBar'
import { MarketTable } from './MarketTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState } from '@/components/ui/ErrorState'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

type ArchiveState = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; summary: ArchiveSummary } | { status: 'error' }

/** The archive's count and newest snapshot, read once when asked for. */
function useArchiveSummary(enabled: boolean): ArchiveState {
  const [state, setState] = useState<ArchiveState>({ status: 'idle' })
  useEffect(() => {
    if (!enabled) return
    let active = true
    setState({ status: 'loading' })
    services.engine.getMarketsSummary()
      .then((r) => {
        if (!active) return
        const newest = r.data.markets.reduce<number | null>((n, m) => (n === null || m.lastSnapshot > n ? m.lastSnapshot : n), null)
        setState({ status: 'ready', summary: { count: r.data.count, newest } })
      })
      .catch(() => { if (active) setState({ status: 'error' }) })
    return () => { active = false }
  }, [enabled])
  return state
}

export function MarketsPage({ embedded = false }: EmbeddableProps = {}) {
  const router = useRouter()
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const edgesSlice   = useApplicationStore((s) => s.engine.edges)
  const healthSlice  = useApplicationStore((s) => s.engine.health)

  const search    = useUIStore((s) => s.marketSearch)
  const timeframe = useUIStore((s) => s.marketTimeframe)
  const sortBy    = useUIStore((s) => s.marketSortBy)
  const sortDir   = useUIStore((s) => s.marketSortDir)

  const marketRows = useMemo(
    () => (marketsSlice.data ? parseMarketRows(marketsSlice.data) : null),
    [marketsSlice.data],
  )
  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  const filtered = useMemo(() => {
    if (marketRows?.kind !== 'rows') return []
    let list = marketRows.rows
    if (timeframe !== null) list = list.filter((m) => m.durationMinutes === timeframe)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((m) => m.title.toLowerCase().includes(q))
    }
    const mult = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'probability': return mult * ((a.probability ?? 0) - (b.probability ?? 0))
        case 'closesAt':    return mult * ((a.closesAt ?? 0) - (b.closesAt ?? 0))
        case 'volume24h':
        default:            return mult * ((a.volume24h ?? 0) - (b.volume24h ?? 0))
      }
    })
  }, [marketRows, timeframe, search, sortBy, sortDir])

  const handleSelect = (id: string) => router.push(MARKET_DETAIL_PATH(id))

  /** The list failed to load — a different fact from "the engine returned zero
   *  markets", and the page must not blur them. */
  const marketsUnavailable = marketsSlice.status === 'error' && !marketsSlice.data
  const isEmpty = marketRows?.kind === 'empty'

  const archive = useArchiveSummary(isEmpty)
  const scanner = scannerReading(healthSlice.data?.components ?? null)
  const readAt  = marketsSlice.lastUpdatedAt

  return (
    <div className={pageShell(embedded, 'gap-4')}>
      {!embedded && (
        <PageHeader title="Markets" subtitle="The engine’s current scan, and where it sees an edge" />
      )}

      {marketsUnavailable && (
        <ErrorState
          title="Market list unavailable"
          description={`${marketsSlice.error?.message ?? 'The /api/markets endpoint did not respond.'} Whether the engine holds any market right now is unknown; nothing has been removed from your watchlist.`}
          fullPage={false}
        />
      )}

      {marketRows?.kind === 'rows' && (
        <div className="sticky top-0 z-10 -mx-5 px-5 pb-2" style={{ background: 'var(--probex-bg)', borderBottom: '1px solid var(--probex-border)' }}>
          <MarketFilterBar />
        </div>
      )}

      {marketsSlice.status === 'loading' && !marketsSlice.data && (
        <p className="t-description">Waiting for /api/markets — the engine’s market fetcher can take several seconds under rate limiting.</p>
      )}

      {marketRows?.kind === 'unrecognized' && (
        <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>
          The engine reports {marketRows.count} market{marketRows.count === 1 ? '' : 's'} in its scan, but the item shape does not match the agreed schema — the list is withheld rather than shown with wrong values.
        </p>
      )}

      {isEmpty && (
        <section aria-labelledby="mk-empty" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 id="mk-empty" className="t-section-title">Nothing in the scan</h2>
            <span className="t-metadata">
              /api/markets{readAt !== null ? ` · read ${stamp(readAt)}` : ''}
              {marketsSlice.isStale && ' · stale'}
            </span>
          </div>
          <p className="t-helper m-0">
            {emptyScanSentence(scanner, archive.status === 'ready' ? archive.summary : null, stamp)}
            {archive.status === 'error' && ' The archive did not answer.'}
          </p>
          <p className="t-description">
            <Link href={`${ROUTES.MARKETS}?view=archive`} className="focus-ring font-semibold" style={{ color: 'var(--probex-primary)' }}>Recorded markets →</Link>
            {' · '}
            <Link href={`${ROUTES.STRATEGY}?view=pipeline`} className="focus-ring font-semibold" style={{ color: 'var(--probex-primary)' }}>What the scan looks for →</Link>
          </p>
        </section>
      )}

      {marketRows?.kind === 'rows' && (
        <>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="t-helper m-0">
              {filtered.length === marketRows.rows.length
                ? `${marketRows.rows.length} market${marketRows.rows.length === 1 ? '' : 's'} in the scan`
                : `${filtered.length} of ${marketRows.rows.length} market${marketRows.rows.length === 1 ? '' : 's'} in the scan`}
              {timeframe !== null ? ` · ${timeframe}m` : ''}
            </p>
            <span className="t-metadata">
              /api/markets{readAt !== null ? ` · read ${stamp(readAt)}` : ''}
              {marketsSlice.isStale && ' · stale'}
            </span>
          </div>
          <MarketTable markets={filtered} edgeMap={edgeMap} onSelect={handleSelect} />
        </>
      )}
    </div>
  )
}
