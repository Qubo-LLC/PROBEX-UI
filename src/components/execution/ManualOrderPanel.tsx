'use client'

// ManualOrderPanel — operator-placed orders via POST /api/execution/create.
//
// The engine normally decides for itself; this is the override. Two design
// choices follow from that:
//
//   1. Market selection is a picker over live edges, not a free-text field.
//      A market id is a 66-character hex string — typing one is a transcription
//      error waiting to happen, and choosing from detected edges means the
//      direction/edge/confidence fields can be prefilled from the engine's own
//      analysis rather than invented by the operator.
//   2. Preview is a first-class step. The endpoint supports `preview_only`,
//      so the operator can see what the engine would do before committing.
//      Preview is the unconfirmed action; only Place Order asks to confirm.

import { useMemo, useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { useCreateOrder, MUTATIONS } from '@/config/hooks/useMutation'
import { MutationButton } from './MutationButton'
import { parseEdgeRows } from '@/lib/mappers/edges'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import type { CreateOrderInput } from '@/lib/services/interfaces'

const DEFAULT_SIZE_USD = 5

export function ManualOrderPanel() {
  const edgesSlice  = useApplicationStore((s) => s.engine.edges)
  const configSlice = useApplicationStore((s) => s.engine.config)

  const [marketId, setMarketId] = useState<string>('')
  const [sizeUsd,  setSizeUsd]  = useState<number>(DEFAULT_SIZE_USD)

  /** Only edges carrying a market id are selectable — an order cannot be
   *  addressed without one, so a row missing it is filtered out rather than
   *  offered and then rejected at submit. */
  const edges = useMemo(() => {
    if (edgesSlice.status !== 'success' || edgesSlice.data === null) return []
    const parsed = parseEdgeRows(edgesSlice.data)
    if (parsed.kind !== 'rows') return []
    return parsed.rows.filter((r): r is typeof r & { marketId: string } => r.marketId !== null)
  }, [edgesSlice])

  const selected = edges.find((e) => e.marketId === marketId) ?? null

  // Sizing guardrail comes from the engine's own config, not a magic number.
  // NOTE: config.maxBetPercent is on a 0–100 scale (the wire sends 20 for 20%),
  // unlike kellyFraction which is a 0–1 fraction. Divide before applying.
  const config     = configSlice.status === 'success' ? configSlice.data : null
  const bankroll   = config?.initialBankroll ?? null
  const maxBetPct  = config?.maxBetPercent ?? null
  const maxSize    = bankroll !== null && maxBetPct !== null ? bankroll * (maxBetPct / 100) : null
  const overLimit  = maxSize !== null && sizeUsd > maxSize
  const sizeValid  = Number.isFinite(sizeUsd) && sizeUsd > 0

  // Direction, edge and confidence are the engine's readings for the selected
  // market — the operator picks the market, not the analysis.
  const input: CreateOrderInput | null = selected && sizeValid
    ? {
        marketId:   selected.marketId,
        direction:  selected.direction.toUpperCase() === 'NO' ? 'NO' : 'YES',
        sizeUsd,
        edgePct:    selected.edgePct,
        confidence: selected.confidence ?? 0,
      }
    : null

  const previewMutation = useCreateOrder(input ? { ...input, previewOnly: true } : null)
  const placeMutation   = useCreateOrder(input ? { ...input, previewOnly: false } : null)

  const blocked =
    input === null ? 'Select a market and enter a valid size.' :
    overLimit      ? `Size exceeds the engine's configured max bet of ${maxSize?.toFixed(2)} USD.` :
    undefined

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}>
      <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>
            Manual Order
          </h2>
          <p className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            Override the engine and place an order against a detected edge
          </p>
        </div>
        <ProvenanceBadge provenance="live" detail="/api/execution/create" />
      </div>

      <div className="p-4 flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs uppercase tracking-wider font-semibold" style={{ color: 'var(--probex-text-muted)' }}>Market</span>
          <select
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
            className="rounded-md px-2.5 py-2 text-xs focus-ring cursor-pointer"
            style={{ background: 'var(--probex-surface-2)', color: 'var(--probex-text-primary)', border: '1px solid var(--probex-border-default)' }}
          >
            <option value="">
              {edges.length > 0 ? `Select from ${edges.length} detected edge${edges.length === 1 ? '' : 's'}…` : 'No edges detected right now'}
            </option>
            {edges.map((e) => (
              <option key={e.marketId} value={e.marketId}>
                {e.direction.toUpperCase()} · {e.edgePct.toFixed(1)}% edge · {e.marketTitle ?? e.marketId.slice(0, 12)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-2xs uppercase tracking-wider font-semibold" style={{ color: 'var(--probex-text-muted)' }}>Size (USD)</span>
          <input
            type="number" min={0} step={0.5} value={sizeUsd}
            onChange={(e) => setSizeUsd(Number(e.target.value))}
            className="rounded-md px-2.5 py-2 text-xs tabular-nums focus-ring"
            style={{
              background: 'var(--probex-surface-2)',
              color: 'var(--probex-text-primary)',
              border: `1px solid ${overLimit ? 'var(--probex-negative)' : 'var(--probex-border-default)'}`,
            }}
          />
          {maxSize !== null && (
            <span className="text-2xs" style={{ color: overLimit ? 'var(--probex-negative)' : 'var(--probex-text-disabled)' }}>
              Engine max bet: ${maxSize.toFixed(2)} ({maxBetPct}% of ${bankroll?.toFixed(2)} bankroll)
            </span>
          )}
        </label>

        {selected && (
          <div className="rounded-lg p-2.5 flex flex-wrap gap-x-5 gap-y-1" style={{ background: 'var(--probex-surface-2)' }}>
            <Reading label="Direction"  value={selected.direction.toUpperCase()} />
            <Reading label="Edge"       value={`${selected.edgePct.toFixed(2)}%`} />
            <Reading label="Confidence" value={selected.confidence !== null ? `${(selected.confidence * 100).toFixed(0)}%` : '—'} />
            <span className="text-2xs w-full" style={{ color: 'var(--probex-text-disabled)' }}>
              Values read from the engine's current edge for this market.
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <MutationButton
            mutation={previewMutation}
            label="Preview"
            tone="neutral"
            skipConfirm
            disabled={input === null || overLimit}
            disabledReason={blocked}
            endpoint={MUTATIONS.createOrder.endpoint}
          />
          <MutationButton
            mutation={placeMutation}
            label="Place Order"
            tone="danger"
            disabled={input === null || overLimit}
            confirmTitle="Place this order?"
            confirmDescription={
              input
                ? `Places a ${input.direction} order for $${input.sizeUsd.toFixed(2)} on "${selected?.marketTitle ?? input.marketId}" ` +
                  `at a detected edge of ${input.edgePct.toFixed(2)}%. This bypasses the engine's own entry criteria.`
                : ''
            }
            endpoint={MUTATIONS.createOrder.endpoint}
          />
        </div>
      </div>
    </div>
  )
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-2xs uppercase tracking-wider" style={{ color: 'var(--probex-text-disabled)' }}>{label}</span>
      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--probex-text-primary)' }}>{value}</span>
    </span>
  )
}
