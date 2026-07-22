'use client'

// SystemMetricsPanel — new 2026-07-22, surfacing /api/system/metrics
// (process uptime, memory, CPU, event-log size). No prior UI slot existed
// for this data — HealthPanel covers per-component health, RuntimePanel
// covers lifecycle/mode, but neither exposed raw process resource usage.

import { useApplicationStore } from '@/store/applicationStore'
import { Card }       from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'

export function SystemMetricsPanel() {
  const slice = useApplicationStore((s) => s.engine.systemMetrics)
  const m = slice.data

  if (slice.status === 'error') {
    return <ErrorState title="System metrics unavailable" description={slice.error?.message ?? 'The /api/system/metrics endpoint did not respond.'} fullPage={false} />
  }

  if (!m) return null

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>Process Metrics</h3>
        <ProvenanceBadge provenance="live" detail="/api/system/metrics" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Uptime" value={m.uptime.formatted} />
        <Stat label="Memory (RSS)" value={`${m.memoryMb.rssMb.toFixed(1)} MB`} />
        <Stat label="Memory (VMS)" value={`${m.memoryMb.vmsMb.toFixed(1)} MB`} />
        <Stat label="CPU" value={`${m.cpuPercent.toFixed(1)}%`} />
      </div>
      <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
        Event log holding {m.eventLogSize} entries.
      </p>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <span className="text-base font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{value}</span>
    </div>
  )
}
