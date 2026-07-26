'use client'

// EmergencyStopPanel — the operator's halt control.
//
// Until now the dashboard had no way to stop the engine; the only recourse was
// SSH. This is deliberately the most prominent control on the Execution page
// and deliberately the hardest to fire by accident: it is visually separated,
// states the live blast radius (how many positions and how much capital are
// actually at risk right now) inside the confirmation, and cannot be triggered
// when there is nothing to stop.

import { useApplicationStore } from '@/store/applicationStore'
import { useEmergencyStop, MUTATIONS } from '@/config/hooks/useMutation'
import { MutationButton } from './MutationButton'
import { parsePositionRows } from '@/lib/mappers/positions'
import { formatCurrency } from '@/lib/utils'

function HaltIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9h6v6H9z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function EmergencyStopPanel() {
  const positionsSlice = useApplicationStore((s) => s.engine.positions)
  const executionSlice = useApplicationStore((s) => s.engine.executionStatus)
  const mutation       = useEmergencyStop()

  // Blast radius, from live state — never hardcoded, never guessed.
  const positions = positionsSlice.status === 'success' ? positionsSlice.data : null
  const parsed    = positions ? parsePositionRows(positions) : null
  const rows      = parsed?.kind === 'rows' ? parsed.rows : []
  const openCount = positions?.count ?? 0
  const atRisk    = rows.reduce((sum, r) => sum + (r.costBasis ?? 0), 0)
  const mode      = executionSlice.status === 'success' ? (executionSlice.data?.mode ?? null) : null

  const nothingToStop = openCount === 0

  const blastRadius = nothingToStop
    ? 'The engine currently holds no open positions, so there is nothing to close.'
    : `This will close ${openCount} open position${openCount === 1 ? '' : 's'}` +
      (atRisk > 0 ? ` representing ${formatCurrency(atRisk)} of deployed capital` : '') +
      `, and halt further trading. ${mode === 'live' ? 'The engine is in LIVE mode — these are real orders.' : 'The engine is in paper mode.'}`

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-negative)' }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ borderBottom: '1px solid var(--probex-border)' }}
      >
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-negative)' }}>
            Emergency Stop
          </h2>
          <p className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            Halt trading and close every open position
          </p>
        </div>
        {mode && (
          <span
            className="text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{
              color: mode === 'live' ? 'var(--probex-negative)' : 'var(--probex-text-muted)',
              border: `1px solid ${mode === 'live' ? 'var(--probex-negative)' : 'var(--probex-border-default)'}`,
            }}
          >
            {mode}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-5">
          <div className="flex flex-col">
            <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{openCount}</span>
            <span className="text-2xs uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>open</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{formatCurrency(atRisk)}</span>
            <span className="text-2xs uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>at risk</span>
          </div>
        </div>

        <MutationButton
          mutation={mutation}
          label="Emergency Stop"
          tone="danger"
          icon={<HaltIcon />}
          disabled={nothingToStop}
          disabledReason="No open positions to close."
          confirmTitle="Halt the engine and close all positions?"
          confirmDescription={blastRadius}
          endpoint={MUTATIONS.emergencyStop.endpoint}
        />
      </div>
    </div>
  )
}
