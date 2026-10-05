'use client'

// MarketField — the fourth movement of the Overview: the markets, ordered by
// the engine's relationship to them rather than by Polymarket's interest.
//
// ─── The finding this composition is built on ────────────────────────────────
// Inspected live on 2026-09-11: /api/markets returned 58 markets. Two were
// `market_tier: 1`, `asset_category: crypto`, `duration_minutes: 15` — the
// Bitcoin / Ethereum Up-or-Down windows the engine actually trades, carrying a
// baseline price, live edges and a countdown. Fifty-six were `market_tier: 3`
// event markets — 2028 nomination questions with $50M of volume — that the
// engine merely observes.
//
// The previous lower half inverted that. FeaturedMarkets sorted by
// `liquidity ?? volume24h`, and `liquidity` is always null, so it was a volume
// sort; TrendingMarkets was also a volume sort. Both therefore filled with the
// same tier-3 nomination markets — the same six rendered twice, first as cards
// and then as the first six rows of the table beneath — while the two markets
// the engine was trading sat in eight tiny rows of a 300px rail.
//
// ─── Three kinds of information, three grammars ──────────────────────────────
//
//   THE ENGINE'S FIELD   the markets it trades       → cards (2, rich)   lead
//   CONSENSUS            a reading ABOUT the field   → ruled block       aside
//   THE OBSERVED BOARD   everything else it sees     → dense table       below
//
// Each grammar is earned by the shape of the information, not chosen for
// variety. A tradeable market with its own lifecycle and resolution rule IS a
// discrete object, and a card is the correct container for one — there are
// simply two of them, not six. Fifty-six comparable observations with identical
// attributes are scanned, not read, and belong in a table. Consensus is a
// system-level reading about the field, not a member of it, so it sits beside
// the field under a rule with no container of its own.
//
// ─── What was deliberately not invented ──────────────────────────────────────
// No movement, liquidity, sentiment, tags, or "next window" time — none are on
// the wire. The engine-field partition uses `durationMinutes`, already on
// MarketRow. The ONE derived fact (BTC above/below its baseline) is computed
// only where both inputs are confirmed for the SAME asset, and is marked
// derived. See BaselineReference for the ETH case, where the reported baseline
// cannot be trusted and is withheld rather than rendered.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { useEnginePriceChart } from '@/config/hooks/useServices'
import { parseMarketRows, type MarketRow } from '@/lib/mappers/markets'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { formatBtcPrice } from '@/lib/mappers/priceHistory'
import { formatCompact, formatPercent } from '@/lib/utils'
import { marketLifecycle, formatCloseTime, closeTimestamp } from '@/lib/display/marketLifecycle'
import { compactWindowTitle } from '@/lib/display/market'
import { MARKET_DETAIL_PATH, ROUTES } from '@/config/constants'
import { MarketTable } from '@/components/markets/MarketTable'
import { TableShell, Thead, Th, Tr, Td, ExpansionRow } from '@/components/shared/DataTable'
import { WatchlistButton } from '@/components/shared/WatchlistButton'
import { certaintyFromSlice } from '@/components/shared/Figure'
import { GlobalConsensusBar } from './GlobalConsensusBar'

/** Rows shown on the board before "View all". Matches the previous Trending
 *  table so the page's vertical budget does not grow. */
const BOARD_ROWS = 8

/** A market the engine trades: the short-duration BTC/ETH windows. The
 *  distinction is on the wire (`duration_minutes` is null for tier-3 event
 *  markets) and was simply unused by the previous composition. */
const isEngineMarket = (m: MarketRow) => m.durationMinutes !== null

export function MarketField() {
  const router       = useRouter()
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const edgesSlice   = useApplicationStore((s) => s.engine.edges)
  const chart        = useEnginePriceChart()

  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  const { engineField, observed, total } = useMemo(() => {
    if (!marketsSlice.data) return { engineField: [] as MarketRow[], observed: [] as MarketRow[], total: 0 }
    const parsed = parseMarketRows(marketsSlice.data)
    if (parsed.kind !== 'rows') return { engineField: [] as MarketRow[], observed: [] as MarketRow[], total: 0 }

    // Engine field: edge first, then soonest-closing — the HotMarkets ranking,
    // carried over. This is where the two cards may legitimately differ in
    // emphasis: a market the engine has an edge on carries its accent and its
    // strip; one it is merely tracking does not. Evidence-driven, not a new
    // metric.
    const field = parsed.rows.filter(isEngineMarket).sort((a, b) => {
      const ea = edgeMap.get(a.id), eb = edgeMap.get(b.id)
      if (!!ea !== !!eb) return ea ? -1 : 1
      return (a.closesAt ?? Infinity) - (b.closesAt ?? Infinity)
    })

    // The board: everything else, by volume. Volume is the right ordering
    // HERE — these are the markets the engine observes rather than trades, so
    // Polymarket's interest is the only signal available for ranking them.
    const rest = parsed.rows
      .filter((m) => !isEngineMarket(m))
      .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))

    return { engineField: field, observed: rest, total: parsed.rows.length }
  }, [marketsSlice.data, edgeMap])

  const open = (id: string) => router.push(MARKET_DETAIL_PATH(id))

  // The BTC baselines present in this payload, used to detect a non-BTC market
  // whose reported baseline is actually a BTC figure. See BaselineReference.
  const btcBaselines = useMemo(
    () => new Set(engineField.filter((m) => assetOf(m) === 'BTC').map((m) => m.baselinePrice).filter((b): b is number => b !== null)),
    [engineField],
  )

  const btcNow = chart.data?.currentPrice ?? null

  // ─── The caption must not claim tradeability the lifecycle contradicts ────
  // First render of this section: both tier-1 markets were the 9:45–10:00
  // window, 44 minutes after it closed — the engine still lists a resolved
  // window for a while (the forensic audit caught this too) — and the caption
  // read "2 markets it can trade right now". False. The cards themselves were
  // honest (CLOSED pill, "closed 44m ago"); the caption above them was not.
  //
  // Closed windows stay IN the field: they are what the engine was just
  // trading, they carry its edge, and dropping them would leave the field
  // empty between windows with no trace of what happened. But the caption
  // counts open ones only.
  const openCount = engineField.filter((m) => marketLifecycle(m.closesAt) !== 'closed').length
  const fieldCertainty = certaintyFromSlice(marketsSlice, 8_000)
  const fieldCaption =
    engineField.length === 0 ? 'no 5- or 15-minute market open'
    : openCount === engineField.length ? `${openCount} market${openCount === 1 ? '' : 's'} it can trade right now`
    : openCount === 0 ? `${engineField.length} recent window${engineField.length === 1 ? '' : 's'}, now closed — awaiting the next`
    : `${openCount} open · ${engineField.length - openCount} just closed`

  return (
    // Capped as a whole. The ledger has a readable width (64rem — see
    // EngineLedger) and the rail is 272px; the section is the sum of the two
    // plus their gutter, so at 1920 the rail sits beside the ledger rather
    // than at the far edge of the viewport with 380px of nothing between them
    // (measured). The board beneath shares the same right edge, so the field
    // has one column and one edge, and the width the page does not use is
    // trailing space after the content — not a hole inside it.
    <section aria-labelledby="field-heading" className="mt-7 flex flex-col gap-6 lg:max-w-[83.5rem]">
      <h2 id="field-heading" className="t-section-title">Markets</h2>

      {/* ── The engine's field + consensus ────────────────────────────────
          Asymmetric: the ledger takes the width (capped — see EngineLedger),
          consensus takes a rail. At lg and below the rail drops beneath. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,64rem)_272px] gap-6 lg:gap-10 items-start">
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h3 className="t-label">The engine&rsquo;s field</h3>
            <span className="t-metadata">
              {fieldCaption}
              {/* The ledger's certainty carrier. Every value in the rows below
                  comes from one slice, so one textual statement of its
                  staleness covers them all; the cells dim to match. */}
              {fieldCertainty.certainty === 'stale' && (
                <span className="ml-1.5" style={{ color: 'var(--synatra-warning)' }}>· stale {fieldCertainty.staleFor}</span>
              )}
            </span>
          </div>

          {engineField.length === 0 ? (
            // Between windows there is genuinely nothing to trade. Stated as a
            // fact, not dressed as a card. No "next window" time — the engine
            // does not report one.
            <p className="t-description py-2">
              No 5- or 15-minute market is open. The board below is what the engine is
              observing in the meantime; its own field returns as the next window opens.
            </p>
          ) : (
            <EngineLedger
              windows={engineField}
              edgeMap={edgeMap}
              btcNow={btcNow}
              btcBaselines={btcBaselines}
              stale={fieldCertainty.certainty === 'stale'}
            />
          )}
        </div>

        <aside className="min-w-0">
          <GlobalConsensusBar />
        </aside>
      </div>

      {/* ── The observed board ────────────────────────────────────────────
          Subordinate by grammar (a table, not objects), by position (below),
          and by heading register. Its border is the table's own edge, not a
          decorative container — a different treatment from the cards above,
          so the sequence down the page is card → rule → table. */}
      {observed.length > 0 && (
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h3 className="t-label">
              Observed markets
              <span className="ml-2 normal-case tracking-normal font-normal" style={{ color: 'var(--synatra-text-disabled)' }}>
                {total} open · showing the {Math.min(BOARD_ROWS, observed.length)} busiest
              </span>
            </h3>
            <Link href={ROUTES.MARKETS} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>
              View all →
            </Link>
          </div>
          {/* hideStatus: no tier-3 market on the live payload carries
              `closes_at`, so the column would read "—" on every row.
              quietEmptyEdge: a column of dashes says "no edge here" once;
              eight identical pills said it eight times. */}
          <MarketTable markets={observed.slice(0, BOARD_ROWS)} edgeMap={edgeMap} onSelect={open} dense hideStatus quietEmptyEdge />
        </div>
      )}
    </section>
  )
}

// ─── The engine ledger ────────────────────────────────────────────────────────
//
// ─── Why rows replaced the card grid ─────────────────────────────────────────
// The field was a 2-column grid of MarketCards, which was right at N=2 and
// wrong at both ends. Measured live within one afternoon:
//
//   N=1  at 1920: one 676px card, then 688px of nothing, then the rail
//   N=5  at 1440: five near-identical bordered surfaces across three rows —
//        the card wall this whole phase exists to escape, back in a different
//        coat because four of the five had no edge and were interchangeable
//
// The count of open windows is the engine's business, not the layout's, so
// the composition has to be the same shape at every N. A ledger is: one row
// per window, and the rows are never interchangeable because the engine's
// relationship to each is carried on the row itself.
//
// ─── The rule that decides card vs row ───────────────────────────────────────
// A window the engine is acting on — it holds an edge — carries an accent
// rail and CAN expand beneath itself to show the edge read and the resolution
// baseline; the leading one opens by default. A window it is merely tracking
// stays a compact, unaccented row. So an expansion means something: "the
// engine is doing something here." The old grid gave every window the same
// box and the box meant nothing.
//
// The accent and the default expansion are derived from evidence the wire
// already carries (an entry in /api/edges for that market id) and from the
// ledger's existing order, and from nothing else. No ranking, no score, no
// invented salience.
//
// ─── Built on DataTable, not beside it ───────────────────────────────────────
// Native <table> semantics, keyboard-reachable rows, the same hover wash and
// hairlines the other four consoles use. The three additions it needed —
// `accent` on Tr, `grow`/`hideBelow` on Th/Td, and ExpansionRow — are generic
// and small. The title is a <Link> in its cell and the toggle is a <button> in
// its own cell; the row itself carries no interactive role, so nothing nests
// inside an interactive element.

const YES_COLOR = 'var(--synatra-yes)'
const NO_COLOR  = 'var(--synatra-no)'

export function EngineLedger({
  windows, edgeMap, btcNow, btcBaselines, stale,
}: {
  windows: MarketRow[]
  edgeMap: Map<string, EdgeRow>
  btcNow: number | null
  btcBaselines: Set<number>
  stale: boolean
}) {
  // Expansion: ONE row open by default — the leading edge-bearing window —
  // and every row toggleable. Keyed by market id so a re-sort or a new window
  // arriving does not reset a reader's choice.
  //
  // The first rule opened every edge-bearing row. Live, both of two windows
  // carried an edge and both opened; at N=5 with edges on most of them that
  // is five open expansions — the card wall in a different shape. "Leading"
  // is the first row in the ledger's existing order (edge first, then
  // soonest-closing); no new ranking signal is introduced. The other
  // edge-bearing rows keep their accent rail, which is the row's state
  // carrier, so nothing about which windows the engine is acting on is lost
  // by collapsing them.
  //
  // "Leading" prefers an OPEN window. The ledger's order is edge-first then
  // soonest-closing, and a window that closed five minutes ago has the
  // earliest close of all — so with several edge-bearing windows the default
  // expansion landed on one the engine could no longer trade (seen live,
  // 2026-09-13, while Engine Focus above pointed at an open one). The
  // displayed order is unchanged; only the choice of which row opens is.
  // Closed edge-bearing rows keep their accent and can still be opened by hand.
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  const edgeBearing = windows.filter((w) => edgeMap.has(w.id))
  const leadingEdgeId =
    edgeBearing.find((w) => marketLifecycle(w.closesAt) !== 'closed')?.id
    ?? edgeBearing[0]?.id
    ?? null
  const isOpen = (m: MarketRow) => toggled[m.id] ?? (m.id === leadingEdgeId)
  const toggle = (id: string, current: boolean) => setToggled((s) => ({ ...s, [id]: !current }))

  // Six columns: Market · YES · NO · Edge · Closes · toggle. Volume and Watch
  // are in the expansion, not the row — they are supplementary, and a ledger
  // row earns its width by holding only what is scanned.
  const COLS = 6
  const cellCert = stale ? 'c-stale' : ''

  return (
    // Capped. A ledger row stretched to 1,364px on a 1920 screen is a long
    // line with three numbers at the far end of it; readable content has a
    // width and the rail fills the rest.
    <div className="max-w-5xl">
      <TableShell label="The engine's field — markets it can trade">
        <Thead>
          <Th align="left" dense grow>Market</Th>
          <Th align="right" dense>YES</Th>
          <Th align="right" dense hideBelow="md">NO</Th>
          <Th align="left" dense hideBelow="sm">Edge</Th>
          {/* Below sm, Closes folds into a sub-line under the title — four
              columns at 320px left the title 5px wide (measured). Everything
              essential survives; it changes shape, not presence. */}
          <Th align="right" dense hideBelow="sm">Closes</Th>
          <Th align="center" dense><span className="sr-only">Details</span></Th>
        </Thead>
        <tbody>
          {windows.map((m) => {
            const edge = edgeMap.get(m.id)
            const open = isOpen(m)
            const life = marketLifecycle(m.closesAt)
            const closed = life === 'closed'
            const panelId = `engine-window-${m.id.slice(0, 12)}`

            // The row's one state carrier: the edge direction, at the edge.
            // No edge, no accent — a plain row says "tracking" without a chip.
            const accent = edge
              ? (edge.direction.toLowerCase() === 'yes' ? YES_COLOR : NO_COLOR)
              : undefined

            return (
              <RowGroup key={m.id}>
                <Tr accent={accent}>
                  <Td align="left" dense grow>
                    <Link
                      href={MARKET_DETAIL_PATH(m.id)}
                      className="focus-ring font-semibold block truncate"
                      style={{ color: closed ? 'var(--synatra-text-muted)' : 'var(--synatra-text-primary)' }}
                      title={m.title}
                    >
                      {/* Below sm the full question truncates to the same
                          string on every row — measured at 375 with N=5:
                          five rows all reading "Bitcoin Up or Down –
                          September 13, …", the time window (the row's
                          identity) being exactly what was cut. So the
                          narrow width shows the asset and the window,
                          read from the title itself; the full title is
                          the accessible name and the tooltip. Above sm
                          the full question is shown as before. */}
                      <span className="sm:hidden">{compactWindowTitle(m.title)}</span>
                      <span className="hidden sm:inline">{m.title}</span>
                    </Link>
                    {/* The mobile sub-line: what the hidden columns carried.
                        Only below sm — above it these are real columns. */}
                    <span
                      className={`sm:hidden block font-mono text-2xs mt-0.5 truncate ${cellCert}`}
                      style={{ color: closed ? 'var(--synatra-text-disabled)' : 'var(--synatra-text-muted)' }}
                      title={closeTimestamp(m.closesAt)}
                    >
                      {formatCloseTime(m.closesAt)}
                      {m.noPrice !== null && (
                        <> · NO <span style={{ color: NO_COLOR }}>{Math.round(m.noPrice)}¢</span></>
                      )}
                    </span>
                  </Td>
                  <Td align="right" dense className={cellCert}>
                    <span className="font-mono font-semibold" style={{ color: YES_COLOR }}>
                      {m.yesPrice !== null ? `${Math.round(m.yesPrice)}¢` : '—'}
                    </span>
                    {/* Between sm and md the NO column is hidden and the
                        sub-line is gone, so the pair shows here as "44 · 56¢". */}
                    {m.noPrice !== null && (
                      <span className="hidden sm:inline md:hidden font-mono" style={{ color: 'var(--synatra-text-muted)' }}>
                        {' · '}<span style={{ color: NO_COLOR }}>{Math.round(m.noPrice)}¢</span>
                      </span>
                    )}
                  </Td>
                  <Td align="right" dense hideBelow="md" className={cellCert}>
                    <span className="font-mono font-semibold" style={{ color: NO_COLOR }}>
                      {m.noPrice !== null ? `${Math.round(m.noPrice)}¢` : '—'}
                    </span>
                  </Td>
                  <Td align="left" dense hideBelow="sm">
                    {edge ? (
                      <span className="font-mono text-2xs font-semibold" style={{ color: accent }}>
                        {edge.direction.toUpperCase()} · {edge.edgePct.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-2xs" style={{ color: 'var(--synatra-text-disabled)' }} aria-label="No active edge">—</span>
                    )}
                  </Td>
                  <Td align="right" dense hideBelow="sm" className={cellCert}>
                    <span
                      className="font-mono text-2xs"
                      style={{ color: closed ? 'var(--synatra-text-disabled)' : 'var(--synatra-text-secondary)' }}
                      title={closeTimestamp(m.closesAt)}
                    >
                      {formatCloseTime(m.closesAt)}
                    </span>
                  </Td>
                  <Td align="center" dense>
                    <button
                      type="button"
                      onClick={() => toggle(m.id, open)}
                      aria-expanded={open}
                      aria-controls={panelId}
                      aria-label={`${open ? 'Hide' : 'Show'} details for ${m.title}`}
                      className="focus-ring inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer"
                      style={{ color: 'var(--synatra-text-muted)' }}
                    >
                      <span aria-hidden="true" className="text-xs">{open ? '▾' : '▸'}</span>
                    </button>
                  </Td>
                </Tr>

                {/* The expansion: the engine's read on this window, and how the
                    window resolves. Everything here is already on the wire;
                    the only derived fact is above/below, which says so. */}
                <ExpansionRow id={panelId} colSpan={COLS} hidden={!open} dense>
                  <div className="flex flex-col gap-2 text-xs">
                    {edge ? (
                      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
                        <span
                          className="text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-sm"
                          style={{
                            background: accent,
                            color: edge.direction.toLowerCase() === 'yes' ? 'var(--synatra-on-yes)' : 'var(--synatra-on-no)',
                          }}
                        >
                          {edge.direction}
                        </span>
                        <span className="font-mono tabular-nums" style={{ color: 'var(--synatra-text-primary)' }}>
                          {edge.edgePct.toFixed(1)}% edge
                        </span>
                        {edge.confidence !== null && (
                          <span className="font-mono tabular-nums" style={{ color: 'var(--synatra-text-muted)' }}>
                            {formatPercent(edge.confidence)} confidence
                          </span>
                        )}
                        {edge.kellySize !== null && (
                          <span className="font-mono tabular-nums" style={{ color: 'var(--synatra-text-muted)' }}>
                            {(edge.kellySize * 100).toFixed(0)}% Kelly
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--synatra-text-muted)' }}>
                        Tracked — no edge on this window.
                      </span>
                    )}

                    <BaselineReference market={m} btcNow={btcNow} btcBaselines={btcBaselines} />

                    <div className="flex items-center justify-between gap-3 flex-wrap text-2xs" style={{ color: 'var(--synatra-text-muted)' }}>
                      <span>
                        {m.volume24h !== null
                          ? <>Vol <strong className="font-mono tabular-nums" style={{ color: 'var(--synatra-text-secondary)' }}>${formatCompact(m.volume24h)}</strong></>
                          : 'Volume not reported'}
                      </span>
                      <WatchlistButton marketId={m.id} />
                    </div>
                  </div>
                </ExpansionRow>
              </RowGroup>
            )
          })}
        </tbody>
      </TableShell>
    </div>
  )
}

/** A fragment with a key — a row and its expansion travel together. */
function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// ─── Baseline reference ───────────────────────────────────────────────────────

/** Which asset a market is about, read from what the market literally says.
 *  Only BTC matters here, because BTC is the only asset the product has a live
 *  price for. Anything else is 'other' — not a guess, an admission. */
function assetOf(m: MarketRow): 'BTC' | 'other' {
  return /\b(bitcoin|btc)\b/i.test(m.title) ? 'BTC' : 'other'
}

/**
 * The resolution baseline and, where it can honestly be computed, its
 * relationship to the live price.
 *
 * ─── Why this is careful ─────────────────────────────────────────────────────
 * `baseline_price` is the single most decision-relevant number on an
 * Up-or-Down market: the market resolves on whether the asset finishes above
 * or below it. It is on the wire, it is already fetched, and no Overview surface
 * showed it before this. But it can only be TURNED INTO a relationship when
 * both inputs are confirmed for the same asset — and the product has exactly
 * one live price feed, for BTC.
 *
 * Measured live on 2026-09-11: the Ethereum market reported
 * `baseline_price: 78710, baseline_price_source: "feed"` — identical to the
 * Bitcoin market's baseline in the same payload, and roughly twenty times the
 * ETH price. That is not an ETH baseline. So:
 *
 *   BTC market, baseline + BTC price present   → baseline · now · above/below
 *                                                 (relationship marked derived)
 *   non-BTC market, baseline equals a BTC one  → WITHHELD, with the reason
 *   non-BTC market, baseline looks its own     → baseline shown; no relationship
 *                                                 (no live price for that asset)
 *
 * Truthfulness over completeness: an ETH card with a blank where the baseline
 * would be is correct; an ETH card claiming "above $78,710" is fabrication.
 */
function BaselineReference({
  market, btcNow, btcBaselines,
}: { market: MarketRow; btcNow: number | null; btcBaselines: Set<number> }) {
  const baseline = market.baselinePrice
  const asset = assetOf(market)

  if (baseline === null) {
    return <ReferenceLine muted>Resolution baseline not reported</ReferenceLine>
  }

  if (asset === 'BTC') {
    if (btcNow === null) {
      return (
        <ReferenceLine>
          Baseline <Mono>{formatBtcPrice(baseline)}</Mono>
          <span style={{ color: 'var(--synatra-text-disabled)' }}> · live price unavailable</span>
        </ReferenceLine>
      )
    }
    const above = btcNow >= baseline
    const tone  = above ? 'var(--synatra-yes)' : 'var(--synatra-no)'
    return (
      <ReferenceLine
        // The relationship is computed client-side from two confirmed values;
        // the word "derived" is its textual carrier, matching the certainty
        // scale used by every figure on the page.
        title="Above/below is derived on this screen from the reported baseline and the live BTC price — not a value the engine sent"
      >
        Baseline <Mono>{formatBtcPrice(baseline)}</Mono>
        <span style={{ color: 'var(--synatra-text-disabled)' }}> · now </span>
        <Mono>{formatBtcPrice(btcNow)}</Mono>
        <span className="font-semibold ml-1.5" style={{ color: tone }}>
          {above ? '▲ above' : '▼ below'}
        </span>
        <span className="ml-1" style={{ color: 'var(--synatra-text-disabled)' }}>· derived</span>
      </ReferenceLine>
    )
  }

  // Non-BTC. If the reported baseline is one of this payload's BTC baselines,
  // it is a BTC figure wearing the wrong label and must not be presented as
  // this market's reference.
  if (btcBaselines.has(baseline)) {
    return (
      <ReferenceLine
        muted
        title={`The engine reported ${formatBtcPrice(baseline)} as this market's baseline — the same figure as the Bitcoin market's. That cannot be this asset's reference, so it is withheld rather than shown. Backend anomaly, not a display fault.`}
      >
        Resolution baseline withheld — reported value matches the BTC baseline
      </ReferenceLine>
    )
  }

  // A baseline that looks like its own. Shown, but with no relationship: the
  // product has no live price for this asset to compare it against.
  return (
    <ReferenceLine>
      Baseline <Mono>{formatBtcPrice(baseline)}</Mono>
      <span style={{ color: 'var(--synatra-text-disabled)' }}> · no live price for this asset</span>
    </ReferenceLine>
  )
}

function ReferenceLine({ children, muted = false, title }: { children: React.ReactNode; muted?: boolean; title?: string }) {
  return (
    <p
      className="text-2xs leading-relaxed"
      style={{ color: muted ? 'var(--synatra-text-disabled)' : 'var(--synatra-text-secondary)' }}
      {...(title !== undefined && { title })}
    >
      {children}
    </p>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono tabular-nums font-semibold" style={{ color: 'var(--synatra-text-primary)' }}>{children}</span>
}
