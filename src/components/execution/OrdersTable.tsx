'use client'

// OrdersTable — /api/execution/orders, previously polled into the store and
// never rendered. This is also where Cancel Order finally gets a surface: the
// mutation was wired in Phase 2 but had nothing to attach to.
//
// Both order arrays are empty today because /api/execution/orders tracks real
// order-submission activity — confirmed via its sibling rate-limit bucket
// (order_submit: 0 total_requests) — and the engine is currently in PAPER mode,
// so no real orders are ever submitted. This is expected, not a backend bug;
// it populates once live trading is enabled (see docs/API_AUDIT.md §0.10).
// Columns are derived from the rows at runtime — the item schema has never
// been observed, and guessing field names is exactly what previously caused
// live position data to be silently discarded.

import { useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { useCancelOrder, MUTATIONS } from '@/config/hooks/useMutation'
import { MutationButton } from './MutationButton'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'

type Scope = 'active' | 'closed'

/** Pulls a plausible id out of an unknown row so Cancel has something to target. */
function rowId(row: Record<string, unknown>): string | null {
  for (const key of ['order_id', 'id', 'market_id']) {
    const v = row[key]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}

export function OrdersTable() {
  const slice          = useApplicationStore((s) => s.engine.executionOrders)
  const executionSlice = useApplicationStore((s) => s.engine.executionStatus)
  const [scope, setScope] = useState<Scope>('active')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const orders = slice.status === 'success' ? slice.data : null
  const rows = (scope === 'active' ? orders?.activeOrders : orders?.closedOrders) ?? []
  const objects = rows.filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
  const mode = executionSlice.status === 'success' ? (executionSlice.data?.mode ?? null) : null

  const cancelMutation = useCancelOrder(selectedId)

  const activeCount = orders?.activeCount ?? 0
  const closedCount = orders?.closedCount ?? 0
  const columns = objects.length > 0 ? Object.keys(objects[0]!) : []

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Orders</h2>
          <p className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            {activeCount} active · {closedCount} closed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-md overflow-hidden" style={{ border: '1px solid var(--probex-border-default)' }} role="group" aria-label="Order scope">
            {(['active', 'closed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setScope(s); setSelectedId(null) }}
                aria-pressed={scope === s}
                className="px-3 py-1 text-2xs font-semibold capitalize cursor-pointer transition-colors duration-150 focus-ring"
                style={scope === s
                  ? { background: 'var(--probex-accent)', color: '#fff' }
                  : { background: 'transparent', color: 'var(--probex-text-muted)' }}
              >
                {s}
              </button>
            ))}
          </div>
          <ProvenanceBadge provenance="live" detail="/api/execution/orders" />
        </div>
      </div>

      {objects.length > 0 ? (
        <>
          <TableShell label={`${scope} orders`}>
            <Thead>
              {columns.map((c) => <Th key={c} align="left">{c.replace(/_/g, ' ')}</Th>)}
              {scope === 'active' && <Th align="right">Action</Th>}
            </Thead>
            <tbody>
              {objects.slice(0, 30).map((row, i) => {
                const id = rowId(row)
                return (
                  <Tr key={id ?? i}>
                    {columns.map((c) => {
                      const v = row[c]
                      return (
                        <Td key={c} align="left">
                          <span className="tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>
                            {v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        </Td>
                      )
                    })}
                    {scope === 'active' && (
                      <Td align="right">
                        <button
                          onClick={() => setSelectedId(id)}
                          disabled={id === null}
                          className="text-2xs font-semibold px-2 py-0.5 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
                          style={{ color: 'var(--probex-negative)', border: '1px solid var(--probex-negative)' }}
                        >
                          Select
                        </button>
                      </Td>
                    )}
                  </Tr>
                )
              })}
            </tbody>
          </TableShell>

          {scope === 'active' && selectedId !== null && (
            <div className="p-4" style={{ borderTop: '1px solid var(--probex-border)' }}>
              <MutationButton
                mutation={cancelMutation}
                label="Cancel Order"
                tone="danger"
                size="sm"
                confirmTitle="Cancel this order?"
                confirmDescription={`Cancels pending order ${selectedId}. The engine will stop trying to fill it.`}
                endpoint={MUTATIONS.cancelOrder.endpoint}
              />
            </div>
          )}
        </>
      ) : (
        <p className="text-2xs leading-relaxed p-4" style={{ color: 'var(--probex-text-disabled)' }}>
          {mode === 'paper'
            ? <>No {scope} orders — the engine is in <strong>paper mode</strong>, so no real orders are submitted to the exchange. This endpoint tracks live order-submission activity specifically; it will populate once live trading is enabled.</>
            : <>No {scope} orders. <span className="mono">/api/execution/orders</span> responds correctly but both lists are empty.</>}
        </p>
      )}
    </div>
  )
}
