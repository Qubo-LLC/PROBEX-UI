'use client'

// ALPHA paper sleeves (scope v8.8 §5.7), the dashboard's default view: ALPHA-EVENTS and ALPHA-CRYPTO book the edge
// scanner's rows by one pre-registered rule (docs/p3/preregistration_alpha.md); ARB shows the arbitrage engine's paper
// fills. Paper (simulated). The closed legacy epochs are in the Archived tab beneath, hidden by default.

import { useAlpha, useSleeveArchive } from '@/config/hooks/useServices'
import type { AlphaDTO, AlphaSleeveDTO, SleeveArchiveDTO } from '@/types/runway'

const usd = (x?: number | null) => (x === null || x === undefined ? '—' : `${x < 0 ? '−' : ''}$${Math.abs(x).toFixed(2)}`)
const pct = (x?: number | null) => (x === null || x === undefined ? '—' : `${(100 * x).toFixed(1)}%`)
const ci = (v?: (number | null)[]) =>
  v && v[0] !== null && v[0] !== undefined
    ? `${pct(v[0])}${v[1] !== null && v[1] !== undefined ? ` [${pct(v[1])}, ${pct(v[2])}]` : ''}`
    : '—'

export function AlphaSleeveCard({ id, s }: { id: string; s: AlphaSleeveDTO }) {
  if (id === 'ARB') {
    return (
      <div className="rounded border p-3" data-testid="alpha-sleeve-ARB">
        <div className="flex items-baseline justify-between"><h3 className="t-section-title">ARB</h3><span className="t-label">paper</span></div>
        <p className="text-sm">{s.fills ?? 0} paper fills · locked profit {usd(s.plan_profit_locked)} on {usd(s.capital_locked)}</p>
        <p className="t-description">{s.note}</p>
      </div>
    )
  }
  return (
    <div className="rounded border p-3" data-testid={`alpha-sleeve-${id}`}>
      <div className="flex items-baseline justify-between">
        <h3 className="t-section-title">{id}</h3>
        <span className="t-label">{s.halted ? 'paper · drawdown stop' : 'paper'}</span>
      </div>
      <p className="text-2xl">{usd(s.equity)}</p>
      <p className="t-description">
        of {usd(s.allocation)} · realised {usd(s.realized_pnl)} · unrealised {usd(s.unrealized_pnl)} · {s.open_positions ?? 0} open,{' '}
        {s.open_orders ?? 0} resting bids · {s.settled ?? 0}/{s.target_n ?? 300} settled
      </p>
      <dl className="grid grid-cols-2 gap-x-3 text-sm mt-2">
        <dt className="t-label">P&amp;L per $ (95% CI)</dt><dd>{ci(s.pnl_per_usd_ci)}</dd>
        <dt className="t-label">Win rate vs break-even</dt><dd>{pct(s.win_rate)} vs {pct(s.break_even)}</dd>
        <dt className="t-label">CLV (mean)</dt><dd>{s.clv_mean === null || s.clv_mean === undefined ? '—' : `${(100 * s.clv_mean).toFixed(2)}¢`}</dd>
        <dt className="t-label">Brier vs mid</dt><dd>{s.brier ?? '—'} vs {s.brier_mid ?? '—'}</dd>
      </dl>
      {Object.keys(s.by_source ?? {}).length > 0 && (
        <table className="w-full text-sm mt-2" aria-label={`${id} by source`}>
          <thead><tr className="t-label text-left"><th>Source</th><th className="text-right">n</th><th className="text-right">P&amp;L</th><th className="text-right">per $</th><th className="text-right">win</th></tr></thead>
          <tbody>
            {Object.entries(s.by_source ?? {}).map(([k, v]) => (
              <tr key={k}><td>{k}</td><td className="text-right">{v.n}</td><td className="text-right">{usd(v.pnl)}</td>
                <td className="text-right">{pct(v.pnl_per_usd)}</td><td className="text-right">{pct(v.win_rate)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function AlphaPositions({ data }: { data: AlphaDTO }) {
  const rows = Object.entries(data.sleeves).flatMap(([id, s]) => (s.positions ?? []).map((p) => ({ id, ...p })))
  if (!rows.length) return <p className="t-description">No open ALPHA positions.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="ALPHA open positions">
        <thead><tr className="t-label text-left"><th className="pr-3">Sleeve</th><th className="pr-3">Market</th><th className="pr-3">Side</th>
          <th className="pr-3">Source</th><th className="pr-3">Exec</th><th className="pr-3 text-right">Entry</th><th className="pr-3 text-right">Mark</th>
          <th className="pr-3 text-right">p</th><th className="text-right">p_lcb</th></tr></thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={`${p.id}-${p.market}-${i}`} data-testid="alpha-position">
              <td className="pr-3">{p.id}</td><td className="pr-3 max-w-[22rem]">{p.question ?? p.market}</td><td className="pr-3">{p.side}</td>
              <td className="pr-3">{p.source}</td><td className="pr-3">{p.exec}</td><td className="pr-3 text-right">{p.entry.toFixed(3)}</td>
              <td className="pr-3 text-right">{p.mark === null || p.mark === undefined ? '—' : p.mark.toFixed(3)}</td>
              <td className="pr-3 text-right">{p.p_adj.toFixed(3)}</td><td className="text-right">{p.p_lcb.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ArchivedEpochs({ data }: { data: SleeveArchiveDTO }) {
  if (!data.archived.length) return <p className="t-description">No archived epochs.</p>
  return (
    <ul className="text-sm" data-testid="archived-epochs">
      {data.archived.map((a) => (
        <li key={`${a.sleeve_id}-${a.epoch}-${a.archived_at}`} className="mb-1">
          {a.sleeve_id} epoch {a.epoch} (closed {a.archived_at.slice(0, 16)}Z): realised {usd(a.final.realized_pnl)},{' '}
          state {a.final.state ?? '—'}; {a.moved_positions.length} moved positions
          ({a.moved_positions.filter((p) => p.status === 'settled').length} settled since, {usd(a.moved_settled_pnl)})
        </li>
      ))}
    </ul>
  )
}

export function AlphaSleevesPanel() {
  const slice = useAlpha(120_000)
  const arch = useSleeveArchive(600_000)
  const data = slice.status === 'success' ? slice.data : null
  return (
    <section aria-labelledby="alpha-sleeves" className="mb-6" data-testid="alpha-sleeves-panel">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 id="alpha-sleeves" className="t-section-title">ALPHA paper sleeves (simulated)</h2>
        <span className="t-description">{data?.ts ? `updated ${new Date(data.ts * 1000).toISOString().slice(0, 16)}Z` : ''}</span>
      </div>
      {data === null ? (
        <p className="t-description">{slice.status === 'error' ? 'The engine did not answer /api/alpha.' : 'Loading…'}</p>
      ) : !data.available ? (
        <p className="t-description">No ALPHA run published yet.</p>
      ) : (
        <>
          <p className="t-description mb-2">
            One pre-registered rule (sha256 {data.prereg_sha256?.slice(0, 12)}…): scanner rows with net edge ≥ 2¢ at the calibrated
            p_lcb, CONSERVATIVE sizing; paused sources: {(data.paused ?? []).map((p) => p.join(' ')).join(', ') || 'none'}.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {['ALPHA-EVENTS', 'ALPHA-CRYPTO', 'ARB'].map((k) => data.sleeves[k] && <AlphaSleeveCard key={k} id={k} s={data.sleeves[k]} />)}
          </div>
          <h3 className="t-section-title mt-4 mb-1">Open positions (p vs price)</h3>
          <AlphaPositions data={data} />
        </>
      )}
      <details className="mt-4" data-testid="archived-tab">
        <summary className="t-label cursor-pointer">Archived (legacy epochs)</summary>
        {arch.status === 'success' && arch.data ? <ArchivedEpochs data={arch.data} /> : <p className="t-description">Loading…</p>}
      </details>
    </section>
  )
}
