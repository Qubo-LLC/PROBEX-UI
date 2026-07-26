'use client'

// SystemMetricsPanel — process uptime, memory, CPU, and event-log size from
// /api/system/metrics.

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
    <Card className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="t-card-title">Process Metrics</h3>
        <ProvenanceBadge provenance="live" detail="/api/system/metrics" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <Stat label="Uptime" value={m.uptime.formatted} />
        <Stat label="Memory (RSS)" value={m.memoryMb.rssMb.toFixed(1)} unit="MB" />
        <Stat label="Memory (VMS)" value={m.memoryMb.vmsMb.toFixed(1)} unit="MB" />
        <Stat label="CPU" value={m.cpuPercent.toFixed(1)} unit="%" />
      </div>
      <p className="t-helper">
        Event log holding {m.eventLogSize.toLocaleString()} entries.
      </p>
    </Card>
  )
}

/** Label above, figure below, unit alongside at reduced weight — the Bloomberg
 *  readout order. The unit is split out of the value string so "MB" never
 *  competes with the number it qualifies. */
function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="t-label">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="t-metric">{value}</span>
        {unit && <span className="t-unit">{unit}</span>}
      </span>
    </div>
  )
}
