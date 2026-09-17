// Markets › Live presentation helpers.
//
// ─── What the Live tab is (live-read 2026-09-17) ─────────────────────────────
// /api/markets is the engine's CURRENT SCAN: the markets its fetcher holds
// right now, each with the question, both prices, the close time, the volume,
// the tier and the category. It has answered `count: 0` for days while the
// main loop reports itself running — a scan that found nothing is a fact
// about the market cycle, not a failure. The archive (/api/markets/history/
// summary) holds the 19 markets the engine has recorded, the newest snapshot
// from 2026-09-14; those are records, never current markets.
//
// So an empty scan must be reported as exactly that — the scanner's state,
// the time the scan was read, and where the recorded markets live — rather
// than as "no markets exist" or, worse, as the archive dressed up as live.

import type { HealthComponent } from '@/types/engine'

// ─── Scanner ──────────────────────────────────────────────────────────────────

/** The component /api/health names for the engine's scan loop. */
export const SCANNER_COMPONENT = 'main_loop'

export type ScannerReading =
  | { kind: 'running'; message: string }
  | { kind: 'unhealthy'; message: string }
  | { kind: 'unknown' }

/** What the health check says about the loop that fills the scan. Only the
 *  named component is read; nothing is inferred from the overall status. */
export function scannerReading(components: readonly HealthComponent[] | null): ScannerReading {
  const c = components?.find((x) => x.name === SCANNER_COMPONENT)
  if (c === undefined) return { kind: 'unknown' }
  return c.healthy ? { kind: 'running', message: c.message } : { kind: 'unhealthy', message: c.message }
}

// ─── The empty scan, in words ─────────────────────────────────────────────────

export interface ArchiveSummary {
  count: number
  /** The newest last_snapshot across the archive, epoch ms; null when empty. */
  newest: number | null
}

/** One sentence for a scan that holds nothing. Every clause is a fact from a
 *  named record; a record that has not answered contributes no clause. */
export function emptyScanSentence(
  scanner: ScannerReading,
  archive: ArchiveSummary | null,
  formatWhen: (ms: number) => string,
): string {
  const parts: string[] = ['The engine’s scan holds no market right now.']
  if (scanner.kind === 'running') parts.push('Its scan loop reports itself running, so the list fills the moment the fetcher returns a qualifying market.')
  else if (scanner.kind === 'unhealthy') parts.push(`Its scan loop reports a problem — ${scanner.message} — so the list may not fill until that clears.`)
  if (archive !== null) {
    if (archive.count === 0) parts.push('The archive holds no recorded market either.')
    else if (archive.newest !== null) parts.push(`The archive holds ${archive.count} recorded market${archive.count === 1 ? '' : 's'}, the newest last seen ${formatWhen(archive.newest)} — records, not current markets.`)
    else parts.push(`The archive holds ${archive.count} recorded market${archive.count === 1 ? '' : 's'} — records, not current markets.`)
  }
  return parts.join(' ')
}
