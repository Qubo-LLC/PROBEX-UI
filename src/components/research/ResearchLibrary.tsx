'use client'

// ResearchLibrary — auto-generated reports from /api/research/reports
// (market_conditions / edge_analysis / risk_assessment), regenerated each poll.

import { useApplicationStore } from '@/store/applicationStore'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import type { ResearchReportItem } from '@/types/engine'

const TYPE_META: Record<string, { icon: string; color: string }> = {
  market_conditions: { icon: '◈', color: 'var(--probex-primary)' },
  edge_analysis:     { icon: '⚡', color: 'var(--probex-yes)' },
  risk_assessment:   { icon: '⚠', color: 'var(--probex-warning)' },
}

export function ResearchLibrary() {
  const slice = useApplicationStore((s) => s.engine.researchReports)
  const reports = slice.status === 'success' && slice.data ? slice.data.reports : []

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Research Reports</h2>
          <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>Auto-generated from the engine's current market, edge, and risk state</p>
        </div>
        <ProvenanceBadge provenance="live" detail="/api/research/reports" />
      </div>

      {slice.status === 'error' && (
        <div className="p-4">
          <ErrorState
            title="Research reports unavailable"
            description={slice.error?.message ?? 'The /api/research/reports endpoint did not respond in time.'}
            fullPage={false}
          />
        </div>
      )}

      {slice.status !== 'error' && reports.length === 0 ? (
        <div className="p-4">
          <EmptyState size="sm" title="No reports yet" description="Reports regenerate each cycle from the engine's current state." />
        </div>
      ) : slice.status !== 'error' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {reports.map((r, i) => <ReportCard key={`${r.type}-${i}`} report={r} />)}
        </div>
      ) : null}
    </div>
  )
}

function ReportCard({ report }: { report: ResearchReportItem }) {
  const meta = TYPE_META[report.type] ?? { icon: '·', color: 'var(--probex-text-muted)' }
  const details = Object.entries(report.details).slice(0, 4)

  return (
    <div className="flex flex-col gap-2.5 p-4 rounded-xl" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}>
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }} aria-hidden="true">
          {meta.icon}
        </span>
        <h3 className="text-xs font-semibold" style={{ color: 'var(--probex-text-primary)' }}>{report.title}</h3>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--probex-text-secondary)' }}>{report.summary}</p>
      {details.length > 0 && (
        <div className="flex flex-col gap-1 pt-1" style={{ borderTop: '1px solid var(--probex-border)' }}>
          {details.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-2xs">
              <span style={{ color: 'var(--probex-text-disabled)' }}>{key.replace(/_/g, ' ')}</span>
              <span className="tabular-nums font-medium" style={{ color: 'var(--probex-text-secondary)' }}>{String(value)}</span>
            </div>
          ))}
        </div>
      )}
      <span className="text-2xs mt-auto pt-1" style={{ color: 'var(--probex-text-disabled)' }}>
        {new Date(report.generatedAt).toLocaleTimeString()}
      </span>
    </div>
  )
}
