'use client'

// Survival — capital protection, per SLEEVE, from the engine's sleeve ledgers
// (/api/runway).
//
// Each sleeve has its own survival state. A drawdown of 20% of its allocation
// below its high-water mark (DRAWDOWN_STOP), or equity below 10% of its
// allocation (DEAD), halts that sleeve only; both are sticky until the operator
// resets them, and open positions still settle.
//
// The global survival brain's capital, daily/weekly targets, burn rate and
// runway are no longer shown: they were the retired PaperTrader's books. The
// brain itself still runs in the engine, unchanged, for that retired path.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState } from '@/components/ui/ErrorState'
import { Meter } from '@/components/ui/Panel'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'
import type { Sleeve } from '@/types/runway'

const DRAWDOWN_STOP_PCT = 20
const DEAD_PCT = 10

export function SurvivalConsole({ embedded = false }: EmbeddableProps = {}) {
  const slice = useApplicationStore((s) => s.engine.runway)
  const runway = slice.status === 'success' ? slice.data : null

  return (
    <div className={pageShell(embedded, 'gap-5')}>
      {!embedded && (
        <PageHeader
          title="Survival"
          subtitle="Capital protection per sleeve — drawdown stop and DEAD, each halting only its own sleeve"
        />
      )}

      {slice.status === 'error' && !runway && (
        <ErrorState title="The sleeve ledgers did not answer" description={slice.error?.message ?? 'No response from /api/runway.'} fullPage={false} />
      )}
      {!runway && slice.status !== 'error' && <p className="t-description">Waiting for /api/runway.</p>}

      {runway && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {runway.sleeves.map((s) => <SleeveSurvival key={s.sleeveId} s={s} />)}
        </div>
      )}
    </div>
  )
}

function SleeveSurvival({ s }: { s: Sleeve }) {
  const ddPct = s.drawdownPct ?? 0
  const deadLine = s.allocation * DEAD_PCT / 100
  return (
    <section className="rounded-lg px-4 py-3" style={{ border: '1px solid var(--synatra-border)' }} data-testid={`survival-${s.sleeveId}`}>
      <div className="flex items-baseline justify-between">
        <h2 className="t-section-title">{s.sleeveId}</h2>
        <span style={{ color: s.halt.halted ? 'var(--synatra-negative)' : 'var(--synatra-positive)' }}>
          {s.halt.halted ? `Halted · ${s.halt.state.replace('_', ' ').toLowerCase()}` : 'Trading'}
        </span>
      </div>
      {s.halt.reason && <p className="t-description mt-1">{s.halt.reason}</p>}
      <div className="mt-3 text-sm flex flex-col gap-2">
        <Meter
          value={Math.max(0, Math.min(1, ddPct / DRAWDOWN_STOP_PCT))}
          color={ddPct >= DRAWDOWN_STOP_PCT ? 'var(--synatra-negative)' : ddPct >= DRAWDOWN_STOP_PCT / 2 ? 'var(--synatra-warning)' : 'var(--synatra-primary)'}
          ariaLabel={`${s.sleeveId} drawdown against the ${DRAWDOWN_STOP_PCT}% stop`}
          label={<span>Drawdown {formatCurrency(s.drawdown)} ({ddPct.toFixed(1)}% of allocation; stop at {DRAWDOWN_STOP_PCT}%)</span>}
        />
        <div>Equity {formatCurrency(s.equity)} of {formatCurrency(s.allocation)} · high-water mark {formatCurrency(s.highWaterMark)}</div>
        <div className="t-description">DEAD below {formatCurrency(deadLine)} ({DEAD_PCT}% of allocation)</div>
      </div>
    </section>
  )
}
