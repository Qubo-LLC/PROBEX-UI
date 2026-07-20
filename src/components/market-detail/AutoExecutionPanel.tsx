'use client'

// AutoExecutionPanel — NEW component, not a V1 restore. V1's TradingDrawer /
// StakeInput / OutcomeSelector / TradeSummary / PositionPreview let a human
// manually place an order. PROBEX is not a betting site — trades are placed
// autonomously by the engine. This panel instead shows the engine's real
// auto-execution parameters for the current market: the live edge, whether
// it clears the configured min-edge threshold, and the Kelly-sized position
// the engine would take if it does. Every value is either read directly from
// /api/config + /api/survival (both confirmed, live) or derived from the
// current market's /api/edges row — nothing here is fabricated or editable.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency } from '@/lib/utils'
import type { EdgeRow } from '@/lib/mappers/edges'
import { Card } from '@/components/ui/Card'
import { AwaitingBackend } from '@/components/shared/AwaitingBackend'
import { RecommendationBadge } from '@/components/shared/RecommendationBadge'

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--probex-border)' }}>
      <span className="text-xs" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <span className="text-xs font-bold tabular-nums" style={{ color: accent ?? 'var(--probex-text-primary)' }}>{value}</span>
    </div>
  )
}

export function AutoExecutionPanel({ edge }: { edge: EdgeRow | undefined }) {
  const survivalSlice = useApplicationStore((s) => s.engine.survival)
  const survival = survivalSlice.status === 'success' ? survivalSlice.data : null

  if (!survival) {
    return (
      <AwaitingBackend
        title="Auto-Execution"
        description="The engine's live trade-decision parameters for this market — activates once /api/survival has loaded (min-edge threshold, Kelly modifier)."
        endpoint="survival"
      />
    )
  }

  const minEdgePct = survival.minEdgeThreshold * 100
  const wouldTrigger = edge !== undefined && edge.edgePct >= minEdgePct
  const kellySizePct = edge?.kellySize !== null && edge?.kellySize !== undefined
    ? edge.kellySize * survival.kellyModifier * 100
    : null
  const positionSize = kellySizePct !== null ? (kellySizePct / 100) * survival.currentCapital : null

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>Auto-Execution</h2>
        {edge?.recommendation && <RecommendationBadge recommendation={edge.recommendation} />}
      </div>

      {!edge ? (
        <p className="text-xs" style={{ color: 'var(--probex-text-disabled)' }}>
          No active edge on this market — the engine is not currently evaluating a trade here.
        </p>
      ) : (
        <div className="flex flex-col">
          <Row label="Current Edge" value={`${edge.edgePct.toFixed(1)}%`} accent={edge.direction === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)'} />
          <Row label="Min Edge Threshold" value={`${minEdgePct.toFixed(1)}%`} />
          <Row
            label="Would Trigger Trade"
            value={wouldTrigger ? 'Yes' : 'No'}
            accent={wouldTrigger ? 'var(--probex-yes)' : 'var(--probex-text-muted)'}
          />
          {kellySizePct !== null && (
            <Row label="Kelly Position Size" value={`${kellySizePct.toFixed(2)}% (${formatCurrency(positionSize ?? 0)})`} />
          )}
          {edge.confidence !== null && (
            <Row label="Engine Confidence" value={`${Math.round(edge.confidence * 100)}%`} />
          )}
          {edge.signal && <Row label="Source Signal" value={edge.signal} />}
        </div>
      )}

      <p className="text-2xs leading-relaxed pt-1" style={{ color: 'var(--probex-text-disabled)' }}>
        Trades are placed autonomously by the engine — this panel is read-only.
      </p>
    </Card>
  )
}
