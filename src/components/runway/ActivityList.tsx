'use client'

// Recent sleeve activity: P2 orders (filled, or cancelled with the reason) and
// settlements with per-trade PnL, newest first. A window's orders appear here
// once it has closed and been simulated.

import { useApplicationStore } from '@/store/applicationStore'
import { formatSignedCurrency } from '@/lib/utils'
import type { Activity } from '@/types/runway'

const KIND: Record<Activity['kind'], string> = {
  order_filled: 'Filled',
  order_cancelled: 'Cancelled',
  settlement: 'Settled',
}

export function ActivityList({ limit = 50 }: { limit?: number }) {
  const slice = useApplicationStore((s) => s.engine.runway)
  const rows = slice.status === 'success' && slice.data ? slice.data.activity.slice(0, limit) : null

  return (
    <section aria-labelledby="runway-activity" className="mt-6">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 id="runway-activity" className="t-section-title">Activity</h2>
        <span className="t-description">Paper, research sizing · newest first</span>
      </div>
      {rows === null ? (
        <p className="t-description">{slice.status === 'error' ? 'The engine did not answer /api/runway.' : 'Loading…'}</p>
      ) : rows.length === 0 ? (
        <p className="t-description">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Recent activity">
            <thead>
              <tr className="t-label text-left">
                <th className="py-1 pr-3">Time (UTC)</th>
                <th className="py-1 pr-3">Sleeve</th>
                <th className="py-1 pr-3">Window</th>
                <th className="py-1 pr-3">Token</th>
                <th className="py-1 pr-3">Event</th>
                <th className="py-1 pr-3 text-right">Price</th>
                <th className="py-1 pr-3 text-right">Shares</th>
                <th className="py-1 text-right">PnL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={`${a.tsMs}-${a.positionId ?? i}-${a.kind}`} data-testid={`activity-${a.kind}`}>
                  <td className="py-1 pr-3">{new Date(a.tsMs).toISOString().slice(11, 19)}</td>
                  <td className="py-1 pr-3">{a.sleeveId}</td>
                  <td className="py-1 pr-3">{a.window ?? '—'}</td>
                  <td className="py-1 pr-3">{a.token ?? '—'}</td>
                  <td className="py-1 pr-3">
                    {KIND[a.kind]}
                    {a.kind === 'order_cancelled' && a.cancelReason && <span className="t-description"> · {a.cancelReason.replace('_', ' ')}</span>}
                    {a.kind === 'settlement' && a.outcome && <span className="t-description"> · {a.outcome}</span>}
                  </td>
                  <td className="py-1 pr-3 text-right">{a.price !== null ? a.price.toFixed(2) : '—'}</td>
                  <td className="py-1 pr-3 text-right">{a.shares ?? '—'}</td>
                  <td className="py-1 text-right"
                      style={{ color: a.pnl === null ? undefined : a.pnl > 0 ? 'var(--synatra-positive)' : a.pnl < 0 ? 'var(--synatra-negative)' : undefined }}>
                    {a.pnl !== null ? formatSignedCurrency(a.pnl) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
