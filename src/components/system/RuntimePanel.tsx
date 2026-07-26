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
import { StatusChip } from '@/components/ui/StatusChip'
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
        <div className="flex items-center gap-3">
          <h3 className="t-card-title">Runtime</h3>
          <span
            className="t-value"
            style={activeCount < keys.length ? { color: 'var(--probex-warning)' } : undefined}
          >
            {activeCount}/{keys.length} components active
          </span>
        </div>
        <div className="flex items-center gap-3">
          <StatusChip tone={runtime.mode === 'live' ? 'positive' : 'info'} dot={false}>
            {runtime.mode}
          </StatusChip>
          <span className="t-metadata">
            since {new Date(runtime.initializedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Component matrix.
          Each tile is a small monitoring widget rather than a labelled
          rectangle: a status dot with a matching halo, the component name, and
          an explicit ON/OFF readout on the right. Previously an inactive tile
          was signalled only by 55% opacity on the whole tile, which is easy to
          miss in a grid of fourteen and reads as "disabled control" rather than
          "component down". Now the dot colour, the text weight and the readout
          all agree, and inactive tiles keep full contrast on their label so
          they stay legible while still looking distinct. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {keys.map((key) => {
          const active = runtime.components[key]
          const tone = active ? 'var(--probex-positive)' : 'var(--probex-text-disabled)'
          return (
            <div
              key={key}
              className="elev-hover group flex items-center gap-2.5 rounded-md px-3 py-2.5 text-xs"
              style={{
                background: active
                  ? 'var(--probex-surface-2)'
                  : 'color-mix(in srgb, var(--probex-surface) 70%, transparent)',
                border: `1px solid ${active ? 'var(--probex-border)' : 'var(--probex-border)'}`,
                boxShadow: active ? 'var(--probex-elev-1)' : 'none',
              }}
              title={`${COMPONENT_LABELS[key]}: ${active ? 'active' : 'inactive'}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: tone,
                  // Halo only on live components — the glow is the "running"
                  // signal, so an offline dot must not have one.
                  boxShadow: active
                    ? `0 0 0 3px color-mix(in srgb, ${tone} 18%, transparent)`
                    : 'none',
                }}
                aria-hidden="true"
              />
              <span
                className="truncate flex-1 font-medium"
                style={{ color: active ? 'var(--probex-text-secondary)' : 'var(--probex-text-muted)' }}
              >
                {COMPONENT_LABELS[key]}
              </span>
              <span
                className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0 tabular-nums"
                style={{ color: active ? 'color-mix(in srgb, var(--probex-positive) 80%, transparent)' : 'var(--probex-text-disabled)' }}
              >
                {active ? 'on' : 'off'}
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
