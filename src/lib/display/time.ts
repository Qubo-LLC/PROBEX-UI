// Clock formatting for records the engine timestamped.
//
// Every timestamp reaching these helpers is already epoch ms produced by
// `isoToMs` (the engine's naive clock is UTC — see services/dto.ts), and is
// rendered in the viewer's local time like every other clock in the product.
//
// ─── Why one module (2026-09-17) ─────────────────────────────────────────────
// Eight components carried an identical local `stamp` helper, and four tables
// printed a clock with no date on rows that were days old — a settlement from
// Sunday read "02:31 AM" as if it had happened this morning. The event log had
// already solved that (date in front once the row is not today); this is that
// rule, shared, plus the always-dated stamp the ledgers use.

const CLOCK: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
const CLOCK_SECONDS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' }
const DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }

export function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/**
 * "02:31 AM" on the day it happened, "Sep 15 · 02:31 AM" once it is not
 * today. A table that has been quiet since Sunday must not read as if
 * Sunday's rows happened this morning.
 */
export function clockOrDate(ts: number, now: number = Date.now(), opts: { seconds?: boolean } = {}): string {
  const d = new Date(ts)
  const time = d.toLocaleTimeString([], opts.seconds ? CLOCK_SECONDS : CLOCK)
  if (sameLocalDay(d, new Date(now))) return time
  return `${d.toLocaleDateString([], DAY)} · ${time}`
}

/** Always dated: "Sep 15, 02:31 AM". For ledgers whose rows span days. */
export function stamp(ts: number): string {
  return new Date(ts).toLocaleString([], { ...DAY, ...CLOCK })
}

/** "16m" / "2h 14m" / "42s" — a duration the engine reported in seconds. */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}
