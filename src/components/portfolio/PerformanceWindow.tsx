'use client'

// PerformanceWindow — /api/portfolio/performance, previously polled and dropped.
//
// This endpoint answers a question nothing else on the dashboard does: how has
// the portfolio moved over a bounded recent window, and how deep was the worst
// drawdown inside it. Portfolio summary reports all-time figures; this is the
// last N hours specifically.
//
// The lookback is operator-selectable because the endpoint takes
// `lookback_hours` (1–168) and a 24h view and a 7d view tell different stories.
// This is the one place in the app that calls a service method directly rather
// than reading a store slice — the parameter is UI state, so a shared polled
// slice can't express it.

import { useEffect, useState } from 'react'
import { services } from '@/lib/services'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { formatCurrency, formatSignedCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { PortfolioPerformance } from '@/types/engine'

/** Backend accepts 1–168 hours. */
const WINDOWS = [
  { label: '6H',  hours: 6   },
  { label: '24H', hours: 24  },
  { label: '7D',  hours: 168 },
] as const

export function PerformanceWindow() {
  const [hours, setHours]   = useState<number>(24)
  const [data,  setData]    = useState<PortfolioPerformance | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    services.engine
      .getPortfolioPerformance(hours)
      .then((r) => { if (active) setData(r.data) })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Request failed') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [hours])

  const p = data?.performance ?? null
  // The engine reports its own availability for the window — a lookback longer
  // than the recorded history has no answer, and that is not an error.
  const hasData = p !== null && p.available && p.snapshotCount > 0

  const returnPositive = (p?.returnPct ?? 0) >= 0

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>
            Performance Window
          </h2>
          <p className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            Value change and worst drawdown over a bounded recent period
          </p>
        </div>
        <ProvenanceBadge provenance="live" detail="/api/portfolio/performance" />
      </div>

      <div className="px-4 pt-3">
        <div className="inline-flex rounded-md overflow-hidden" style={{ border: '1px solid var(--probex-border-default)' }} role="group" aria-label="Lookback window">
          {WINDOWS.map((w) => (
            <button
              key={w.hours}
              onClick={() => setHours(w.hours)}
              aria-pressed={hours === w.hours}
              className={cn(
                'px-3 py-1 text-2xs font-semibold cursor-pointer transition-colors duration-150 focus-ring',
              )}
              style={
                hours === w.hours
                  ? { background: 'var(--probex-accent)', color: '#fff' }
                  : { background: 'transparent', color: 'var(--probex-text-muted)' }
              }
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading && <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>Loading window…</p>}

        {!loading && error && (
          <p className="text-2xs" style={{ color: 'var(--probex-negative)' }}>{error}</p>
        )}

        {!loading && !error && !hasData && (
          <p className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>
            The engine has no recorded snapshots covering the last {hours}h yet.
          </p>
        )}

        {!loading && !error && hasData && p && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric
                label="Return"
                value={`${returnPositive ? '+' : ''}${p.returnPct.toFixed(2)}%`}
                color={returnPositive ? 'var(--probex-positive)' : 'var(--probex-negative)'}
              />
              <Metric
                label="Value change"
                value={formatSignedCurrency(p.valueChange)}
                color={p.valueChange >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)'}
              />
              <Metric
                label="Max drawdown"
                value={`${p.maxDrawdownPct.toFixed(2)}%`}
                color={p.maxDrawdownPct > 0 ? 'var(--probex-warning)' : undefined}
              />
              <Metric label="Trades" value={String(p.tradesInPeriod)} />
            </div>

            <div
              className="flex items-center justify-between text-2xs pt-2.5"
              style={{ borderTop: '1px solid var(--probex-border)', color: 'var(--probex-text-muted)' }}
            >
              <span className="tabular-nums">
                {formatCurrency(p.startValue)} → {formatCurrency(p.endValue)}
              </span>
              <span style={{ color: 'var(--probex-text-disabled)' }}>
                {p.snapshotCount} snapshots over {p.periodHours}h
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color?: string | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs uppercase tracking-wider" style={{ color: 'var(--probex-text-disabled)' }}>{label}</span>
      <span className="text-base font-bold tabular-nums" style={{ color: color ?? 'var(--probex-text-primary)' }}>{value}</span>
    </div>
  )
}
