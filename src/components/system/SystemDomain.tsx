'use client'

// System domain — API groups "Health & Status", "Configuration & Status",
// "System", and "Monitoring".
//
//   Health → /health, /api/runtime, /api/system/metrics, /api/config
//   Events → /api/events
//
// The event log is engine telemetry, same as the health panels — it belongs
// beside them rather than as its own destination.

import { useApplicationStore } from '@/store/applicationStore'
import { DomainPage } from '@/components/layout/DomainPage'
import { SystemConsole } from './SystemConsole'
import { EventLog } from '@/components/events/EventLog'
import type { TabDef } from '@/components/ui/Tabs'

export function SystemDomain() {
  const eventsSlice = useApplicationStore((s) => s.engine.events)
  const eventCount = eventsSlice.status === 'success' ? eventsSlice.data?.count ?? 0 : 0

  const tabs: TabDef[] = [
    { id: 'health', label: 'Health & Config' },
    { id: 'events', label: 'Event Log', count: eventCount },
  ]

  return (
    <DomainPage
      title="System"
      subtitle="Engine health, runtime components, configuration, and the live event log"
      tabs={tabs}
      render={(active) => (active === 'events' ? <EventLog embedded /> : <SystemConsole embedded />)}
    />
  )
}
