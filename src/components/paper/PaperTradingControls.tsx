'use client'

// PaperTradingControls — start / stop / resolve / reset for the paper trader.
//
// Start and stop are reversible one-click toggles. Resolve is a manual nudge to
// settle pending trades and is also safe. Reset is not: it destroys the entire
// session history, so it is separated below a rule, styled as destructive, and
// its confirmation names the exact number of trades that will be lost.

import { useApplicationStore } from '@/store/applicationStore'
import {
  useStartPaperTrading, useStopPaperTrading,
  useResetPaperTrading, useResolvePaperTrades,
  MUTATIONS,
} from '@/config/hooks/useMutation'
import { MutationButton } from '@/components/execution/MutationButton'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'

export function PaperTradingControls() {
  const statusSlice = useApplicationStore((s) => s.engine.paperStatus)
  const statsSlice  = useApplicationStore((s) => s.engine.paperStats)

  const start   = useStartPaperTrading()
  const stop    = useStopPaperTrading()
  const reset   = useResetPaperTrading()
  const resolve = useResolvePaperTrades()

  const status = statusSlice.status === 'success' ? statusSlice.data : null
  const stats  = statsSlice.status  === 'success' ? statsSlice.data  : null

  const enabled       = status?.enabled ?? false
  const pendingTrades = status?.pendingTrades ?? 0
  const totalTrades   = stats?.paperTrading.totalTrades ?? 0
  // Only meaningful once we know the engine's actual state.
  const stateKnown    = status !== null

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>
            Paper Trading Controls
          </h2>
          <p className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            {stateKnown
              ? `Currently ${enabled ? 'running' : 'stopped'} · ${pendingTrades} pending · ${totalTrades} total this session`
              : 'Reading engine state…'}
          </p>
        </div>
        <ProvenanceBadge provenance="live" detail="/api/paper/*" />
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <MutationButton
            mutation={start}
            label="Start"
            tone="primary"
            skipConfirm
            disabled={!stateKnown || enabled}
            disabledReason={enabled ? 'Already running.' : undefined}
            endpoint={MUTATIONS.paperStart.endpoint}
          />
          <MutationButton
            mutation={stop}
            label="Stop"
            tone="neutral"
            skipConfirm
            disabled={!stateKnown || !enabled}
            disabledReason={!enabled && stateKnown ? 'Already stopped.' : undefined}
            endpoint={MUTATIONS.paperStop.endpoint}
          />
          <MutationButton
            mutation={resolve}
            label="Resolve Pending"
            tone="neutral"
            skipConfirm
            disabled={!stateKnown || pendingTrades === 0}
            disabledReason={pendingTrades === 0 && stateKnown ? 'Nothing pending to resolve.' : undefined}
            endpoint={MUTATIONS.paperResolve.endpoint}
          />
        </div>

        <div className="pt-3.5" style={{ borderTop: '1px solid var(--probex-border)' }}>
          <MutationButton
            mutation={reset}
            label="Reset Session"
            tone="danger"
            size="sm"
            disabled={!stateKnown}
            confirmTitle="Erase the paper trading session?"
            confirmDescription={
              `This permanently clears all paper trading history` +
              (totalTrades > 0 ? ` — ${totalTrades} recorded trade${totalTrades === 1 ? '' : 's'} will be lost` : '') +
              `, and resets capital to the starting bankroll. This cannot be undone.`
            }
            endpoint={MUTATIONS.paperReset.endpoint}
          />
        </div>
      </div>
    </div>
  )
}
