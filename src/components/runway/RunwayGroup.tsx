'use client'

// RunwayGroup — capital and book, from the engine's sleeve ledgers ONLY.
//
// This replaces CapitalBookGroup, whose Capital column read the global survival
// brain's capital and whose Result column read the retired PaperTrader
// (/api/paper-stats). Both are gone from the dashboard: there is no legacy
// section and no fallback. Every figure here comes from /api/runway, which the
// engine builds from data/sleeves (src/runway.py).
//
// Research sizing is labelled wherever its figures appear. The $100 paper and
// $50 live views — the same fills re-sized by the real risk sizer — sit beside
// it as a toggle, never mixed into the research figures.

import { useState } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency } from '@/lib/utils'
import { Figure } from '@/components/shared/Figure'
import type { Runway, Sleeve } from '@/types/runway'
import { EquityCurves } from './EquityCurves'

export type SizingView = 'research' | 'paper_100' | 'live_50'

export const VIEW_LABELS: Record<SizingView, string> = {
  research:  'Paper, research sizing',
  paper_100: '$100 view · real sizer',
  live_50:   '$50 view · real sizer',
}

const tone = (v: number) =>
  v > 0 ? 'var(--synatra-positive)' : v < 0 ? 'var(--synatra-negative)' : undefined

export function RunwayGroup() {
  const slice = useApplicationStore((s) => s.engine.runway)
  const [view, setView] = useState<SizingView>('research')
  const runway = slice.status === 'success' ? slice.data : null

  return (
    <section
      aria-labelledby="arc-runway"
      className="rounded-lg px-5 py-4 mt-5"
      style={{ background: 'var(--synatra-surface)', border: '1px solid var(--synatra-border)' }}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
        <h2 id="arc-runway" className="t-section-title">Runway</h2>
        <SizingToggle value={view} onChange={setView} />
      </div>

      {runway === null ? (
        <Figure
          label="Sleeves"
          size="md"
          certainty="absent"
          absentReason={slice.status === 'error' ? 'The engine did not answer /api/runway' : 'Waiting for the sleeve ledgers'}
        />
      ) : view === 'research' ? (
        <ResearchBook runway={runway} />
      ) : (
        <SizerViewBook runway={runway} view={view} />
      )}

      {runway !== null && <EquityCurves runway={runway} view={view} />}
    </section>
  )
}

export function SizingToggle({ value, onChange }: { value: SizingView; onChange: (v: SizingView) => void }) {
  return (
    <div role="radiogroup" aria-label="Sizing view" className="flex gap-1 text-xs">
      {(Object.keys(VIEW_LABELS) as SizingView[]).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className="px-2 py-1 rounded"
          style={{
            border: '1px solid var(--synatra-border)',
            background: value === v ? 'var(--synatra-primary)' : 'transparent',
            color: value === v ? 'var(--synatra-surface)' : 'var(--synatra-text-secondary)',
          }}
        >
          {VIEW_LABELS[v]}
        </button>
      ))}
    </div>
  )
}

function ResearchBook({ runway }: { runway: Runway }) {
  return (
    <>
      <p className="t-description mb-3" data-testid="runway-label">
        <span className="font-semibold">{runway.label === 'paper, research sizing' ? 'Paper, research sizing' : 'Paper'}</span>
        {' '}— fixed minimum-size orders so positions accrue; visibility only. Source: {runway.source}.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Sleeve ledgers">
          <thead>
            <tr className="t-label text-left">
              <th className="py-1 pr-3">Sleeve</th>
              <th className="py-1 pr-3 text-right">Allocation</th>
              <th className="py-1 pr-3 text-right">Cash</th>
              <th className="py-1 pr-3 text-right">Equity</th>
              <th className="py-1 pr-3 text-right">Open</th>
              <th className="py-1 pr-3 text-right">Realized</th>
              <th className="py-1 pr-3 text-right">Unrealized</th>
              <th className="py-1 pr-3 text-right">Drawdown</th>
              <th className="py-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {runway.sleeves.map((s) => <SleeveRow key={s.sleeveId} s={s} />)}
            <tr data-testid="runway-reserve" style={{ borderTop: '1px solid var(--synatra-border)' }}>
              <td className="py-1 pr-3 font-semibold">Reserve (locked profit)</td>
              <td colSpan={2} />
              <td className="py-1 pr-3 text-right">{formatCurrency(runway.reserveTotal)}</td>
              <td colSpan={5} className="py-1 t-description">Moved out of the sleeves daily; no sleeve can trade it</td>
            </tr>
            {runway.combined && (
              <tr data-testid="runway-combined" className="font-semibold">
                <td className="py-1 pr-3">Combined</td>
                <td className="py-1 pr-3 text-right">{formatCurrency(runway.combined.allocation)}</td>
                <td className="py-1 pr-3 text-right">{formatCurrency(runway.combined.cash)}</td>
                <td className="py-1 pr-3 text-right">{formatCurrency(runway.combined.equity + runway.combined.reserve)}</td>
                <td className="py-1 pr-3 text-right">{runway.combined.openPositions}</td>
                <td className="py-1 pr-3 text-right" style={{ color: tone(runway.combined.realizedPnl) }}>{formatSignedCurrency(runway.combined.realizedPnl)}</td>
                <td className="py-1 pr-3 text-right">{formatSignedCurrency(runway.combined.unrealizedPnl)}</td>
                <td className="py-1 pr-3 text-right">{formatCurrency(runway.combined.drawdown)}</td>
                <td className="py-1 t-description">equity incl. reserve</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function SleeveRow({ s }: { s: Sleeve }) {
  return (
    <tr data-testid={`sleeve-${s.sleeveId}`}>
      <td className="py-1 pr-3 font-semibold">{s.sleeveId}</td>
      <td className="py-1 pr-3 text-right">{formatCurrency(s.allocation)}</td>
      <td className="py-1 pr-3 text-right">{formatCurrency(s.cash)}</td>
      <td className="py-1 pr-3 text-right">{formatCurrency(s.equity)}</td>
      <td className="py-1 pr-3 text-right">{s.openPositions}</td>
      <td className="py-1 pr-3 text-right" style={{ color: tone(s.realizedPnl) }}>{formatSignedCurrency(s.realizedPnl)}</td>
      <td className="py-1 pr-3 text-right">{formatSignedCurrency(s.unrealizedPnl)}</td>
      <td className="py-1 pr-3 text-right">
        {formatCurrency(s.drawdown)}
        {s.drawdownPct !== null && <span className="t-description"> ({s.drawdownPct.toFixed(1)}%)</span>}
      </td>
      <td className="py-1" title={s.halt.reason ?? undefined}>
        {s.halt.halted ? (
          <span style={{ color: 'var(--synatra-negative)' }} data-testid={`halt-${s.sleeveId}`}>
            Halted · {s.halt.state.replace('_', ' ').toLowerCase()}
          </span>
        ) : (
          <span style={{ color: 'var(--synatra-positive)' }}>Trading</span>
        )}
      </td>
    </tr>
  )
}

function SizerViewBook({ runway, view }: { runway: Runway; view: Exclude<SizingView, 'research'> }) {
  const v = runway.views[view]
  if (!v) {
    return <p className="t-description">The engine did not report the {VIEW_LABELS[view]}.</p>
  }
  const skipped = Object.entries(v.skipped).sort((a, b) => b[1] - a[1])
  return (
    <div data-testid={`view-${view}`}>
      <p className="t-description mb-3">
        <span className="font-semibold">{VIEW_LABELS[view]}</span> — the CRYPTO sleeve&apos;s fills re-sized by the
        engine&apos;s real risk sizer ({v.sizing}) on a {formatCurrency(v.equityStart)} book.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Stat label="Equity" value={formatCurrency(v.equity)} />
        <Stat label="PnL" value={formatSignedCurrency(v.pnl)} color={tone(v.pnl)} />
        <Stat label="Placed" value={String(v.placed)} />
        <Stat label="Skipped" value={String(skipped.reduce((n, [, c]) => n + c, 0))} />
      </div>
      {skipped.length > 0 && (
        <ul className="mt-3 text-xs t-description" aria-label="Skip reasons">
          {skipped.map(([reason, count]) => <li key={reason}>{reason}: {count}</li>)}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string | undefined }) {
  return (
    <div>
      <div className="t-label">{label}</div>
      <div className="font-semibold" style={{ color }}>{value}</div>
    </div>
  )
}
