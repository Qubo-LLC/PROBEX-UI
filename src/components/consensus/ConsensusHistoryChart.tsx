'use client'

// ConsensusHistoryChart — the consensus score's trajectory over the session.
// Originally CE-3 (no backend). 2026-07-22: /api/consensus/history is live —
// rendered via the shared LiveChart primitive.

import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'

export function ConsensusHistoryChart() {
  const slice = useApplicationStore((s) => s.engine.consensusHistory)
  const data: LiveChartPoint[] = slice.status === 'success' && slice.data
    ? slice.data.history.map((p) => ({ tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: p.score }))
    : []

  return (
    <LiveChart
      title="Consensus History"
      subtitle="Platform-wide consensus score over the session"
      source="/api/consensus/history"
      data={data}
      variant="line"
      color="var(--probex-primary)"
      yTickFormatter={(v) => v.toFixed(1)}
      valueFormatter={(v) => v.toFixed(3)}
      emptyTitle="No consensus history yet"
      emptyDescription="Populates as the engine's consensus score updates each cycle."
    />
  )
}
