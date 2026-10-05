'use client'

// ConfidenceEvolution — how the engine's confidence in its consensus read has
// moved over the session. Originally CE-4 (no backend). 2026-07-22:
// /api/consensus/history carries a `confidence` value per snapshot — this is
// exactly that series, rendered via the shared LiveChart primitive.

import { useApplicationStore } from '@/store/applicationStore'
import { LiveChart, type LiveChartPoint } from '@/components/shared/LiveChart'
import { chartStateFromSlice } from '@/components/shared/ChartFrame'
import { READING_STALE_AFTER_MS } from '@/lib/display/consensus'

export function ConfidenceEvolution() {
  const slice = useApplicationStore((s) => s.engine.consensusHistory)
  const data: LiveChartPoint[] = slice.status === 'success' && slice.data
    ? slice.data.history.map((p) => ({ tick: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: p.confidence }))
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
      title="Confidence over the recorded snapshots"
      subtitle="the engine’s own confidence in each reading"
      state={state}
      message={message}
      {...(newestTs !== undefined ? { lastConfirmedAt: newestTs } : {})}
      source="/api/consensus/history"
      data={data}
      variant="area"
      color="var(--synatra-primary)"
      yTickFormatter={(v) => `${Math.round(v * 100)}%`}
      valueFormatter={(v) => `${(v * 100).toFixed(1)}%`}
      emptyTitle="No confidence history yet"
      emptyDescription="Populates as the engine's consensus signal updates each cycle."
    />
  )
}
