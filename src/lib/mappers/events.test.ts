import { describe, it, expect } from 'vitest'
import { parseEventRows, collapseConsecutiveRepeats, countByType } from './events'
import type { EngineEvents } from '@/types/engine'

// Shapes lifted from the live /api/events capture of 2026-09-15 (25 events,
// four types). Timestamps are the engine's naive form: no zone suffix.

const trade = (id: string, ts: string, tradeId: string, marketId: string) => ({
  id, type: 'trade', severity: 'info', title: 'Paper trade recorded',
  message: `Recorded paper trade ${tradeId} for ${marketId}`, timestamp: ts,
  metadata: { trade_id: tradeId, market_id: marketId, direction: 'YES', edge_pct: 79.95 },
})
const resolution = (id: string, ts: string, n: number) => ({
  id, type: 'resolution', severity: 'info', title: 'Paper trades resolved',
  message: `Resolved ${n} paper trade(s)`, timestamp: ts, metadata: { resolved_count: n },
})
const edge = (id: string, ts: string, marketId: string) => ({
  id, type: 'edge', severity: 'info', title: 'Edge detected', message: 'Detected 2 market edge(s)', timestamp: ts,
  metadata: { edges_detected: 2, top_edge_market_id: marketId, top_edge_pct: 19.95, top_edge_direction: 'NO' },
})

function envelope(events: unknown[]): EngineEvents {
  return { events, count: events.length, limit: 200, types: null, timestamp: 0 }
}

describe('parseEventRows', () => {
  it('parses the naive wire timestamp as UTC, not local time', () => {
    const r = parseEventRows(envelope([trade('a', '2026-09-14T23:15:31.385449', 'PAPER_20260914_0010', '0xa2')]))
    expect(r.kind).toBe('rows')
    if (r.kind !== 'rows') return
    expect(r.rows[0]!.timestamp).toBe(Date.UTC(2026, 8, 14, 23, 15, 31, 385))
  })

  it('honours an explicit zone when one is present', () => {
    const r = parseEventRows(envelope([trade('a', '2026-09-14T23:15:31Z', 'T', '0x1'), trade('b', '2026-09-14T20:15:31-03:00', 'T', '0x1')]))
    if (r.kind !== 'rows') throw new Error(r.kind)
    expect(r.rows[0]!.timestamp).toBe(r.rows[1]!.timestamp)
  })

  it('orders newest-first regardless of wire order, keeping wire order for ties', () => {
    const r = parseEventRows(envelope([
      trade('old', '2026-09-14T22:00:00', 'T1', '0x1'),
      trade('new', '2026-09-14T23:00:00', 'T2', '0x1'),
      trade('tie-a', '2026-09-14T22:30:00', 'T3', '0x1'),
      trade('tie-b', '2026-09-14T22:30:00', 'T4', '0x1'),
    ]))
    if (r.kind !== 'rows') throw new Error(r.kind)
    expect(r.rows.map((x) => x.id)).toEqual(['new', 'tie-a', 'tie-b', 'old'])
  })

  it('sinks rows with no usable timestamp to the end rather than inventing one', () => {
    const r = parseEventRows(envelope([
      { id: 'none', type: 'health', timestamp: 'not a date' },
      trade('t', '2026-09-14T22:00:00', 'T', '0x1'),
    ]))
    if (r.kind !== 'rows') throw new Error(r.kind)
    expect(r.rows.map((x) => x.id)).toEqual(['t', 'none'])
    expect(r.rows[1]!.timestamp).toBeNull()
  })

  it('recovers the market id from trade metadata and from the edge top-market field', () => {
    const r = parseEventRows(envelope([trade('t', '2026-09-14T22:00:00', 'T', '0xaaa'), edge('e', '2026-09-14T21:00:00', '0xbbb')]))
    if (r.kind !== 'rows') throw new Error(r.kind)
    expect(r.rows.map((x) => x.marketId)).toEqual(['0xaaa', '0xbbb'])
  })

  it('reports an empty window and an unrecognised item shape as such', () => {
    expect(parseEventRows(envelope([])).kind).toBe('empty')
    expect(parseEventRows(envelope([{ nope: true }])).kind).toBe('unrecognized')
  })
})

describe('collapseConsecutiveRepeats', () => {
  it('folds only ADJACENT identical events — separated repeats keep their own rows', () => {
    // The live log: four "Resolved 1 paper trade(s)" spread over fifty minutes
    // with trades and edges between them. The old whole-window dedup rendered
    // these as one ×4 row at the newest time.
    const r = parseEventRows(envelope([
      resolution('r1', '2026-09-14T23:31:45', 1),
      edge('e1', '2026-09-14T23:29:32', '0x1'),
      resolution('r2', '2026-09-14T23:14:10', 1),
      resolution('r3', '2026-09-14T23:12:26', 1),
      trade('t1', '2026-09-14T23:06:43', 'T', '0x2'),
      resolution('r4', '2026-09-14T22:41:35', 1),
    ]))
    if (r.kind !== 'rows') throw new Error(r.kind)
    const rows = collapseConsecutiveRepeats(r.rows)
    expect(rows.map((x) => [x.id, x.repeatCount])).toEqual([
      ['r1', 1], ['e1', 1], ['r2', 2], ['t1', 1], ['r4', 1],
    ])
    // The folded run keeps the newest occurrence and remembers its oldest.
    const run = rows[2]!
    expect(run.timestamp).toBe(Date.UTC(2026, 8, 14, 23, 14, 10))
    expect(run.firstTimestamp).toBe(Date.UTC(2026, 8, 14, 23, 12, 26))
  })

  it('does not fold events on different markets even when the text matches', () => {
    const r = parseEventRows(envelope([edge('a', '2026-09-14T23:29:32', '0x1'), edge('b', '2026-09-14T23:26:02', '0x2')]))
    if (r.kind !== 'rows') throw new Error(r.kind)
    expect(collapseConsecutiveRepeats(r.rows)).toHaveLength(2)
  })

  it('preserves order and leaves the input untouched', () => {
    const r = parseEventRows(envelope([resolution('a', '2026-09-14T23:00:00', 1), resolution('b', '2026-09-14T22:00:00', 1)]))
    if (r.kind !== 'rows') throw new Error(r.kind)
    const out = collapseConsecutiveRepeats(r.rows)
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe('a')
    expect(r.rows).toHaveLength(2)
  })
})

describe('countByType', () => {
  it('tallies in first-seen order', () => {
    const r = parseEventRows(envelope([
      resolution('a', '2026-09-14T23:00:00', 1), trade('b', '2026-09-14T22:00:00', 'T', '0x1'), trade('c', '2026-09-14T21:00:00', 'U', '0x1'),
    ]))
    if (r.kind !== 'rows') throw new Error(r.kind)
    expect(countByType(r.rows)).toEqual([{ type: 'resolution', count: 1 }, { type: 'trade', count: 2 }])
  })
})
