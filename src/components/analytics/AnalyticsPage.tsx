'use client'

// AnalyticsPage — the Investigation lens: is the engine's edge real, where
// does it come from, and what is the engine doing with it?
//
// ─── The composition ─────────────────────────────────────────────────────────
// Four movements, ruled rather than boxed, in the order an investigator asks:
//
//   A  OUTCOME     did the edge pay — return, win rate, expectancy, drawdown
//   B  EVIDENCE    the equity curve and its drawdown over the retained window
//   B  ORIGINS     where the results come from: by asset, window length, edge
//                  size (derived from the ledger) and the survival brain's own
//                  hour × window × bucket record, with what it has filtered
//   D  CONTEXT     how capital is being sized right now, and what the detector
//                  currently sees
//   D  SELF-REPORT what the analytics engine says about its signals, to the
//                  extent it can be believed
//
// ─── What this replaced, and why ─────────────────────────────────────────────
// The previous page opened on two charts and then stacked five bordered cards:
// an "Edge Quality" card that was an empty state most of the day, a Kelly
// gauge reading "150% OVER LIMIT" for the survival brain's normal scale-up, an
// "Analytics Engine" card with six equally-weighted metrics and three tables
// that printed wire keys verbatim ("correct predictions 0 · accuracy 0"), a
// pattern table, and a "Signal Accuracy — awaiting" module that was an empty
// chart. Nothing on it ranked anything. The reader met a sizing parameter
// before a result and a fabricated-looking 0% accuracy before the fact that
// outcomes had not been joined.
//
// Nothing here is new data. Every figure was already in the store; what
// changed is which ones lead, which are marked derived, which are withheld
// with a reason, and that explanations moved behind the ⓘ.
//
// ─── Truthfulness rules kept ─────────────────────────────────────────────────
// Client-side groupings are marked derived. The analytics engine's outcome
// columns are withheld while they contradict the ledger (see SignalReport).
// No consensus-accuracy figure is shown because no endpoint produces one —
// the old placeholder chart said so at chart size; the signal report says so
// in a sentence.

import { OutcomeSummary } from './OutcomeSummary'
import { PerformanceAnalytics } from './PerformanceAnalytics'
import { EdgeOrigins } from './EdgeOrigins'
import { SizingReading } from './SizingReading'
import { SignalReport } from './SignalReport'
import { ProvenanceScope } from '@/components/shared/ProvenanceScope'
import { PageHeader } from '@/components/ui/PageHeader'

export function AnalyticsPage() {
  return (
    // Analytics is an evidence surface: the reader is asking what the history
    // shows, not which endpoint served it. Endpoint paths live in tooltips and
    // popovers here; System is the surface that prints them in the open.
    <ProvenanceScope detail="tooltip">
    <div className="page-container flex flex-col pb-8 animate-fade-in-up">
      <PageHeader
        title="Analytics"
        subtitle="Whether the engine’s edge is real, where it comes from, and how capital is being sized against it"
      />

      <div className="mt-5">
        <OutcomeSummary />
      </div>

      {/* B · Evidence — the two charts, unchanged components. They sit under
          the conclusion they support rather than opening the page. */}
      <section aria-labelledby="an-evidence" className="flex flex-col gap-3 py-6" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <h2 id="an-evidence" className="t-section-title">Equity over the retained window</h2>
        <PerformanceAnalytics />
      </section>

      <EdgeOrigins />
      <SizingReading />
      <SignalReport />
    </div>
    </ProvenanceScope>
  )
}
