'use client'

// TradeDetail — one trade record and what became of it
// (remediation spec Part 1 §8, §12). Every line is a field the engine reported
// or an explicit "not modelled / not reported"; nothing is reconstructed.

import { Dialog } from '@/components/ui/Dialog'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { stamp } from '@/lib/display/time'
import { openedAfterClose, relationshipFor, statusLabel } from '@/lib/display/ledgerView'
import type { LedgerItem } from '@/types/ledger'

const STEP_TONE: Record<string, string> = {
  'recorded':     'var(--synatra-text-primary)',
  'pending':      'var(--synatra-text-secondary)',
  'not-modelled': 'var(--synatra-text-muted)',
  'not-reported': 'var(--synatra-text-muted)',
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1" style={{ borderTop: '1px solid var(--synatra-border)' }}>
      <dt className="t-metadata">{label}</dt>
      <dd className="font-mono text-xs text-right break-all" style={{ color: value === null ? 'var(--synatra-text-muted)' : 'var(--synatra-text-primary)' }}>
        {value ?? 'not reported'}
      </dd>
    </div>
  )
}

export function TradeDetail({ item, onClose, engineMode }: { item: LedgerItem | null; onClose: () => void; engineMode: string | null }) {
  if (!item) return null
  const afterClose = openedAfterClose(item)
  const cents = (v: number | null) => (v === null ? null : `${v.toFixed(1)}¢`)

  return (
    <Dialog open onClose={onClose} title={item.tradeId ?? `Trade on ${item.assetSymbol ?? 'market'}${item.durationMinutes ? ` ${item.durationMinutes}m` : ''}`} size="lg"
      description={statusLabel(item)}>
      <div className="flex flex-col gap-5">
        {afterClose === true && (
          <p role="status" className="t-description" style={{ color: 'var(--synatra-warning)' }}>
            Opened at or after its market&rsquo;s recorded close time — not a legitimate entry.
          </p>
        )}

        <section aria-label="Trade to P&L">
          <h3 className="t-label mb-2">What happened</h3>
          <ol className="flex flex-col gap-1.5 m-0 p-0 list-none">
            {relationshipFor(item, engineMode).map((s) => (
              <li key={s.step} className="flex gap-3 text-xs">
                <span className="t-label w-20 flex-shrink-0">{s.step}</span>
                <span style={{ color: STEP_TONE[s.status] }}>{s.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <dl className="m-0">
          <Field label="Market" value={item.marketQuestion ?? item.marketId} />
          <Field label="Market id" value={item.marketId} />
          <Field label="Market close (recorded at entry)" value={item.marketClosesAt !== null ? stamp(item.marketClosesAt) : null} />
          <Field label="Side" value={item.direction.toUpperCase()} />
          <Field label="Opened" value={stamp(item.openedAt)} />
          <Field label="Stake" value={item.sizeUsd !== null ? formatCurrency(item.sizeUsd) : null} />
          <Field label="Shares" value={item.shares !== null ? item.shares.toFixed(4) : null} />
          <Field label="Entry price" value={cents(item.entryPriceCents)} />
          <Field label="Edge at entry" value={item.edgePct !== null ? `${item.edgePct.toFixed(2)}%` : null} />
          <Field label="Confidence" value={item.confidence !== null ? item.confidence.toFixed(2) : null} />
          <Field label="Settled" value={item.closedAt !== null ? stamp(item.closedAt) : item.status === 'open' ? 'open' : null} />
          <Field label="Exit price" value={item.status === 'open' ? 'open' : cents(item.exitPriceCents)} />
          <Field label="Realised P&L" value={item.pnl !== null ? `${formatSignedCurrency(item.pnl)}${item.pnlFraction !== null ? ` (${formatPercent(item.pnlFraction)})` : ''}` : item.status === 'open' ? 'open' : null} />
          <Field label="Resolution source" value={item.resolutionSource} />
          <Field label="Mode" value={item.mode ?? (engineMode ? `${engineMode} (engine mode; not recorded per trade)` : null)} />
          <Field label="Execution model" value={item.executionModel} />
          <Field label="Session" value={item.sessionId} />
          <Field label="Record #" value={item.seq !== null ? String(item.seq) : null} />
        </dl>
      </div>
    </Dialog>
  )
}
