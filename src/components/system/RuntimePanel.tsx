'use client'

// RuntimePanel — /api/runtime rendered natively: mode, lifecycle timestamps,
// the 10-component matrix, and the bot-reported counters.
//
// Truth note (spec §6.2): runtime.stats can be written externally via
// POST /api/update-stats and currently holds seeded test data, so the
// counters are explicitly labelled "reported by the bot process" and are
// NOT used for any PnL display elsewhere in the app.

import { useApplicationStore } from '@/store/applicationStore'
import { formatSignedCurrency } from '@/lib/utils'
import { Card }       from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import type { RuntimeComponents } from '@/types/engine'

const COMPONENT_LABELS: Record<keyof RuntimeComponents, string> = {
  bot:               'Bot Core',
  clobClient:        'CLOB Client',
  executionEngine:   'Execution Engine',
  marketFetcher:     'Market Fetcher',
  resolutionTracker: 'Resolution Tracker',
  pnlCalculator:     'PnL Calculator',
  telegramAlerter:   'Telegram Alerter',
  healthMonitor:     'Health Monitor',
  survivalBrain:     'Survival Brain',
  paperTrader:       'Paper Trader',
  consensusEngine:   'Consensus Engine',
  marketHistory:     'Market History',
  portfolioTracker:  'Portfolio Tracker',
  analyticsEngine:   'Analytics Engine',
}

export function RuntimePanel() {
  const slice   = useApplicationStore((s) => s.engine.runtime)
  const runtime = slice.data

  if (slice.status === 'error') {
    return (
      <ErrorState
        title="Runtime status unavailable"
        description={slice.error?.message ?? 'The /api/runtime endpoint did not respond.'}
        fullPage={false}
      />
    )
  }

  if (!runtime) return null

  const keys = Object.keys(COMPONENT_LABELS) as Array<keyof RuntimeComponents>
  const activeCount = keys.filter((k) => runtime.components[k]).length

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
            Runtime
          </h3>
          <span className="text-2xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
            {activeCount}/{keys.length} components active
          </span>
        </div>
        <div className="flex items-center gap-4 text-2xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
          <span>Mode <span className="font-bold uppercase" style={{ color: 'var(--probex-text-secondary)' }}>{runtime.mode}</span></span>
          <span>Initialized {new Date(runtime.initializedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Component matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {keys.map((key) => {
          const active = runtime.components[key]
          return (
            <div
              key={key}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs"
              style={{
                background: 'var(--probex-surface-2)',
                border:     '1px solid var(--probex-border)',
                opacity:    active ? 1 : 0.55,
              }}
              title={active ? `${COMPONENT_LABELS[key]}: active` : `${COMPONENT_LABELS[key]}: inactive`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: active ? 'var(--probex-positive)' : 'var(--probex-text-disabled)' }}
                aria-hidden="true"
              />
              <span className="truncate" style={{ color: active ? 'var(--probex-text-secondary)' : 'var(--probex-text-disabled)' }}>
                {COMPONENT_LABELS[key]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Bot-reported counters — labelled, not trusted for PnL */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
          <span>{runtime.stats.edgesDetected} edges detected</span>
          <span>{runtime.stats.ordersExecuted} orders executed</span>
          <span>{formatSignedCurrency(runtime.stats.totalPnl)} total P&L</span>
          <span>since {new Date(runtime.stats.startedAt).toLocaleString()}</span>
        </div>
        <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
          Counters as reported by the bot process (writable via POST /api/update-stats).
          Trading truth on the Execution console comes from /api/execution/status.
        </p>
      </div>
    </Card>
  )
}
