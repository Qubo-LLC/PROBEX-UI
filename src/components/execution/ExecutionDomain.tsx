'use client'

// Execution domain — API group "Execution Engine":
//   /api/execution/{status,policy,trades,orders} + the mutation controls
//   (emergency stop, manual order, cancel).
//
// The Paper Trading tab is removed: the retired PaperTrader (/api/paper-stats,
// /api/paper/status and its start/stop/reset/resolve controls) is no longer
// shown anywhere on the dashboard. Paper trading now runs in the engine's
// sleeves; its runway, activity and current windows are on the Overview.

import { DomainPage } from '@/components/layout/DomainPage'
import { ExecutionConsole } from './ExecutionConsole'
import type { TabDef } from '@/components/ui/Tabs'

export function ExecutionDomain() {
  const tabs: TabDef[] = [{ id: 'engine', label: 'Engine' }]
  return (
    <DomainPage
      title="Execution"
      subtitle="The order-execution subsystem"
      tabs={tabs}
      render={() => <ExecutionConsole embedded />}
    />
  )
}
