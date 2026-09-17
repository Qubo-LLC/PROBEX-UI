'use client'

// EngineReports — the engine's own one-line summaries of its state, from
// /api/research/reports, as the D-level footnote of the Mechanism tab.
//
// ─── What this endpoint is (captured 2026-09-16 08:58Z) ──────────────────────
// Not a research library. `generated_at` equals the envelope's serve time to
// the microsecond: each request regenerates the reports from the engine's
// current state, and nothing is stored, versioned or accumulated. Every
// field in every report is a restatement of another endpoint —
//
//   risk_assessment    survival_state · capital_pct · kelly_modifier ·
//                      min_edge_threshold · days_of_runway   (/api/survival)
//   market_conditions  active_markets · current price · feed latency
//                      (/api/markets, /api/stats)              [documented;
//   edge_analysis      total/avg edge · avg confidence · yes/no counts
//                      (/api/edges)                            absent at 0 markets]
//
// — with a templated sentence ("State: THRIVING, Capital: 2165.5%") as the
// summary. There are no findings, no market or signal references beyond
// those aggregates, no methodology, no confidence and no history.
//
// So the Research TAB, which presented these as "Research Reports", is
// retired (2026-09-16): a destination whose whole content was Survival's
// figures with a different heading. What the endpoint does carry — the
// engine's own framing of its state, in its own words — is kept here, where
// the mechanism it summarises lives, and labelled as exactly that.

import { useApplicationStore } from '@/store/applicationStore'
import { clockOrDate } from '@/lib/display/time'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'
import type { ResearchReportItem } from '@/types/engine'

/** Which endpoint each documented report type restates. Shown as lineage;
 *  an unknown type is shown without one rather than guessed. */
const RESTATES: Record<string, string> = {
  risk_assessment:   '/api/survival',
  market_conditions: '/api/markets · /api/stats',
  edge_analysis:     '/api/edges',
}

export function EngineReports() {
  const slice = useApplicationStore((s) => s.engine.researchReports)
  const reports = slice.data?.reports ?? []

  return (
    <section aria-labelledby="st-reports" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--probex-border)' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-center gap-1.5 flex-wrap">
          <h2 id="st-reports" className="t-section-title">The engine’s own summaries</h2>
          <span className="t-description">one-line self-reports, regenerated on every request</span>
          <Popover label="About the engine's summaries" trigger={(p) => <InfoButton what="the engine's summaries" {...p} />}>
            <PopoverTitle>Restatements, not research</PopoverTitle>
            <PopoverText>
              /api/research/reports regenerates these from the engine’s current state each time
              it is asked — the generation time equals the request time, and nothing is stored.
              Each report’s fields are the same values shown on the tab it names; the summary
              sentence is the engine’s own wording for them.
            </PopoverText>
            <PopoverText>
              Report types the contract documents but that appear only when there is something
              to summarise: market conditions (needs scanned markets) and edge analysis (needs
              detected edges).
            </PopoverText>
          </Popover>
        </span>
        <span className="t-metadata">/api/research/reports{slice.data ? ` · ${slice.data.count}` : ''}</span>
      </div>

      {slice.status === 'error' && !slice.data ? (
        <p className="text-xs" style={{ color: 'var(--probex-warning)' }}>The reports endpoint did not answer.</p>
      ) : !slice.data ? (
        <p className="t-description">Waiting for /api/research/reports.</p>
      ) : reports.length === 0 ? (
        <p className="t-description">The engine generated no summaries for its current state.</p>
      ) : (
        <ul className="flex flex-col list-none m-0 p-0" style={{ borderBottom: '1px solid var(--probex-border)' }}>
          {reports.map((r, i) => <ReportRow key={`${r.type}-${i}`} report={r} />)}
        </ul>
      )}
    </section>
  )
}

function ReportRow({ report }: { report: ResearchReportItem }) {
  const restates = RESTATES[report.type]
  const details = Object.entries(report.details)
  return (
    <li className="flex flex-col gap-1.5 py-2.5 pl-2.5 pr-1" style={{ borderTop: '1px solid var(--probex-border)' }}>
      <div className="flex items-baseline gap-2 flex-wrap text-xs">
        <span className="font-semibold" style={{ color: 'var(--probex-text-primary)' }}>{report.title}</span>
        <span className="t-helper">“{report.summary}”</span>
        <span className="t-metadata ml-auto whitespace-nowrap">
          generated {clockOrDate(report.generatedAt, Date.now(), { seconds: true })}{restates ? ` · restates ${restates}` : ` · ${report.type}`}
        </span>
      </div>
      {details.length > 0 && (
        <dl className="flex items-baseline gap-x-4 gap-y-1 flex-wrap m-0">
          {details.map(([key, value]) => (
            <div key={key} className="flex items-baseline gap-1.5">
              <dt className="t-label">{key.replace(/_/g, ' ')}</dt>
              <dd className="m-0 font-mono text-xs tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                {value === null ? 'not reported' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}
