'use client'

// The daily strategy ranking (scope §3B.6), from /api/strategies/ranking: status, n vs target, edge
// after fees with its CI, and capacity; ordered by status, then certainty tier, then edge x capacity.

import { useState } from 'react'

import { useEngineRanking, useResearchLedgers } from '@/config/hooks/useServices'
import type { RankingDTO, ResearchLedgersDTO } from '@/types/runway'

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
  const [tab, setTab] = useState<'active' | 'retired'>('active')
  return (
    <section aria-labelledby="strategy-ranking" className="mt-6" data-testid="ranking-panel">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 id="strategy-ranking" className="t-section-title">Strategy ranking</h2>
        <span className="t-description">{data ? `updated ${data.updated} · passed §8: ${data.passed.length ? data.passed.join(', ') : 'none'}` : ''}</span>
      </div>
      <div role="tablist" aria-label="Ranking view" className="flex gap-2 mb-2">
        {(['active', 'retired'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} data-testid={`ranking-tab-${t}`} onClick={() => setTab(t)}
            className={`px-2 py-0.5 rounded text-sm ${tab === t ? 'bg-white/10' : 'opacity-60'}`}>
            {t === 'active' ? `Active candidates (${data ? data.candidates.filter((c) => c.status !== 'retired').length : '…'})`
              : `Retired (paper record) (${data ? data.candidates.filter((c) => c.status === 'retired').length : '…'})`}
          </button>
        ))}
      </div>
      {data === null ? (
        <p className="t-description">{slice.status === 'error' ? 'The engine did not answer /api/strategies/ranking.' : 'Loading…'}</p>
      ) : <RankingTable data={splitRanking(data, tab)} />}
    </section>
  )
}

/** Active candidates (testing / passed) or the retired paper record; retired rows are never shown as live. */
export function splitRanking(data: RankingDTO, tab: 'active' | 'retired'): RankingDTO {
  return { ...data, candidates: data.candidates.filter((c) => (tab === 'retired') === (c.status === 'retired')) }
}

const GROUP_ORDER: Record<string, number> = { crypto: 0, arbitrage: 1, events: 2 }   // crypto first (operator, 6 Nov)

const pct = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${x >= 0 ? '+' : ''}${(100 * x).toFixed(2)}%`)

export function LedgersTable({ data }: { data: ResearchLedgersDTO }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Research ledgers">
        <thead>
          <tr className="t-label text-left">
            <th className="py-1 pr-3">Ledger</th><th className="py-1 pr-3">Group</th><th className="py-1 pr-3">Status</th><th className="py-1 pr-3 text-right">n / target</th>
            <th className="py-1 pr-3 text-right">Profit per $</th><th className="py-1 pr-3">95% CI</th><th className="py-1 pr-3 text-right">Fill rate</th><th className="py-1">Note</th>
          </tr>
        </thead>
        <tbody>
          {[...data.ledgers].sort((a, b) => (GROUP_ORDER[a.group ?? 'events'] ?? 2) - (GROUP_ORDER[b.group ?? 'events'] ?? 2)).map((l) => (
            <tr key={l.id} data-testid="ledger-row">
              <td className="py-1 pr-3" title={l.name}>{l.id}</td>
              <td className="py-1 pr-3">{l.group ?? 'events'}</td>
              <td className="py-1 pr-3">{l.status}</td>
              <td className="py-1 pr-3 text-right">{l.n} / {l.target}</td>
              <td className="py-1 pr-3 text-right" title={l.unit}>{pct(l.ev_per_dollar)}</td>
              <td className="py-1 pr-3">{l.ci && l.ci[0] !== null ? `[${pct(l.ci[0])}, ${pct(l.ci[1])}]` : '—'}</td>
              <td className="py-1 pr-3 text-right">{l.fill_rate === null || l.fill_rate === undefined ? '—' : `${(100 * l.fill_rate).toFixed(0)}%`}</td>
              <td className="py-1 max-w-[28rem]">{l.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LedgersPanel() {
  const slice = useResearchLedgers(300_000)
  const data = slice.status === 'success' ? slice.data : null
  return (
    <section aria-labelledby="research-ledgers" className="mt-6" data-testid="ledgers-panel">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 id="research-ledgers" className="t-section-title">Research ledgers (active candidates, paper)</h2>
        <span className="t-description">{data?.ts ? `updated ${new Date(data.ts * 1000).toISOString().slice(0, 16)}Z` : ''}</span>
      </div>
      {data === null ? (
        <p className="t-description">{slice.status === 'error' ? 'The engine did not answer /api/research/ledgers.' : 'Loading…'}</p>
      ) : !data.available ? <p className="t-description">No research ledgers published yet.</p> : <LedgersTable data={data} />}
    </section>
  )
}
