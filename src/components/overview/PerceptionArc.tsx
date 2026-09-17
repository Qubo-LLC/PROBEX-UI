'use client'

// PerceptionArc — the second arc: what the engine SEES in the market above,
// and what it is doing about it.
//
// ─── The three states are the whole point ────────────────────────────────────
// These are carried over from EngineFocusHero unchanged in logic, because the
// distinction they draw is the most valuable thing on the Overview and it took
// real work to get right:
//
//   EdgeFound    the engine reports a candidate that cleared its threshold
//   EdgeHolding  the engine answered and reports nothing qualifying — a
//                DECISION the engine took, and only claimable because /api/edges
//                actually returned
//   EdgeUnknown  the engine has not told us. NOT the same as holding: rendering
//                "holding" on a failed request invents intelligence out of a
//                network error
//   EdgeBlocked  (added 2026-09-13) a candidate exists but the engine's own
//                operational state says it cannot act — survival DEAD, edge
//                below the threshold the brain currently requires, or Kelly
//                sizing at zero. Operational state leads; the candidate is
//                shown as context. See lib/display/engineFocus.
//
// Only the composition changes. Previously these sat in the right half of a
// split card with a provenance badge above them; now they sit directly beneath
// the market they are a reading of, with the signal ledger alongside, and the
// badge is gone — EdgeUnknown states the failure in words, which is both louder
// and more specific than a chip reading "No feed".
//
// ─── Cadence ─────────────────────────────────────────────────────────────────
// OPERATIONAL tier — /api/edges at 8s, /api/survival at 5s. Discrete arrivals,
// no drift, no flash. Nothing here moves.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEdgeRows, type EdgeRow } from '@/lib/mappers/edges'
import { formatPercent } from '@/lib/utils'
import { formatEdgePct, survivalStateLabel } from '@/lib/display/engine'
import { deriveEngineFocus, type BlockReason } from '@/lib/display/engineFocus'
import { RadialGauge } from '@/components/shared/RadialGauge'
import { Figure, certaintyFromSlice, type FigureCertaintyProps } from '@/components/shared/Figure'

export function PerceptionArc() {
  const edgesSlice = useApplicationStore((s) => s.engine.edges)
  const survival   = useApplicationStore((s) => s.engine.survival)
  const stats      = useApplicationStore((s) => s.engine.stats)

  const edges = useMemo<EdgeRow[]>(() => {
    if (!edgesSlice.data) return []
    const parsed = parseEdgeRows(edgesSlice.data)
    return parsed.kind === 'rows' ? [...parsed.rows].sort((a, b) => b.edgePct - a.edgePct) : []
  }, [edgesSlice.data])

  const topEdge       = edges[0] ?? null
  const edgeCount     = edgesSlice.data?.count ?? null
  const minEdge       = survival.data?.minEdgeThreshold ?? null
  const edgesDetected = stats.data?.edgesDetected ?? null

  // ─── Operational state outranks signal state ──────────────────────────────
  // A candidate is only the engine's DECISION if the engine can act on it. When
  // the survival brain has halted trading, or the candidate falls below the
  // threshold the brain currently requires, or Kelly sizing is zero, the block
  // leads with that and shows the candidate as context. See lib/display/
  // engineFocus for the precedence and the live contradiction that forced it.
  const focus = deriveEngineFocus({
    topEdge,
    edgesKnown: edgesSlice.data !== null,
    survival: survival.data,
  })

  return (
    // ─── Why this is no longer two columns ────────────────────────────────
    // It was `grid lg:grid-cols-[1fr_auto] items-start`, which produced two
    // separate defects that read as one.
    //
    // Measured at 1440: section 150px, decision column 109px, ledger 66px —
    // leaving 64px of dead space beneath the ledger, and a `border-l` divider
    // that spanned only the ledger's own height. So the section's bottom rule
    // ran the full width while the right two-thirds of the content stopped
    // 64px short of it, beside an orphaned stub of a divider. That is what made
    // the section look clipped rather than composed: not padding, but a
    // top-aligned column that ended early.
    //
    // The same structure caused the second problem. As a peer COLUMN, the
    // signal ledger read as a group floating beside the decision rather than as
    // support for it. Moving it inside the rail, below the decision and under a
    // hairline, makes the subordination structural: the rail now contains
    // label → decision → supporting figures, in that order, and the section's
    // height is purely the sum of its content.
    <section
      aria-labelledby="arc-perception"
      className="py-5"
      style={{ borderBottom: '1px solid var(--probex-border)' }}
    >
      {/* ── The decision, given authority ─────────────────────────────────
          This block is the page's semantic climax: the market above is
          context, and THIS is what the engine did about it. It read as the
          quietest thing in its own arc — an 18px line sitting between a 52px
          price and a 4xl capital figure, so the eye finished on an account
          balance rather than on a decision.
          Authority is restored on three axes that are NOT raw size, because
          making it the biggest number would just re-stage the market arc:
            · an accent rule tying it to the ENGINE FOCUS label
            · the decision verb at t-metric weight and size
            · everything downstream (commitment) stepped DOWN a register
          The result decays display → decision → commitment, and the reader
          lands on the engine rather than on the balance. */}
      {/* The rail now spans the whole movement — label, decision and the
          figures that support it — so it reads as one block with one accent
          rather than a rail beside an unattached column. */}
      <div
        className="flex flex-col gap-4 min-w-0 pl-4"
        style={{ borderLeft: '2px solid var(--probex-primary)' }}
      >
        <h2 id="arc-perception" className="t-label" style={{ color: 'var(--probex-primary)' }}>
          Engine focus
        </h2>

        {focus.kind === 'acting' ? (
          <EdgeFound edge={focus.edge} />
        ) : focus.kind === 'blocked' ? (
          <EdgeBlocked edge={focus.edge} reasons={focus.reasons} halted={focus.halted} />
        ) : focus.kind === 'holding' ? (
          <EdgeHolding minEdge={minEdge} halted={focus.halted} state={focus.state} />
        ) : (
          <EdgeUnknown errored={edgesSlice.status === 'error'} />
        )}

        {/* The signal ledger — quantifies "no edge" rather than merely
            asserting it, which is the difference between an engine that is idle
            and one that is actively rejecting candidates. Sits at the `sm`
            register, beneath the decision and under a hairline: it supports the
            reading above it and must not compete with it.

            Each entry states its OWN certainty, from its OWN slice — three
            different endpoints on two different poll tiers, which can and do
            fail independently. A single page-level freshness line cannot
            express that: it says the screen is current, not that this
            particular number is retained. */}
        <dl
          className="grid grid-cols-3 gap-x-6 sm:gap-x-10 gap-y-2 m-0 pt-3.5 max-w-3xl"
          style={{ borderTop: '1px solid var(--probex-border)' }}
        >
        <LedgerFigure
          label="Under review"
          value={edgeCount !== null ? String(edgeCount) : null}
          certainty={certaintyFromSlice(edgesSlice, 8_000)}
          absentReason="The edges endpoint has not answered"
        />
        {/* A session counter that reaches seven figures. Grouped, because
            1219561 and 1,219,561 are the same number only to a machine. */}
        <LedgerFigure
          label="Detected"
          value={edgesDetected !== null ? edgesDetected.toLocaleString() : null}
          certainty={certaintyFromSlice(stats, 2_000)}
          absentReason="No engine stats reading"
        />
        <LedgerFigure
          label="Threshold"
          value={minEdge !== null ? formatEdgePct(minEdge) : null}
          certainty={certaintyFromSlice(survival, 5_000)}
          absentReason="The survival brain has not reported"
        />
        </dl>
      </div>
    </section>
  )
}

/**
 * One ledger entry. The absent branch is why this exists as a wrapper: a figure
 * that has not arrived keeps the size it will occupy and states its own reason,
 * rather than rendering an em-dash that reads as a gap in the layout.
 */
function LedgerFigure({
  label, value, certainty, absentReason,
}: {
  label: string
  value: string | null
  certainty: FigureCertaintyProps
  absentReason: string
}) {
  if (value === null) {
    return <Figure label={label} size="sm" certainty="absent" absentReason={absentReason} />
  }
  return <Figure label={label} size="sm" {...certainty}>{value}</Figure>
}

// ─── The three engine states ──────────────────────────────────────────────────

function EdgeFound({ edge }: { edge: EdgeRow }) {
  const isYes = edge.direction.toLowerCase() === 'yes'
  const color = isYes ? 'var(--probex-yes)' : 'var(--probex-no)'
  const ink   = isYes ? 'var(--probex-on-yes)' : 'var(--probex-on-no)'

  // The engine's SUBJECT leads: the market question reads first, at reading
  // size, and the magnitude supports it. A gauge answering "how much" above the
  // thing it is about answers the second question first.
  return (
    <div className="flex flex-col gap-3 min-w-0">
      {edge.marketTitle && (
        <span
          className="t-metric leading-snug max-w-2xl"
          style={{
            letterSpacing: '-0.02em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {edge.marketTitle}
        </span>
      )}

      {/* ── One instrument cluster, not three floating groups ──────────────
          The gauge, the side chip and the confidence read were spaced apart at
          gap-4 with the chip stack loosely stacked, so the eye met three
          separate objects and had to reassemble "31.5% edge, YES, 62%
          confidence" into one statement. They are one reading of one
          opportunity: magnitude, direction, and how sure. Tightening the gap
          and putting direction and confidence on a shared baseline binds them
          into a single cluster the gauge anchors. */}
      <div className="flex items-center gap-3">
        {/* The ring is the edge's MAGNITUDE on a fixed 0–100% scale — a
            percentage drawn as the arc of a circle, nothing more. It is not
            threshold-relative (an earlier comment here claimed it compared the
            edge against the bar it had to clear; the value is edgePct / 100),
            and the threshold itself is stated in words beside it. Kept as the
            one place an edge's size is drawn rather than only printed. */}
        <RadialGauge
          value={Math.min(1, edge.edgePct / 100)}
          color={color}
          size={72}
          strokeWidth={6}
          ariaLabel={`Edge ${edge.edgePct.toFixed(1)} percent, on a 0 to 100 percent scale`}
        >
          <span className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>
            {edge.edgePct.toFixed(1)}%
          </span>
          <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
            edge
          </span>
        </RadialGauge>

        {/* Direction and its qualifiers on one baseline, so the row reads as a
            sentence — DIRECTION, then how sure — rather than as a chip with a
            column of numbers hanging beneath it. */}
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          {/* A filled side chip: YES and NO are the two market outcomes and get
              the same treatment they get on a market card. Ink comes from the
              per-theme on-yes / on-no tokens, so the pair is legible in all
              themes. */}
          <span
            className="text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-sm flex-shrink-0"
            style={{ background: color, color: ink }}
          >
            {edge.direction}
          </span>
          <span className="flex items-center gap-x-2.5 gap-y-0.5 flex-wrap text-2xs font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
            {edge.confidence !== null && <span>{formatPercent(edge.confidence)} confidence</span>}
            {edge.kellySize !== null && <span>{(edge.kellySize * 100).toFixed(0)}% Kelly</span>}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * A candidate exists, and the engine cannot or will not act on it.
 *
 * The operational verdict leads at the decision register — "Halted" when the
 * survival brain has stopped trading, "Not acting" when the candidate merely
 * fails the brain's current threshold or sizing — and the candidate follows
 * as context at the reading register, with its own figures intact. The
 * reader gets all three answers in order: can it act, what does it see, why
 * is it not acting on it. Nothing about the signal is softened or hidden.
 */
function EdgeBlocked({ edge, reasons, halted }: { edge: EdgeRow; reasons: BlockReason[]; halted: boolean }) {
  const isYes = edge.direction.toLowerCase() === 'yes'
  const sideColor = isYes ? 'var(--probex-yes)' : 'var(--probex-no)'
  const sideInk   = isYes ? 'var(--probex-on-yes)' : 'var(--probex-on-no)'
  const tone = halted ? 'var(--probex-negative)' : 'var(--probex-warning)'

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      <div className="flex items-center gap-2.5">
        <span
          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
          style={{
            border: `1px solid color-mix(in srgb, ${tone} 45%, transparent)`,
            background: `color-mix(in srgb, ${tone} 10%, var(--probex-surface))`,
            color: tone,
          }}
          aria-hidden="true"
        >
          {halted ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M7.9 3h8.2L21 7.9v8.2L16.1 21H7.9L3 16.1V7.9z" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" />
            </svg>
          )}
        </span>
        <span className="t-metric" style={{ letterSpacing: '-0.02em', color: tone }}>
          {halted ? 'Halted' : 'Not acting'}
        </span>
      </div>

      <p className="t-description">
        {reasons.map((r, i) => (
          <span key={r.kind}>
            {i > 0 && ' '}
            {reasonSentence(r)}
          </span>
        ))}
      </p>

      {/* The candidate, as context. Same figures the acting state shows —
          market, side, edge, confidence — one register down and without the
          gauge, because a gauge compares a measurement to a target it can
          clear, and this one cannot. */}
      <div
        className="flex flex-col gap-1.5 pt-3 min-w-0"
        style={{ borderTop: '1px solid var(--probex-border)' }}
      >
        <span className="t-label">Candidate the engine sees</span>
        {edge.marketTitle && (
          <span className="text-sm font-semibold leading-snug truncate" style={{ color: 'var(--probex-text-secondary)' }}>
            {edge.marketTitle}
          </span>
        )}
        <span className="flex items-center gap-2.5 flex-wrap">
          <span
            className="text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-sm flex-shrink-0"
            style={{ background: sideColor, color: sideInk }}
          >
            {edge.direction}
          </span>
          <span className="flex items-center gap-x-2.5 flex-wrap text-2xs font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
            <span>{formatEdgePct(edge.edgePct)} edge</span>
            {edge.confidence !== null && <span>{formatPercent(edge.confidence)} confidence</span>}
            {edge.kellySize !== null && <span>{(edge.kellySize * 100).toFixed(0)}% Kelly</span>}
          </span>
        </span>
      </div>
    </div>
  )
}

/** One reason, in the engine's own terms and numbers. */
function reasonSentence(r: BlockReason): string {
  switch (r.kind) {
    case 'halted':
      return `The survival brain is in ${survivalStateLabel(r.state)} state and has halted trading.`
    case 'threshold':
      return `The candidate's ${formatEdgePct(r.edgePct)} edge is below the ${formatEdgePct(r.minEdge)} the brain currently requires.`
    case 'sizing':
      return `The Kelly modifier is ${r.kellyModifier.toFixed(2)}×, so any position would size to zero.`
  }
}

/** The common state. Holding is a DECISION, so it is presented as one — with
 *  the threshold that produced it. When the survival brain has halted trading
 *  and there is no candidate either, the halt is the more important fact and
 *  leads; "Holding" would describe a choice the engine is not free to make. */
function EdgeHolding({ minEdge, halted, state }: { minEdge: number | null; halted: boolean; state: string | null }) {
  const tone = halted ? 'var(--probex-negative)' : undefined
  return (
    <div className="flex flex-col gap-2 max-w-xl">
      <div className="flex items-center gap-2.5">
        <span
          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
          style={{
            border: `1px solid ${halted ? `color-mix(in srgb, ${tone} 45%, transparent)` : 'var(--probex-border-default)'}`,
            background: halted ? `color-mix(in srgb, ${tone} 10%, var(--probex-surface))` : 'var(--probex-surface)',
            color: tone ?? 'var(--probex-text-muted)',
          }}
          aria-hidden="true"
        >
          {halted ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M7.9 3h8.2L21 7.9v8.2L16.1 21H7.9L3 16.1V7.9z" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          )}
        </span>
        {/* The decision verb, at the arc's authority register. This is the
            engine speaking, and it is the sentence the whole page builds to. */}
        <span className="t-metric" style={{ letterSpacing: '-0.02em', ...(tone ? { color: tone } : {}) }}>
          {halted ? 'Halted' : 'Holding'}
        </span>
      </div>
      <p className="t-description">
        {halted
          ? `The survival brain is in ${survivalStateLabel(state ?? 'DEAD')} state and has halted trading. No candidate is under consideration.`
          : minEdge !== null
            ? `No candidate has cleared the ${formatEdgePct(minEdge)} edge threshold the survival brain currently requires. The engine prefers no trade to a weak one.`
            : 'No candidate has cleared the edge threshold. The engine prefers no trade to a weak one.'}
      </p>
    </div>
  )
}

/** The engine has not told us what it sees. Distinct from Holding, which is a
 *  position the engine took; this is the absence of a report. */
function EdgeUnknown({ errored }: { errored: boolean }) {
  return (
    <div className="flex flex-col gap-2 max-w-xl">
      <div className="flex items-center gap-2.5">
        <span
          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
          style={{
            border: '1px dashed var(--probex-border-default)',
            color: 'var(--probex-text-disabled)',
          }}
          aria-hidden="true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 17h.01" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
          </svg>
        </span>
        {/* Same register as Holding — the ABSENCE of a decision is as
            important as a decision, and rendering it quieter would let a
            failed endpoint read as a calm engine. */}
        <span className="t-metric" style={{ color: 'var(--probex-text-secondary)', letterSpacing: '-0.02em' }}>
          No signal report
        </span>
      </div>
      <p className="t-description">
        {errored ? 'The engine did not answer.' : 'Waiting for the engine.'}{' '}
        Whether it sees an edge right now is unknown — this states nothing rather
        than assuming it is idle.
      </p>
    </div>
  )
}
