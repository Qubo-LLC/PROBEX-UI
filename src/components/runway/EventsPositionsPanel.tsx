'use client'

// Events positions — every EVENTS sleeve position of the current epoch, open or
// settled, from /api/sleeves/events/positions. Read-only: the market question and
// link, strategy, side, entry, size, cost, the current market price (Gamma), the
// unrealized PnL (open) or realized PnL (settled), and the resolution date.

import { useEngineEventsPositions, useGateRecords } from '@/config/hooks/useServices'
import type { GateRecordDTO } from '@/types/runway'
import { formatCurrency } from '@/lib/utils'
import type { EventsPositions } from '@/types/runway'

const STRATEGY: Record<string, string> = { e_cal: 'E-CAL', e_mm: 'E-MM', e_arb: 'E-ARB' }

function pnl(v: number | null) {
  if (v === null) return '—'
  const cls = v > 0 ? 'text-[var(--color-positive,#16a34a)]' : v < 0 ? 'text-[var(--color-negative,#dc2626)]' : ''
  return <span className={cls}>{v >= 0 ? '+' : '−'}{formatCurrency(Math.abs(v))}</span>
}

/** The gate's decision for a position's market: booked or rejected, the deciding reason and the net edge at p_lcb. */
function gateCell(r: GateRecordDTO | undefined) {
  if (!r) return '—'
  const net = r.net_edge === null ? '' : ` · net ${r.net_edge >= 0 ? '+' : ''}${(100 * r.net_edge).toFixed(2)}¢`
  return `${r.decision}: ${r.reason.replace(/_/g, ' ')}${net}`
}

export function EventsPositionsTable({ data, gate = {} }: { data: EventsPositions; gate?: Record<string, GateRecordDTO> }) {
  return (
    <>
      <p className="t-description mb-2" data-testid="events-positions-summary">
        {data.open} open · cost {formatCurrency(data.openCost)} · unrealized {data.unrealizedPnl >= 0 ? '+' : '−'}
        {formatCurrency(Math.abs(data.unrealizedPnl))} · {data.settled} settled · realized{' '}
        {data.realizedPnl >= 0 ? '+' : '−'}{formatCurrency(Math.abs(data.realizedPnl))}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Events positions">
          <thead>
            <tr className="t-label text-left">
              <th className="py-1 pr-3">Market</th><th className="py-1 pr-3">Strategy</th><th className="py-1 pr-3">Side</th>
              <th className="py-1 pr-3 text-right">Entry</th><th className="py-1 pr-3 text-right">Size</th>
              <th className="py-1 pr-3 text-right">Cost</th><th className="py-1 pr-3 text-right">Price now</th>
              <th className="py-1 pr-3 text-right">PnL</th><th className="py-1 pr-3">Resolves (UTC)</th><th className="py-1 pr-3">Status</th><th className="py-1">Gate (recommendation)</th>
            </tr>
          </thead>
          <tbody>
            {data.positions.map((p) => (
              <tr key={p.positionId} data-testid="events-position">
                <td className="py-1 pr-3 max-w-[22rem]">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="underline">{p.question ?? p.marketId}</a>
                  ) : (p.question ?? p.marketId)}
                </td>
                <td className="py-1 pr-3">{STRATEGY[p.strategyId ?? ''] ?? p.strategyId ?? '—'}</td>
                <td className="py-1 pr-3">{p.side}</td>
                <td className="py-1 pr-3 text-right">{p.entryPrice.toFixed(3)}</td>
                <td className="py-1 pr-3 text-right">{p.shares}</td>
                <td className="py-1 pr-3 text-right">{formatCurrency(p.cost)}</td>
                <td className="py-1 pr-3 text-right">{p.currentPrice === null ? '—' : p.currentPrice.toFixed(3)}</td>
                <td className="py-1 pr-3 text-right">{pnl(p.status === 'open' ? p.unrealizedPnl : p.realizedPnl)}</td>
                <td className="py-1 pr-3">{p.resolutionDate ? p.resolutionDate.slice(0, 10) : '—'}</td>
                <td className="py-1 pr-3">{p.status === 'open' ? 'open' : `settled${p.outcome ? ` (${p.outcome})` : ''}`}</td>
                <td className="py-1 max-w-[18rem]" data-testid="gate-cell">{gateCell(gate[p.marketId])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="t-description mt-1">Paper · prices: {data.priceSource} · PnL at the current price, before exit costs</p>
    </>
  )
}

export function EventsPositionsPanel() {
  const slice = useEngineEventsPositions(60_000)
  const data = slice.status === 'success' ? slice.data : null
  const gs = useGateRecords(120_000)
  const gate: Record<string, GateRecordDTO> = {}
  if (gs.status === 'success' && gs.data) for (const r of gs.data.records) if (r.sleeve_id === 'EVENTS') gate[r.market_id] ??= r
  return (
    <section aria-labelledby="events-positions" className="mt-6" data-testid="events-positions-panel">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 id="events-positions" className="t-section-title">Events positions</h2>
        <span className="t-description">EVENTS sleeve · read-only</span>
      </div>
      {data === null ? (
        <p className="t-description">
          {slice.status === 'error' ? 'The engine did not answer /api/sleeves/events/positions.' : 'Loading…'}
        </p>
      ) : data.positions.length === 0 ? (
        <p className="t-description">No EVENTS positions in this epoch.</p>
      ) : (
        <EventsPositionsTable data={data} gate={gate} />
      )}
    </section>
  )
}
