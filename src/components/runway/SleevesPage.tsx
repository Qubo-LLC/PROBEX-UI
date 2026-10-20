'use client'

// Capital & book — the sleeve-based paper trading, from /api/runway only.
//
// This page replaces Portfolio › Capital & Ledger, Positions and the Trade
// Ledger, all of which read the retired PaperTrader (/api/portfolio*,
// /api/balance, /api/positions, /api/positions/history, /api/trades/ledger).
// None of those figures appear on the dashboard any more.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { RunwayGroup } from './RunwayGroup'
import { ActivityList } from './ActivityList'
import { CurrentWindowPanel } from './CurrentWindowPanel'

export function SleevesPage({ title = 'Capital & book' }: { title?: string }) {
  return (
    <div className="page-container animate-fade-in-up">
      <PageHeader title={title} subtitle="The engine's sleeve ledgers — paper, research sizing" />
      <RunwayGroup />
      <OpenPositions />
      <CurrentWindowPanel />
      <ActivityList limit={500} />
    </div>
  )
}

export function OpenPositions() {
  const slice = useApplicationStore((s) => s.engine.runway)
  const runway = slice.status === 'success' ? slice.data : null
  const rows = runway ? runway.sleeves.flatMap((s) => s.positions.map((p) => ({ ...p, sleeveId: s.sleeveId }))) : null
  return (
    <section aria-labelledby="sleeve-positions" className="mt-6">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 id="sleeve-positions" className="t-section-title">Open positions</h2>
        <span className="t-description">Paper, research sizing · at cost</span>
      </div>
      {rows === null ? (
        <p className="t-description">{slice.status === 'error' ? 'The engine did not answer /api/runway.' : 'Loading…'}</p>
      ) : rows.length === 0 ? (
        <p className="t-description">No open positions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Open positions">
            <thead>
              <tr className="t-label text-left">
                <th className="py-1 pr-3">Sleeve</th><th className="py-1 pr-3">Market</th><th className="py-1 pr-3">Token</th>
                <th className="py-1 pr-3 text-right">Shares</th><th className="py-1 pr-3 text-right">Price</th>
                <th className="py-1 pr-3 text-right">Cost</th><th className="py-1 pr-3">Opened (UTC)</th><th className="py-1">Sizing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.positionId} data-testid="open-position">
                  <td className="py-1 pr-3">{p.sleeveId}</td>
                  <td className="py-1 pr-3">{p.marketId}</td>
                  <td className="py-1 pr-3">{p.token}</td>
                  <td className="py-1 pr-3 text-right">{p.shares}</td>
                  <td className="py-1 pr-3 text-right">{p.price.toFixed(2)}</td>
                  <td className="py-1 pr-3 text-right">{formatCurrency(p.shares * (p.price + p.feePerShare))}</td>
                  <td className="py-1 pr-3">{new Date(p.openedAtMs).toISOString().slice(11, 19)}</td>
                  <td className="py-1">{p.sizing === 'research' ? 'research' : 'risk'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
