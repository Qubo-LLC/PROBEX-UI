'use client'

// EdgeQualityAnalytics — NEW to V3, not a V1 restore. V1 had no equivalent
// (its analytics were ETF flows / institutional / on-chain — see the Phase 5
// classification: "No Longer Appropriate For PROBEX"). This is a genuinely
// live analytical lens the Consensus/Strategy/Live pages don't provide: an
// aggregate view across ALL currently-active edges — direction split,
// confidence distribution, and which signal sources are producing them.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEdgeRows } from '@/lib/mappers/edges'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

export function EdgeQualityAnalytics() {
  const edgesSlice = useApplicationStore((s) => s.engine.edges)

  const rows = useMemo(() => {
    if (!edgesSlice.data) return null
    const parsed = parseEdgeRows(edgesSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [edgesSlice.data])

  const stats = useMemo(() => {
    if (!rows || rows.length === 0) return null
    const yes = rows.filter((r) => r.direction === 'yes').length
    const no  = rows.filter((r) => r.direction === 'no').length

    const withConfidence = rows.filter((r) => r.confidence !== null)
    const high   = withConfidence.filter((r) => (r.confidence ?? 0) >= 0.7).length
    const medium = withConfidence.filter((r) => (r.confidence ?? 0) >= 0.5 && (r.confidence ?? 0) < 0.7).length
    const low    = withConfidence.filter((r) => (r.confidence ?? 0) < 0.5).length

    const bySignal = new Map<string, { count: number; totalEdge: number }>()
    for (const r of rows) {
      const key = r.signal ?? 'unspecified'
      const cur = bySignal.get(key) ?? { count: 0, totalEdge: 0 }
      cur.count += 1
      cur.totalEdge += r.edgePct
      bySignal.set(key, cur)
    }
    const signals = [...bySignal.entries()]
      .map(([signal, s]) => ({ signal, count: s.count, avgEdge: s.totalEdge / s.count }))
      .sort((a, b) => b.count - a.count)

    const avgEdge = rows.reduce((s, r) => s + r.edgePct, 0) / rows.length

    return { total: rows.length, yes, no, high, medium, low, signals, avgEdge }
  }, [rows])

  if (edgesSlice.status === 'error') {
    return <ErrorState title="Edge quality unavailable" description={edgesSlice.error?.message ?? 'The /api/edges endpoint did not respond.'} fullPage={false} />
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Edge Quality</h2>
        <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>Aggregate view across every edge the engine currently sees</p>
      </div>

      <div className="p-4">
        {!stats ? (
          <EmptyState size="sm" title="No active edges to analyze" description="This section populates the moment the engine detects at least one qualifying edge." />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Active Edges" value={String(stats.total)} color="var(--probex-primary)" />
              <Metric label="Avg. Magnitude" value={`${stats.avgEdge.toFixed(1)}%`} color="var(--probex-text-primary)" />
              <Metric label="YES / NO" value={`${stats.yes} / ${stats.no}`} color="var(--probex-text-primary)" />
              <Metric label="High Confidence" value={String(stats.high)} color="var(--probex-positive)" />
            </div>

            <div>
              <h3 className="text-2xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--probex-text-muted)' }}>Confidence Distribution</h3>
              <div className="flex h-2 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
                <div className="h-full" style={{ width: `${(stats.high / stats.total) * 100}%`, background: 'var(--probex-positive)' }} title="High" />
                <div className="h-full" style={{ width: `${(stats.medium / stats.total) * 100}%`, background: 'var(--probex-warning)' }} title="Medium" />
                <div className="h-full" style={{ width: `${(stats.low / stats.total) * 100}%`, background: 'var(--probex-text-muted)' }} title="Low" />
              </div>
              <div className="flex items-center justify-between text-2xs mt-1.5">
                <span style={{ color: 'var(--probex-positive)' }}>{stats.high} high</span>
                <span style={{ color: 'var(--probex-warning)' }}>{stats.medium} medium</span>
                <span style={{ color: 'var(--probex-text-muted)' }}>{stats.low} low</span>
              </div>
            </div>

            <div>
              <h3 className="text-2xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--probex-text-muted)' }}>By Signal Source</h3>
              <div className="flex flex-col gap-2">
                {stats.signals.map((s) => (
                  <div key={s.signal} className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--probex-text-secondary)' }}>{s.signal}</span>
                    <span style={{ color: 'var(--probex-text-primary)' }}>{s.count} edge{s.count === 1 ? '' : 's'} · {s.avgEdge.toFixed(1)}% avg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg" style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border)' }}>
      <span className="text-2xs uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <span className="text-xl font-black tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}
