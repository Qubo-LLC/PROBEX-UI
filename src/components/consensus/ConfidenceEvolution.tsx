'use client'

// ConfidenceEvolution — how the engine's confidence in its consensus read has
// moved over the session. Originally CE-4 (no backend). 2026-07-22:
// /api/consensus/history carries a `confidence` value per snapshot — this is
// exactly that series, rendered via the shared LiveChart primitive.

import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'

export function ConfidenceEvolution() {
  const slice = useApplicationStore((s) => s.engine.consensusHistory)
  const data: LiveChartPoint[] = slice.status === 'success' && slice.data
    ? slice.data.history.map((p) => ({ tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: p.confidence }))
    : []

  return (
    <LiveChart
      title="Confidence Evolution"
      subtitle="Consensus confidence over the session"
      source="/api/consensus/history"
      data={data}
      variant="area"
      color="var(--probex-primary)"
      yTickFormatter={(v) => `${Math.round(v * 100)}%`}
      valueFormatter={(v) => `${(v * 100).toFixed(1)}%`}
      emptyTitle="No confidence history yet"
      emptyDescription="Populates as the engine's consensus signal updates each cycle."
    />
  )
}
