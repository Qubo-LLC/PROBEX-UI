'use client'

// ConsensusHistoryChart — the consensus score's trajectory over the session.
// Originally CE-3 (no backend). 2026-07-22: /api/consensus/history is live —
// rendered via the shared LiveChart primitive.

import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import { chartStateFromSlice } from '@/components/shared/ChartFrame'
import { READING_STALE_AFTER_MS } from '@/lib/display/consensus'

export function ConsensusHistoryChart() {
  const slice = useApplicationStore((s) => s.engine.consensusHistory)
  const data: LiveChartPoint[] = slice.status === 'success' && slice.data
    ? slice.data.history.map((p) => ({ tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: p.score }))
    : []

  // Real state, not just "has rows": an errored slice is unavailable and an
  // available:false envelope is idle — both look like zero rows otherwise.
  const { state: sliceState, message } = chartStateFromSlice(slice, data.length)

  // The series ends at the newest SNAPSHOT, not at the poll. A poll that
  // succeeds every 30s over a series whose last point is a day old is not a
  // live chart; the frame's own stale state carries the age of that point.
  const newestTs = slice.data?.history.length ? slice.data.history[slice.data.history.length - 1]!.ts : undefined
  const readingStale = newestTs !== undefined && Date.now() - newestTs > READING_STALE_AFTER_MS
  const state = sliceState === 'live' && readingStale ? 'stale' : sliceState

  return (
    <LiveChart
      title="Score over the recorded snapshots"
      subtitle="the engine’s composite, one point per reading it computed"
      state={state}
      message={message}
      {...(newestTs !== undefined ? { lastConfirmedAt: newestTs } : {})}
      source="/api/consensus/history"
      data={data}
      variant="line"
      color="var(--synatra-primary)"
      yTickFormatter={(v) => v.toFixed(1)}
      valueFormatter={(v) => v.toFixed(3)}
      emptyTitle="No consensus history yet"
      emptyDescription="Populates as the engine's consensus score updates each cycle."
    />
  )
}
