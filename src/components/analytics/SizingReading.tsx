'use client'

// SizingReading — how the engine is allocating capital right now, and what it
// currently sees. Context for the results above, not a result itself.
//
// ─── What replaced what ──────────────────────────────────────────────────────
// KellyUtilization drew a 120px radial gauge reading "150% — OVER LIMIT" in
// the warning colour whenever the survival modifier was above 1.0×. But a
// modifier above 1.0× is the survival brain scaling UP in a THRIVING state —
// its designed behaviour, not a breach — and a gauge is a comparison to a
// target that can be exceeded, which this is not. The reading is now three
// figures and the multiplication that relates them, with the survival state
// named beside the modifier so the number has its reason.
//
// EdgeQualityAnalytics was a bordered card that rendered an empty state most
// of the day (no active edges between windows). The current edge set is
// context at best — it is not history — so it is a single ruled row here,
// and a single line when there is nothing in it.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEdgeRows } from '@/lib/mappers/edges'
import { survivalStateLabel } from '@/lib/display/engine'
import { formatEdgePct } from '@/lib/display/engine'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'

export function SizingReading() {
  const configSlice   = useApplicationStore((s) => s.engine.config)
  const survivalSlice = useApplicationStore((s) => s.engine.survival)
  const edgesSlice    = useApplicationStore((s) => s.engine.edges)

  const cfg = configSlice.data
  const sv  = survivalSlice.data

  const edgeSet = useMemo(() => {
    if (!edgesSlice.data) return null
    const parsed = parseEdgeRows(edgesSlice.data)
    if (parsed.kind !== 'rows' || parsed.rows.length === 0) return null
    const rows = parsed.rows
    const yes = rows.filter((r) => r.direction === 'yes').length
    const withConf = rows.filter((r) => r.confidence !== null)
    const high = withConf.filter((r) => (r.confidence ?? 0) >= 0.7).length
    const avgEdge = rows.reduce((s, r) => s + r.edgePct, 0) / rows.length
    return { total: rows.length, yes, no: rows.length - yes, high, withConf: withConf.length, avgEdge }
  }, [edgesSlice.data])

  const effective = cfg && sv ? cfg.kellyFraction * sv.kellyModifier : null
  const modifierTone =
    sv === null || sv === undefined ? undefined
    : sv.kellyModifier === 0 ? 'var(--probex-negative)'
    : sv.kellyModifier < 1 ? 'var(--probex-warning)'
    : undefined

  return (
    <section aria-labelledby="an-sizing" className="flex flex-col gap-5 py-6" style={{ borderBottom: '1px solid var(--probex-border)' }}>
      <div className="flex items-center gap-1.5">
        <h2 id="an-sizing" className="t-section-title">Sizing and the current edge set</h2>
        <Popover
          label="About sizing"
          trigger={(p) => <InfoButton what="sizing" {...p} />}
        >
          <PopoverTitle>Effective Kelly = base × survival modifier</PopoverTitle>
          <PopoverText>
            The configured Kelly fraction is the engine&rsquo;s base position size. The
            survival brain scales it by a modifier that falls below 1.00× as capital
            declines and can rise above it while capital is growing — sizing down after
            losses is the mechanism, not a fault.
          </PopoverText>
          <PopoverText>
            The edge threshold is the minimum edge the brain will act on right now; it
            moves with the same state. The current edge set is what the detector sees this
            cycle — context for the figures above, not part of the record.
          </PopoverText>
        </Popover>
      </div>

      {/* Three figures and the relation between them, one register down from
          the outcome block. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
        {cfg && sv && effective !== null ? (
          <Figure
            label="Effective Kelly"
            size="md"
            certainty="derived"
            title="kelly_fraction (/api/config) × kelly_modifier (/api/survival)"
            footnote={`${cfg.kellyFraction.toFixed(2)}× base × ${sv.kellyModifier.toFixed(2)}×`}
          >
            {`${effective.toFixed(2)}×`}
          </Figure>
        ) : (
          <Figure label="Effective Kelly" size="md" certainty="absent" absentReason="Waiting for config and the survival brain" />
        )}

        {sv ? (
          <Figure
            label="Survival modifier"
            size="md"
            tone={modifierTone}
            title="/api/survival"
            {...certaintyFromSlice(survivalSlice, 5_000)}
            footnote={`${survivalStateLabel(sv.state)} state`}
          >
            {`${sv.kellyModifier.toFixed(2)}×`}
          </Figure>
        ) : (
          <Figure label="Survival modifier" size="md" certainty="absent" absentReason="The survival brain has not reported" />
        )}

        {sv ? (
          <Figure
            label="Edge threshold"
            size="md"
            title="/api/survival"
            {...certaintyFromSlice(survivalSlice, 5_000)}
            footnote="minimum edge to act on now"
          >
            {formatEdgePct(sv.minEdgeThreshold)}
          </Figure>
        ) : (
          <Figure label="Edge threshold" size="md" certainty="absent" absentReason="The survival brain has not reported" />
        )}

        {cfg ? (
          <Figure
            label="Base Kelly"
            size="md"
            title="/api/config"
            {...certaintyFromSlice(configSlice, 30_000)}
            footnote="configured fraction"
          >
            {`${cfg.kellyFraction.toFixed(2)}×`}
          </Figure>
        ) : (
          <Figure label="Base Kelly" size="md" certainty="absent" absentReason="Waiting for /api/config" />
        )}
      </div>

      {/* The current edge set — a ruled row when there is one, a sentence
          when there is not. Never an empty card. */}
      <div className="pt-4" style={{ borderTop: '1px solid var(--probex-border)' }}>
        {edgeSet === null ? (
          <p className="t-description">
            {edgesSlice.status === 'error'
              ? 'The edges endpoint did not answer, so the current edge set is unknown.'
              : edgesSlice.data === null
                ? 'Waiting for the edge detector.'
                : 'No active edges this cycle — the detector reports nothing above threshold right now.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4">
            <Figure label="Active edges" size="sm" {...certaintyFromSlice(edgesSlice, 8_000)} title="/api/edges">
              {String(edgeSet.total)}
            </Figure>
            <Figure label="Avg magnitude" size="sm" certainty="derived" footnote="across the set">
              {formatEdgePct(edgeSet.avgEdge)}
            </Figure>
            <Figure label="YES / NO" size="sm" certainty="derived">
              {`${edgeSet.yes} / ${edgeSet.no}`}
            </Figure>
            <Figure label="High confidence" size="sm" certainty="derived" footnote={edgeSet.withConf > 0 ? `of ${edgeSet.withConf} with a confidence reading · ≥ 70%` : 'no confidence readings'}>
              {String(edgeSet.high)}
            </Figure>
          </div>
        )}
      </div>
    </section>
  )
}
