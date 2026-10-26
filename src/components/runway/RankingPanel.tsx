'use client'

// The daily strategy ranking (scope §3B.6), from /api/strategies/ranking: status, n vs target, edge
// after fees with its CI, and capacity; ordered by status, then certainty tier, then edge x capacity.

import { useEngineRanking } from '@/config/hooks/useServices'
import type { RankingDTO } from '@/types/runway'

const TIER: Record<string, string> = { structural: 'structural', risk_premium: 'risk premium', statistical: 'statistical', speed: 'speed' }

export function RankingTable({ data }: { data: RankingDTO }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Strategy ranking">
        <thead>
          <tr className="t-label text-left">
            <th className="py-1 pr-3">Strategy</th><th className="py-1 pr-3">Tier</th><th className="py-1 pr-3">Status</th>
            <th className="py-1 pr-3 text-right">n / target</th><th className="py-1 pr-3 text-right">Edge after fees</th>
            <th className="py-1 pr-3">95% CI</th><th className="py-1 pr-3 text-right">Capacity</th><th className="py-1">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {data.candidates.map((c) => (
            <tr key={c.id} data-testid="ranking-row">
              <td className="py-1 pr-3">{c.id}</td>
              <td className="py-1 pr-3">{TIER[c.tier] ?? c.tier}</td>
              <td className="py-1 pr-3">{c.status}</td>
              <td className="py-1 pr-3 text-right">{c.n ?? '—'}{c.target_n ? ` / ${c.target_n}` : ''}</td>
              <td className="py-1 pr-3 text-right">{c.edge_cents === null ? '—' : `${c.edge_cents >= 0 ? '+' : ''}${c.edge_cents.toFixed(2)}¢`}</td>
              <td className="py-1 pr-3">{c.ci_cents ? `[${c.ci_cents[0].toFixed(2)}, ${c.ci_cents[1].toFixed(2)}]` : '—'}</td>
              <td className="py-1 pr-3 text-right">{c.capacity_usd_day === null ? '—' : `$${c.capacity_usd_day}/day`}</td>
              <td className="py-1 max-w-[28rem]">{c.evidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RankingPanel() {
  const slice = useEngineRanking(300_000)
  const data = slice.status === 'success' ? slice.data : null
  return (
    <section aria-labelledby="strategy-ranking" className="mt-6" data-testid="ranking-panel">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 id="strategy-ranking" className="t-section-title">Strategy ranking</h2>
        <span className="t-description">{data ? `updated ${data.updated} · passed §8: ${data.passed.length ? data.passed.join(', ') : 'none'}` : ''}</span>
      </div>
      {data === null ? (
        <p className="t-description">{slice.status === 'error' ? 'The engine did not answer /api/strategies/ranking.' : 'Loading…'}</p>
      ) : <RankingTable data={data} />}
    </section>
  )
}
