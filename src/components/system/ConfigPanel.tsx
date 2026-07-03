'use client'

// ConfigPanel — /api/config rendered read-only. The backend exposes no write
// path (config mutation is P1-02 in the backend dependency report); the panel
// says so explicitly instead of showing disabled inputs.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency } from '@/lib/utils'
import { Card }       from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'

export function ConfigPanel() {
  const slice = useApplicationStore((s) => s.engine.config)
  const cfg   = slice.data

  if (slice.status === 'error') {
    return (
      <ErrorState
        title="Configuration unavailable"
        description={slice.error?.message ?? 'The /api/config endpoint did not respond.'}
        fullPage={false}
      />
    )
  }

  if (!cfg) return null

  const rows: Array<{ label: string; value: string; group: string }> = [
    { group: 'Trading', label: 'Environment',           value: cfg.environment.toUpperCase() },
    { group: 'Trading', label: 'Initial bankroll',      value: formatCurrency(cfg.initialBankroll) },
    { group: 'Trading', label: 'Max bet',               value: `${cfg.maxBetPercent}% of bankroll` },
    { group: 'Trading', label: 'Max concurrent positions', value: String(cfg.maxConcurrentPositions) },
    { group: 'Trading', label: 'Minimum edge',          value: `${cfg.minEdge}%` },
    { group: 'Trading', label: 'Kelly fraction',        value: `${cfg.kellyFraction}×` },
    { group: 'Trading', label: 'Max latency',           value: `${cfg.maxLatencyMs}ms` },
    { group: 'Connectivity', label: 'Polymarket API',   value: cfg.polymarketApiUrl },
    { group: 'Connectivity', label: 'Polygon chain',    value: String(cfg.polygonChainId) },
    { group: 'Connectivity', label: 'Anthropic API key', value: cfg.anthropicApiKey === null ? 'not configured' : 'configured' },
    { group: 'Dashboard', label: 'API enabled',         value: cfg.dashboardApiEnabled ? 'yes' : 'no' },
    { group: 'Dashboard', label: 'Bind address',        value: `${cfg.dashboardApiHost}:${cfg.dashboardApiPort}` },
    { group: 'Dashboard', label: 'Update interval',     value: `${cfg.dashboardUpdateIntervalMs}ms` },
    { group: 'Dashboard', label: 'Log level',           value: cfg.logLevel },
  ]

  const groups = ['Trading', 'Connectivity', 'Dashboard']

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
          Configuration
        </h3>
        <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
          Read-only — the engine exposes no config write endpoint yet
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
        {groups.map((group) => (
          <div key={group} className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-disabled)' }}>
              {group}
            </span>
            {rows.filter((r) => r.group === group).map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-3 text-xs">
                <span style={{ color: 'var(--probex-text-muted)' }}>{r.label}</span>
                <span className="font-medium tabular-nums text-right truncate" style={{ color: 'var(--probex-text-secondary)' }} title={r.value}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
}
