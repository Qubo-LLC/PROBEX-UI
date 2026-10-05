'use client'

// ConfigPanel — /api/config rendered read-only. The backend exposes no write
// path (config mutation is P1-02 in the backend dependency report); the panel
// says so explicitly instead of showing disabled inputs.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency } from '@/lib/utils'

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

  // SLOW-tier poll (30s) — same reason as RuntimePanel.
  if (!cfg) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <h2 className="t-section-title">Configuration</h2>
          <span className="t-metadata">awaiting /api/config</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--synatra-text-disabled)' }}>
          Reading engine configuration… this endpoint is polled every 30 seconds.
        </p>
      </div>
    )
  }

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
    // ─── The quietest section on the page ───────────────────────────────────
    // This was a full Card — measured, the heaviest surface on System — for the
    // least-consulted information on it: fourteen read-only parameters that
    // change roughly never. It out-weighted the posture verdict and the market
    // feed, which is the same hierarchy inversion the endpoint gauges had, in a
    // smaller form.
    //
    // Configuration is reference material, so it now reads as reference
    // material: no container, no fill, a rule above it and the values in a
    // dense three-column grid. Nothing is hidden and no value moved — only the
    // weight changed.
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="t-section-title">
          Configuration
        </h2>
        <span className="text-2xs" style={{ color: 'var(--synatra-text-disabled)' }}>
          Read-only — the engine exposes no config write endpoint yet
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
        {groups.map((group) => (
          <div key={group} className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--synatra-text-disabled)' }}>
              {group}
            </span>
            {rows.filter((r) => r.group === group).map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-3 text-xs">
                <span style={{ color: 'var(--synatra-text-muted)' }}>{r.label}</span>
                <span className="font-medium tabular-nums text-right truncate" style={{ color: 'var(--synatra-text-secondary)' }} title={r.value}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
