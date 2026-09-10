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
import { formatEdgePct } from '@/lib/display/engine'
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

  return (
    <section
      aria-labelledby="arc-perception"
      className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-start py-5"
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
      <div
        className="flex flex-col gap-2.5 min-w-0 pl-4"
        style={{ borderLeft: '2px solid var(--probex-primary)' }}
      >
        <h2 id="arc-perception" className="t-label" style={{ color: 'var(--probex-primary)' }}>
          Engine focus
        </h2>
        {topEdge ? (
          <EdgeFound edge={topEdge} />
        ) : edgesSlice.data !== null ? (
          <EdgeHolding minEdge={minEdge} />
        ) : (
          <EdgeUnknown errored={edgesSlice.status === 'error'} />
        )}
      </div>

      {/* The signal ledger — quantifies "no edge" rather than merely asserting
          it, which is the difference between an engine that is idle and one
          that is actively rejecting candidates. Sits at the `sm` register: it
          supports the reading on the left, it does not compete with it. */}
      {/* Each entry states its OWN certainty, from its OWN slice — three
          different endpoints on two different poll tiers, which can and do
          fail independently. A single page-level freshness line cannot express
          that: it says the screen is current, not that this particular number
          is retained. */}
      <dl className="grid grid-cols-3 gap-x-8 gap-y-2 m-0 lg:pl-10 lg:border-l" style={{ borderColor: 'var(--probex-border)' }}>
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
    <div className="flex flex-col gap-3.5 min-w-0">
      {edge.marketTitle && (
        <span
          className="t-metric leading-snug"
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

      <div className="flex items-center gap-4">
        {/* One of the three places a RadialGauge still earns its place: this
            ring compares a measured edge against the threshold it had to clear.
            A gauge is a comparison to a target — where there is no target, it
            is decoration, which is why forty of them left the System page. */}
        <RadialGauge
          value={Math.min(1, edge.edgePct / 100)}
          color={color}
          size={72}
          strokeWidth={6}
          ariaLabel={`Edge strength ${edge.edgePct.toFixed(1)} percent`}
        >
          <span className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>
            {edge.edgePct.toFixed(1)}%
          </span>
          <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
            edge
          </span>
        </RadialGauge>

        <div className="flex flex-col items-start gap-2 min-w-0">
          {/* A filled side chip: YES and NO are the two market outcomes and get
              the same treatment they get on a market card. Ink comes from the
              per-theme on-yes / on-no tokens, so the pair is legible in all
              themes. */}
          <span
            className="text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-sm"
            style={{ background: color, color: ink }}
          >
            {edge.direction}
          </span>
          <div className="flex flex-col gap-0.5 text-2xs font-mono tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
            {edge.confidence !== null && <span>{formatPercent(edge.confidence)} confidence</span>}
            {edge.kellySize !== null && <span>{(edge.kellySize * 100).toFixed(0)}% Kelly</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

/** The common state. Holding is a DECISION, so it is presented as one — with
 *  the threshold that produced it. */
function EdgeHolding({ minEdge }: { minEdge: number | null }) {
  return (
    <div className="flex flex-col gap-2 max-w-xl">
      <div className="flex items-center gap-2.5">
        <span
          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
          style={{
            border: '1px solid var(--probex-border-default)',
            background: 'var(--probex-surface)',
            color: 'var(--probex-text-muted)',
          }}
          aria-hidden="true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        </span>
        {/* The decision verb, at the arc's authority register. This is the
            engine speaking, and it is the sentence the whole page builds to. */}
        <span className="t-metric" style={{ letterSpacing: '-0.02em' }}>
          Holding
        </span>
      </div>
      <p className="t-description">
        {minEdge !== null
          ? `No candidate has cleared the ${formatEdgePct(minEdge)} edge threshold. The engine prefers no trade to a weak one.`
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
