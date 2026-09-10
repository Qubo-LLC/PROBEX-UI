'use client'

// SystemConsole — the operational instrument for the engine's infrastructure.
//
// ─── Form: instrument ────────────────────────────────────────────────────────
// This page has no narrative. It answers "what is the current reading", and it
// answers it in one order: the VERDICT first, then the evidence that produced
// it, then what has gone wrong, then the raw diagnostics.
//
//   1. POSTURE      what this adds up to, and which layers are actually known
//   2. RUNTIME      what is running, since when, on how much memory
//   3. MARKET DATA  is data arriving                            ← new tier
//   4. HEALTH       what the engine's own probes report
//   5. INCIDENTS    what it has flagged recently                ← new tier
//   6. DIAGNOSTICS  this browser's own request record        (behind disclosure)
//   7. CONFIG       what parameters it is running with
//
// Posture comes first deliberately: everything below it reports what the engine
// SAID, and only the posture reports whether anything actually answered. Read in
// the other order, a generated "4/4 probes healthy" is indistinguishable from a
// real one.
//
// ─── What changed, and why the order alone was not the problem ───────────────
// That reading order already existed. The defect was that VISUAL WEIGHT
// contradicted it: the last section rendered ~40 endpoint cards, each with a
// 64px status-coloured RadialGauge, repainting every second. It was the largest
// and most colourful thing on the page, it measured the BROWSER rather than the
// engine, and it out-shouted every section above it. See EndpointDiagnostics for
// the full reasoning and what replaced it.
//
// The second defect was a missing subject. An operator asking "is the machine
// healthy" asks about four things and the page grouped three; whether market
// data is actually ARRIVING had no place, despite every figure being polled
// already. MarketDataSection is that group. Nothing new is requested for it.
//
// ─── Containers on this page ─────────────────────────────────────────────────
// Two, and both mark a real boundary:
//
//   the posture verdict   conclusion, which must be separable from evidence
//   the disclosure        a diagnostic layer the reader chose to open
//
// Everything else is a ruled section. Five bordered panels became five headings
// and four rules, and no information moved or was lost.
//
// ─── Provenance on this page is deliberately loud ────────────────────────────
// System is the INSTRUMENT surface. Unlike Overview, Analytics, Portfolio and
// Strategy — which wrap themselves in ProvenanceScope detail="tooltip" because
// an intelligence reader is asking what is happening, not which endpoint said
// so — this page prints endpoint paths in the open, because an operator here is
// asking exactly that. The asymmetry is intentional and stays.

import { useState } from 'react'
import { PageHeader }          from '@/components/ui/PageHeader'
import { SystemPosture }       from './SystemPosture'
import { HealthPanel }         from './HealthPanel'
import { RuntimePanel }        from './RuntimePanel'
import { ConfigPanel }         from './ConfigPanel'
import { EndpointDiagnostics } from './EndpointDiagnostics'
import { SystemMetricsPanel }  from './SystemMetricsPanel'
import { MarketDataSection }   from './MarketDataSection'
import { IncidentsSection }    from './IncidentsSection'
import { FreshnessIndicator }  from '@/components/shared/FreshnessIndicator'
import { useApplicationStore } from '@/store/applicationStore'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

/** The rule between two sections. A hairline and vertical space — the entire
 *  replacement for a bordered panel, and the reason five of them could go. */
function Rule() {
  return <hr className="my-7 border-0" style={{ borderTop: '1px solid var(--probex-border)' }} />
}

export function SystemConsole({ embedded = false }: EmbeddableProps = {}) {
  const health = useApplicationStore((s) => s.engine.health)
  // Collapsed by default. The diagnostics are genuinely useful and genuinely
  // secondary: an operator opens them when a section above has already told
  // them something is wrong. Keeping them closed also means the 2s snapshot
  // interval inside EndpointDiagnostics never starts on a normal visit.
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  return (
    <div className={pageShell(embedded, 'gap-0')}>
      {!embedded && (
        <PageHeader
          title="System"
          subtitle="Engine health, runtime components, market data, incidents and configuration"
          actions={
            // The page's one freshness claim, bound to /health — the slowest
            // tier and the first thing to look stale if the engine stops.
            <FreshnessIndicator state={health} expectedIntervalMs={30_000} showWhenFresh />
          }
        />
      )}

      <div className="mt-5">
        <SystemPosture />
      </div>

      <Rule />
      <RuntimePanel />
      {/* Process metrics describe the same subject as the components above —
          is the process whole — so they sit under that heading rather than in
          their own panel beside it. */}
      <div className="mt-5">
        <SystemMetricsPanel />
      </div>

      <Rule />
      <MarketDataSection />

      <Rule />
      <HealthPanel />

      <Rule />
      <IncidentsSection />

      <Rule />
      <section aria-label="Configuration" className="flex flex-col gap-4">
        <ConfigPanel />
      </section>

      <Rule />
      {/* The diagnostic layer. A disclosure is a justified container: the
          reader opened it, and what is inside is a different KIND of thing —
          client-side telemetry rather than engine truth. */}
      <div>
        {/* The disclosure's label is a real heading wrapping the control, so
            this section appears in heading navigation alongside the five above
            it. Previously it was a styled span inside a button — visually a
            section title, structurally invisible. */}
        <h2 className="m-0">
          <button
            type="button"
            onClick={() => setShowDiagnostics((v) => !v)}
            aria-expanded={showDiagnostics}
            className="focus-ring flex items-center gap-2 cursor-pointer text-left"
          >
            <span aria-hidden="true" style={{ color: 'var(--probex-text-muted)' }}>
              {showDiagnostics ? '▾' : '▸'}
            </span>
            <span className="t-section-title">Endpoint diagnostics</span>
            <span className="t-metadata">this browser session</span>
          </button>
        </h2>

        {showDiagnostics && (
          <div className="mt-4">
            <EndpointDiagnostics />
          </div>
        )}
      </div>
    </div>
  )
}
