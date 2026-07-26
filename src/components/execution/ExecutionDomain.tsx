'use client'

// Execution domain — API groups "Execution Engine" and "Paper Trading Control".
//
//   Engine → /api/execution/{status,policy,trades,orders} + the mutation
//            controls (emergency stop, manual order, cancel)
//   Paper  → /api/paper-stats, /api/paper/status + start/stop/reset/resolve
//
// Paper trading is a mode of the execution engine, not a parallel system — the
// same order flow, the same risk limits, simulated fills. Two sidebar entries
// implied two engines.

import { useApplicationStore } from '@/store/applicationStore'
import { DomainPage } from '@/components/layout/DomainPage'
import { ExecutionConsole } from './ExecutionConsole'
import { PaperTradingConsole } from '@/components/paper/PaperTradingConsole'
import type { TabDef } from '@/components/ui/Tabs'

export function ExecutionDomain() {
  const statusSlice = useApplicationStore((s) => s.engine.paperStatus)
  const paper = statusSlice.status === 'success' ? statusSlice.data : null

  const tabs: TabDef[] = [
    { id: 'engine', label: 'Engine' },
    { id: 'paper',  label: 'Paper Trading' },
  ]

  return (
    <DomainPage
      title="Execution"
      subtitle="Order flow, engine reliability, and the simulated trading session"
      tabs={tabs}
      actions={
        paper ? (
          <span
            className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider"
            style={{ color: paper.enabled ? 'var(--probex-positive)' : 'var(--probex-text-muted)' }}
          >
            <span
              className={paper.enabled ? 'live-dot w-1.5 h-1.5' : 'w-1.5 h-1.5 rounded-full inline-block'}
              style={{ background: paper.enabled ? 'var(--probex-positive)' : 'var(--probex-text-disabled)' }}
              aria-hidden="true"
            />
            Paper {paper.enabled ? 'enabled' : 'disabled'}
          </span>
        ) : undefined
      }
      render={(active) =>
        active === 'paper' ? <PaperTradingConsole embedded /> : <ExecutionConsole embedded />
      }
    />
  )
}
