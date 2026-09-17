'use client'

// PerformanceWindow — /api/portfolio/performance over an operator-chosen
// lookback: how the portfolio moved in the last N hours, and how deep the
// worst drawdown inside that window was. The summary reports all-time
// figures; this is the bounded recent story, and the two differ (live: 22.6%
// current drawdown from peak, 36.0% worst drawdown inside the last 24h).
//
// The lookback is UI state (the endpoint takes `lookback_hours`, 1–168), so
// this is the one place in the app that calls a service method directly
// rather than reading a polled slice. That part is unchanged; what changed is
// the rendering — a Panel with a LIVE badge and four hand-set metrics became
// four Figures under a ruled heading, with the window selector beside it.

import { useEffect, useState } from 'react'
import { services } from '@/lib/services'
import { isCanceledError } from '@/lib/services/response'
import { Figure } from '@/components/shared/Figure'
import { formatCurrency, formatSignedCurrency } from '@/lib/utils'
import type { PortfolioPerformance } from '@/types/engine'

/** Backend accepts 1–168 hours. */
const WINDOWS = [
  { label: '6H',  hours: 6   },
  { label: '24H', hours: 24  },
  { label: '7D',  hours: 168 },
] as const

export function PerformanceWindow() {
  const [hours, setHours]     = useState<number>(24)
  const [data,  setData]      = useState<PortfolioPerformance | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setLoading(true)
    setError(null)
    services.engine
      .getPortfolioPerformance(hours, controller.signal)
      .then((r) => { if (active) setData(r.data) })
      .catch((e: unknown) => {
        if (!active || isCanceledError(e)) return
        setError(e instanceof Error ? e.message : 'Request failed')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [hours])

  const p = data?.performance ?? null
  const hasData = p !== null && p.snapshotCount > 0
  const up = (p?.returnPct ?? 0) >= 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="t-label">Last {hours >= 24 ? `${hours / 24}d` : `${hours}h`}</h3>
        <div className="inline-flex rounded-md overflow-hidden" style={{ border: '1px solid var(--probex-border-default)' }} role="group" aria-label="Lookback window">
          {WINDOWS.map((w) => (
            <button
              key={w.hours}
              onClick={() => setHours(w.hours)}
              aria-pressed={hours === w.hours}
              className="px-3 py-1 text-2xs font-semibold cursor-pointer transition-colors duration-150 focus-ring"
              style={
                hours === w.hours
                  ? { background: 'var(--probex-primary)', color: 'var(--probex-bg)' }
                  : { background: 'transparent', color: 'var(--probex-text-muted)' }
              }
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="t-helper">Loading the {hours}h window…</p>
      ) : error ? (
        <p className="t-description" style={{ color: 'var(--probex-negative)' }}>{error}</p>
      ) : !hasData || !p ? (
        // The engine's own wording when it supplied one.
        <p className="t-description">{data?.message ?? `The engine has no recorded snapshots covering the last ${hours}h yet.`}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
          <Figure
            label="Return"
            size="md"
            tone={up ? 'var(--probex-positive)' : 'var(--probex-negative)'}
            title="/api/portfolio/performance"
            footnote={`${formatCurrency(p.startValue)} → ${formatCurrency(p.endValue)}`}
          >
            {`${up ? '+' : ''}${p.returnPct.toFixed(1)}%`}
          </Figure>
          <Figure label="Value change" size="md" tone={p.valueChange > 0 ? 'var(--probex-positive)' : p.valueChange < 0 ? 'var(--probex-negative)' : undefined} title="/api/portfolio/performance">
            {formatSignedCurrency(p.valueChange)}
          </Figure>
          <Figure
            label="Worst drawdown"
            size="md"
            tone={p.maxDrawdownPct > 0 ? 'var(--probex-negative)' : undefined}
            title="/api/portfolio/performance"
            footnote="inside this window"
          >
            {`−${p.maxDrawdownPct.toFixed(1)}%`}
          </Figure>
          <Figure label="Trades" size="md" title="/api/portfolio/performance" footnote={`${p.snapshotCount} snapshots over ${p.periodHours}h`}>
            {String(p.tradesInPeriod)}
          </Figure>
        </div>
      )}
    </div>
  )
}
