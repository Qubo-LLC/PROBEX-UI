'use client'

// Shadow-live (scope §3B.4): the live code path on live markets with the real $52.74 (minus the POL
// gas reserve), two accounts side by side, conservative vs aggressive. Nothing is ever signed or
// sent. Equity, PnL, trades and every skipped signal with its reason, from /api/shadow.

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useEngineShadow } from '@/config/hooks/useServices'
import { formatCurrency } from '@/lib/utils'
import type { ShadowAccountDTO, ShadowDTO } from '@/types/runway'

const LABEL: Record<string, string> = { SHADOW_LIVE_CONS: 'Conservative (current settings)', SHADOW_LIVE_AGGR: 'Aggressive' }

function AccountColumn({ name, a }: { name: string; a: ShadowAccountDTO }) {
  const st = a.state
  const curve = a.equity_curve.map((p) => ({ t: p.ts * 1000, equity: p.equity }))
  const equity = curve.length ? curve[curve.length - 1]!.equity : (st?.start ?? 0)
  return (
    <div className="rounded border border-[var(--color-border,#e5e7eb)] p-3" data-testid={`shadow-${name}`}>
      <h3 className="t-label mb-1">{LABEL[name] ?? name}</h3>
      <p className="t-description mb-2">
        Kelly {a.settings.kelly_fraction} · max bet {a.settings.max_bet_pct}% · exposure {a.settings.total_exposure_pct}% ·
        correlated {a.settings.correlated_exposure_pct}% · drawdown stop {a.settings.drawdown_stop_pct}%
      </p>
      <dl className="grid grid-cols-2 gap-x-3 text-sm mb-2">
        <dt>Start</dt><dd className="text-right">{formatCurrency(st?.start ?? 0)}</dd>
        <dt>Equity (at cost)</dt><dd className="text-right" data-testid="shadow-equity">{formatCurrency(equity)}</dd>
        <dt>Realized PnL</dt><dd className="text-right">{formatCurrency(st?.realized_pnl ?? 0)}</dd>
        <dt>Open positions</dt><dd className="text-right">{st?.positions.length ?? 0}</dd>
        <dt>Orders built (not sent)</dt><dd className="text-right">{a.orders_built}</dd>
        <dt>Status</dt><dd className="text-right">{st?.halted ? `halted: ${st.halted}` : 'running'}</dd>
      </dl>
      {curve.length > 1 && (
        <div style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} hide />
              <YAxis domain={['auto', 'auto']} width={40} />
              <Tooltip labelFormatter={(t) => new Date(Number(t)).toISOString().slice(0, 16)} />
              <Line type="stepAfter" dataKey="equity" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <h4 className="t-label mt-2">Skipped signals</h4>
      <ul className="text-sm" data-testid="shadow-skips">
        {Object.entries(a.skipped_by_reason).sort((x, y) => y[1] - x[1]).map(([r, n]) => <li key={r}>{r}: {n}</li>)}
        {Object.keys(a.skipped_by_reason).length === 0 && <li>none</li>}
      </ul>
      <h4 className="t-label mt-2">Latest trades</h4>
      <ul className="text-sm">
        {a.trades.slice(-8).reverse().map((t, i) => (
          <li key={i}>
            {t.type === 'fill' ? `${t.strategy_id} ${t.token?.toUpperCase()} ${t.shares} @ ${t.price}` : `settled ${t.market_id}: ${formatCurrency(t.pnl ?? 0)}`}
            {t.question ? ` · ${t.question.slice(0, 50)}` : ''}
          </li>
        ))}
        {a.trades.length === 0 && <li>none yet</li>}
      </ul>
    </div>
  )
}

export function ShadowLiveView({ data }: { data: ShadowDTO }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {['SHADOW_LIVE_CONS', 'SHADOW_LIVE_AGGR'].map((n) => data.accounts[n] && <AccountColumn key={n} name={n} a={data.accounts[n]!} />)}
    </div>
  )
}

export function ShadowLivePanel() {
  const slice = useEngineShadow(60_000)
  const data = slice.status === 'success' ? slice.data : null
  return (
    <section aria-labelledby="shadow-live" className="mt-6" data-testid="shadow-live-panel">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 id="shadow-live" className="t-section-title">Shadow-live ($52.74)</h2>
        <span className="t-description">Live code path · no key · no order sent</span>
      </div>
      {data === null ? (
        <p className="t-description">{slice.status === 'error' ? 'The engine did not answer /api/shadow.' : 'Loading…'}</p>
      ) : <ShadowLiveView data={data} />}
    </section>
  )
}
