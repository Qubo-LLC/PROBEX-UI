'use client'

// MarketEngineView — what the engine currently thinks about this market, and
// the evidence behind it.
//
// ─── What this replaces ──────────────────────────────────────────────────────
// EngineThesisPanel (a "Key Metrics" grid of bordered tiles: YES price, edge,
// volume, close time) and AutoExecutionPanel (a side rail: "Would Trigger
// Trade: Yes/No", Kelly size, source signal). Two containers, the same facts
// twice, and three rows that could never render because `kellySize`, `signal`
// and `recommendation` are not on the /api/edges wire.
//
// ─── The hierarchy (Investigation lens) ──────────────────────────────────────
//   A  the verdict: one sentence — would act / blocked and why / holding /
//      closed — from deriveEngineFocus, the same reading Overview leads with
//   B  the figures it rests on: YES price, the engine's edge, the threshold
//      it must clear, the book on this market — each with its own certainty
//   C  the evidence beneath: confidence, RSI, MACD, alignment, detected-at,
//      the reported baseline and (BTC only, marked derived) where BTC sits
//
// Nothing here says WHY a trade happened. The wire relates an edge and a trade
// only by market id and time; that is shown as two facts side by side, never
// as one causing the other.

import type { MarketRow } from '@/lib/mappers/markets'
import { clockOrDate } from '@/lib/display/time'
import type { EdgeRow } from '@/lib/mappers/edges'
import type { SurvivalStatus } from '@/types/engine'
import type { ServiceState } from '@/lib/services/response'
import { deriveEngineFocus, type EngineFocusState } from '@/lib/display/engineFocus'
import { baselineReading, type MarketBook } from '@/lib/display/marketDetail'
import { formatEdgePct } from '@/lib/display/engine'
import { formatBtcPrice } from '@/lib/mappers/priceHistory'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { DETECTOR_THRESHOLD_UNREPORTED, SURVIVAL_FLOOR_LABEL } from '@/lib/display/thresholds'

const YES = 'var(--synatra-yes)'
const NO  = 'var(--synatra-no)'

interface MarketEngineViewProps {
  market:   MarketRow | undefined
  expired:  boolean
  /** The slice the market record came from, for the price figure's certainty. */
  marketSlice: ServiceState<unknown>
  edge:     EdgeRow | undefined
  edges:    ServiceState<unknown>
  survival: ServiceState<SurvivalStatus>
  /** Live BTC price from /api/stats, for the baseline relationship. */
  btcNow:   number | null
  /** Null until the ledger and positions have answered. */
  book:     MarketBook | null
}

export function MarketEngineView({ market, expired, marketSlice, edge, edges, survival, btcNow, book }: MarketEngineViewProps) {
  const surv = survival.data ?? null
  const edgesKnown = edges.data !== null
  const focus: EngineFocusState | null = expired ? null : deriveEngineFocus({ topEdge: edge ?? null, edgesKnown, survival: surv })
  const baseline = market !== undefined ? baselineReading(market, btcNow) : null
  const edgeTone = edge ? (edge.direction === 'yes' ? YES : NO) : undefined

  return (
    <section aria-labelledby="md-engine" className="flex flex-col gap-4 pt-6" style={{ borderTop: '1px solid var(--synatra-border)' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-baseline gap-2 flex-wrap">
          <h2 id="md-engine" className="t-section-title">Engine view</h2>
          <span className="t-description">what it sees on this market now</span>
        </span>
        <span className="t-metadata">/api/edges · /api/survival · /api/markets/:id</span>
      </div>

      {/* A — the verdict */}
      <Verdict focus={focus} expired={expired} survival={surv} edgesState={edges} />

      {/* B — the figures */}
      <div className="flex items-start gap-x-8 gap-y-3 flex-wrap">
        {market !== undefined && market.probability !== null ? (
          <Figure label="YES price" size="md" tone={YES} title="yes_price from the market record" {...certaintyFromSlice(marketSlice, 8_000)}>
            {(market.probability * 100).toFixed(1)}¢
          </Figure>
        ) : (
          <Figure label="YES price" size="md" certainty="absent" absentReason={expired ? 'expired · no quote' : 'no quote in the record'}>—</Figure>
        )}

        {edge ? (
          <Figure
            label="Engine edge"
            size="md"
            tone={edgeTone}
            title={edge.detectedAt !== null ? `Detected ${new Date(edge.detectedAt).toLocaleString()}` : '/api/edges'}
            footnote={edge.confidence !== null ? <span className="t-helper">{formatPercent(edge.confidence)} confidence</span> : undefined}
            {...certaintyFromSlice(edges, 8_000)}
          >
            {edge.direction.toUpperCase()} {formatEdgePct(edge.edgePct)}
          </Figure>
        ) : (
          <Figure
            label="Engine edge"
            size="md"
            certainty="absent"
            absentReason={expired ? 'expired · not scanned' : edgesKnown ? 'no edge this cycle' : 'waiting for /api/edges'}
          >
            —
          </Figure>
        )}

        {/* The survival brain's CURRENT floor — context for a verdict on a
            market it is still evaluating. Not "the" requirement: the detector's
            own threshold is not reported (lib/display/thresholds). On an expired market
            there is no verdict for it to qualify, so it is not shown. */}
        {expired ? null : surv ? (
          <Figure
            label={SURVIVAL_FLOOR_LABEL}
            size="md"
            title={`min_edge_threshold from /api/survival — the survival brain moves this as capital changes; ${DETECTOR_THRESHOLD_UNREPORTED}`}
            footnote={<span className="t-helper">Kelly ×{surv.kellyModifier.toFixed(2)} · {surv.state}</span>}
            {...certaintyFromSlice(survival, 5_000)}
          >
            {formatEdgePct(surv.minEdgeThreshold)}
          </Figure>
        ) : (
          <Figure label={SURVIVAL_FLOOR_LABEL} size="md" certainty="absent" absentReason="waiting for /api/survival">—</Figure>
        )}

        <BookFigure book={book} />
      </div>

      {/* C — the evidence */}
      <EdgeEvidence edge={edge} />
      {baseline !== null && <BaselineLine reading={baseline} />}
    </section>
  )
}

// ─── A · verdict ──────────────────────────────────────────────────────────────

function Verdict({ focus, expired, survival, edgesState }: {
  focus: EngineFocusState | null
  expired: boolean
  survival: SurvivalStatus | null
  edgesState: ServiceState<unknown>
}) {
  let text: string
  let tone = 'var(--synatra-text-primary)'

  if (expired) {
    text = 'Closed — the engine no longer evaluates this market. What it saw and did is below.'
    tone = 'var(--synatra-text-secondary)'
  } else if (focus === null || focus.kind === 'unknown') {
    text = edgesState.status === 'error'
      ? 'The edge detector did not answer — whether the engine sees an edge here is unknown.'
      : 'Waiting for the edge detector.'
    tone = 'var(--synatra-text-muted)'
  } else if (focus.kind === 'acting') {
    text = `Would act — a ${focus.edge.direction.toUpperCase()} edge of ${formatEdgePct(focus.edge.edgePct)}` +
      (survival ? ` clears the survival brain’s ${formatEdgePct(survival.minEdgeThreshold)} floor.` : '.')
    tone = 'var(--synatra-positive)'
  } else if (focus.kind === 'blocked') {
    const why = focus.reasons.map((r) =>
      r.kind === 'halted'    ? `trading is halted (survival state ${r.state})`
      : r.kind === 'threshold' ? `${formatEdgePct(r.edgePct)} is below the survival brain’s ${formatEdgePct(r.minEdge)} floor`
      : r.kind === 'stale-market-data' ? 'the engine reports its market data is stale'
      : `the Kelly modifier is ${r.kellyModifier.toFixed(2)}, so every position sizes to zero`,
    ).join('; ')
    text = `Sees a ${focus.edge.direction.toUpperCase()} edge but would not act — ${why}.`
    tone = 'var(--synatra-warning)'
  } else if (focus.kind === 'no-valid-markets') {
    text = focus.cause === 'stale'
      ? 'No valid market data — the engine reports its market data is stale, so nothing is being evaluated.'
      : 'No markets in the engine’s current scan — nothing is being evaluated.'
    tone = 'var(--synatra-warning)'
  } else {
    text = focus.halted
      ? `Holding — no edge on this market this cycle, and trading is halted (survival state ${focus.state ?? 'DEAD'}).`
      : 'Holding — the engine reports no edge on this market this cycle.'
    tone = 'var(--synatra-text-secondary)'
  }

  return <p className="text-sm font-medium leading-relaxed m-0" style={{ color: tone }}>{text}</p>
}

// ─── B · the book figure ──────────────────────────────────────────────────────

function BookFigure({ book }: { book: MarketBook | null }) {
  if (book === null) {
    return <Figure label="Book" size="md" certainty="absent" absentReason="waiting for the ledger">—</Figure>
  }
  if (book.open !== null) {
    const p = book.open
    const pnl = p.unrealizedPnl
    return (
      <Figure
        label="Book"
        size="md"
        tone={p.side === 'yes' ? YES : NO}
        footnote={<span className="t-helper">open{pnl !== null ? ` · ${formatSignedCurrency(pnl)} unrealized` : ''}</span>}
      >
        {p.side.toUpperCase()} {p.costBasis !== null ? formatCurrency(p.costBasis) : ''}
      </Figure>
    )
  }
  const t = book.settled[0]
  if (t !== undefined) {
    return (
      <Figure
        label="Book"
        size="md"
        tone={t.won ? 'var(--synatra-positive)' : 'var(--synatra-negative)'}
        footnote={<span className="t-helper">{t.direction.toUpperCase()} {formatCurrency(t.size)} · settled{book.settled.length > 1 ? ` · ${book.settled.length} trades` : ''}</span>}
      >
        {t.won ? 'won' : 'lost'} {formatSignedCurrency(t.pnl)}
      </Figure>
    )
  }
  return <Figure label="Book" size="md" certainty="absent" absentReason="no trade on this market">—</Figure>
}

// ─── C · evidence ─────────────────────────────────────────────────────────────

function EdgeEvidence({ edge }: { edge: EdgeRow | undefined }) {
  if (!edge) return null
  const facts: Array<{ label: string; value: string }> = []
  if (edge.rsi !== null) facts.push({ label: 'RSI', value: `${edge.rsi.toFixed(1)}${edge.rsiSignal ? ` · ${edge.rsiSignal}` : ''}` })
  if (edge.macdTrend !== null) facts.push({ label: 'MACD', value: edge.macdTrend })
  if (edge.alignmentScore !== null) facts.push({ label: 'Alignment', value: formatPercent(edge.alignmentScore) })
  if (edge.detectedAt !== null) facts.push({ label: 'Detected', value: clockOrDate(edge.detectedAt, Date.now(), { seconds: true }) })
  if (facts.length === 0) return null
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 m-0">
      {facts.map((f) => (
        <div key={f.label} className="flex flex-col gap-0.5 min-w-0">
          <dt className="t-label truncate">{f.label}</dt>
          <dd className="m-0 font-mono text-xs font-semibold tabular-nums truncate" style={{ color: 'var(--synatra-text-primary)' }}>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The reported baseline and, only where it can be checked, where BTC sits.
 *  Same rule as Overview's Engine Field: the relationship is derived on this
 *  screen and says so; a non-BTC market's BTC-shaped baseline is withheld. */
function BaselineLine({ reading }: { reading: ReturnType<typeof baselineReading> }) {
  if (reading.kind === 'absent') return null
  if (reading.kind === 'withheld') {
    return <p className="t-helper m-0">Baseline not shown — {reading.reason}.</p>
  }
  if (reading.kind === 'reported') {
    return (
      <p className="t-helper m-0">
        Reported baseline <Mono>{formatBtcPrice(reading.baseline)}</Mono>
        <span style={{ color: 'var(--synatra-text-disabled)' }}> · no live price on this screen to check it against</span>
      </p>
    )
  }
  const tone = reading.above ? YES : NO
  return (
    <p className="t-helper m-0" title="Above/below is derived on this screen from the reported baseline and the live BTC price — not a value the engine sent">
      Baseline <Mono>{formatBtcPrice(reading.baseline)}</Mono>
      <span style={{ color: 'var(--synatra-text-disabled)' }}> · BTC now </span>
      <Mono>{formatBtcPrice(reading.now)}</Mono>
      <span className="font-semibold ml-1.5" style={{ color: tone }}>{reading.above ? '▲ above' : '▼ below'}</span>
      <span className="ml-1" style={{ color: 'var(--synatra-text-disabled)' }}>· derived</span>
    </p>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono tabular-nums" style={{ color: 'var(--synatra-text-secondary)' }}>{children}</span>
}
