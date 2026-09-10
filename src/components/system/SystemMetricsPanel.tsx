'use client'

// SystemMetricsPanel — process uptime, memory, CPU and event-log size from
// /api/system/metrics.
//
// Un-carded and re-registered. These four figures describe the same subject as
// the runtime section they now sit inside — is the process whole — so they are
// a row of figures beneath that heading rather than their own bordered panel
// beside it. The ProvenanceBadge is gone with the card: System states endpoint
// paths in the open (see SystemConsole), and this section's heading names its
// source.

import { useApplicationStore } from '@/store/applicationStore'
import { ErrorState } from '@/components/ui/ErrorState'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'

export function SystemMetricsPanel() {
  const slice = useApplicationStore((s) => s.engine.systemMetrics)
  const m = slice.data

  if (slice.status === 'error') {
    return <ErrorState title="System metrics unavailable" description={slice.error?.message ?? 'The /api/system/metrics endpoint did not respond.'} fullPage={false} />
  }

  // SLOW-tier poll (30s): a bare `return null` left these figures absent for up
  // to half a minute after load. A diagnostic surface should say it is waiting
  // rather than render nothing — and now that the figures are un-boxed, the
  // waiting state uses the same absent treatment as every other figure in the
  // product, holding the space its values will occupy.
  if (!m) {
    return (
      <div className="flex flex-wrap gap-x-10 gap-y-5">
        {['Process uptime', 'Memory (RSS)', 'Memory (VMS)', 'CPU'].map((label) => (
          <Figure
            key={label}
            label={label}
            size="md"
            certainty="absent"
            absentReason="Polled every 30 seconds — not yet returned"
          />
        ))}
      </div>
    )
  }

  // One slice feeds all four, so they share one certainty. On the SLOW tier a
  // failed refresh is easy to miss — these figures go minutes between updates —
  // which is exactly when marking the value as retained matters most.
  const certainty = certaintyFromSlice(slice, 30_000)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-10 gap-y-5">
        <Figure label="Process uptime" size="md" {...certainty}>{m.uptime.formatted}</Figure>
        <Figure label="Memory (RSS)" size="md" {...certainty}>
          {m.memoryMb.rssMb.toFixed(1)}<span className="t-unit ml-1">MB</span>
        </Figure>
        <Figure label="Memory (VMS)" size="md" {...certainty}>
          {m.memoryMb.vmsMb.toFixed(1)}<span className="t-unit ml-1">MB</span>
        </Figure>
        <Figure label="CPU" size="md" {...certainty}>
          {m.cpuPercent.toFixed(1)}<span className="t-unit ml-1">%</span>
        </Figure>
      </div>
      <p className="t-helper">
        Event log holding {m.eventLogSize.toLocaleString()} entries.
      </p>
    </div>
  )
}
