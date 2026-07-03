// ─── Collection item parsing ──────────────────────────────────────────────────
//
// The four engine collections (markets, positions, edges, events) ship
// `unknown[]` items until the backend item schemas are confirmed (P0-01).
// Consoles must "naturally consume" the contract without fabricating rows,
// so every collection parse yields one of three truthful outcomes:
//
//   empty        — the engine reports zero items (designed empty state)
//   rows         — items arrived AND match the proposed DTO → render them
//   unrecognized — items arrived but do NOT match → say so, show the count,
//                  never guess at fields
//
// When Jake's serialization matches the proposals in the sibling mapper
// files, rows light up automatically with no code changes.

export type ParseResult<T> =
  | { kind: 'empty' }
  | { kind: 'rows'; rows: T[] }
  | { kind: 'unrecognized'; count: number }

export function parseItems<D, T>(
  items: unknown[],
  guard: (x: unknown) => x is D,
  map:   (dto: D) => T,
): ParseResult<T> {
  if (items.length === 0) return { kind: 'empty' }
  const rows: T[] = []
  for (const item of items) {
    if (!guard(item)) return { kind: 'unrecognized', count: items.length }
    rows.push(map(item))
  }
  return { kind: 'rows', rows }
}

// ── Field-check helpers for guards ────────────────────────────────────────────

export const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null

export const str = (x: unknown): x is string => typeof x === 'string'
export const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
