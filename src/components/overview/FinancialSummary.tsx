'use client'

// FinancialSummary — the Overview's financial performance headline
// (SYNATRA_PRODUCT_SPEC redesign, financial-clarity pass).
//
// ─── Why this exists ─────────────────────────────────────────────────────────
// Jake's sleeve-ledger work (RunwayGroup, the real-sizer views) gave the
// dashboard real capital figures for the first time, but it arrived as detail —
// a toggleable instrument panel — with no headline summary above it. An operator
// landing on Overview had to read the Runway panel's rows to answer "did the
// engine make money", which is the FIRST question a financial dashboard should
// answer, not the fourth.
//
// ─── Sourcing discipline (do not loosen this) ────────────────────────────────
// "How is the engine's current trading performing?" is answered by ONE place —
// lib/display/performanceSource.ts, selected by the engine's OWN declared mode
// (paper vs live). This is the only place realized vs unrealized vs total P&L
// is computed, and it already refuses to guess when the mode is unconfirmed or
// the surface hasn't resolved. Built 2026-09-07 to fix exactly this class of bug
// (three disagreeing books) and, until this file, not consumed by any page.
//
// ─── What this does not do ───────────────────────────────────────────────────
// It does not add realized + unrealized unless the SAME surface reported both
// (paper does; live does not — live reports one combined total_pnl and that
// single figure is shown as-is, never split). It does not read /api/portfolio's
// independent PnL{realized,unrealized,total} — a fourth, unreconciled set of
// books — to avoid resurrecting the exact conflict this module exists to
// prevent.
//
// ─── What this used to also do, and why it stopped ───────────────────────────
// An earlier version of this component also summarised the sleeve book itself
// (equity, allocation, cash, open exposure, per-sleeve lines) beside the
// performance figures. That duplicated RunwayGroup's own "Combined" row and
// per-sleeve rows almost field-for-field, one section below — more content on
// the page, not less, which worked against the actual goal (simplify, don't add
// a second copy of a table that already exists). Removed deliberately; the
// sleeve book's detail belongs to RunwayGroup alone.
//
// ─── Cards (Financial Performance & Trade Transparency redesign) ────────────
// Responsive metric cards, as explicitly requested — a deliberate exception
// to this page's usual "stop using cards as the default grammar" rule,
// because the request is specific and the content (five independent,
// scannable headline figures) is exactly what a card grid is for. Each P&L
// card links to /ledger — the actual settled-trade records behind the
// number, not just a bigger version of it.

import Link from 'next/link'
import { useCommandCenter } from '@/config/hooks/useServices'
import { Card } from '@/components/ui/Card'
import { Figure } from '@/components/shared/Figure'
import { formatSignedCurrency, formatPercent } from '@/lib/utils'
import { ROUTES } from '@/config/constants'
import type { CommandCenterVM } from '@/lib/mappers/overview'

const pnlTone = (v: number): string | undefined =>
  v > 0 ? 'var(--synatra-positive)' : v < 0 ? 'var(--synatra-negative)' : undefined

export function FinancialSummary() {
  const { performance } = useCommandCenter()

  return (
    <section aria-labelledby="arc-financial" className="py-5" style={{ borderBottom: '1px solid var(--synatra-border)' }}>
      <h2 id="arc-financial" className="t-label mb-3">Financial performance</h2>
      <PerformancePanel performance={performance} />
    </section>
  )
}

function PerformancePanel({ performance }: { performance: CommandCenterVM['performance'] }) {
  const { metrics, provenance } = performance

  if (metrics === null) {
    return (
      <div className="flex flex-col gap-2">
        <Figure label="Total P&L" size="display" certainty="absent" absentReason={provenance.note} />
      </div>
    )
  }

  const hasSplit = metrics.realizedPnl !== null && metrics.unrealizedPnl !== null
  const total = hasSplit ? metrics.realizedPnl! + metrics.unrealizedPnl! : metrics.totalPnl

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {hasSplit ? (
          <>
            {/* Realized leads — it is the settled, no-longer-contingent figure,
                and the one the task explicitly asks to lead when trustworthy. */}
            <MetricCard label="Realized P&L" value={formatSignedCurrency(metrics.realizedPnl!)} tone={pnlTone(metrics.realizedPnl!)} href={ROUTES.LEDGER} linkLabel="View trades" />
            <MetricCard label="Unrealized P&L" value={formatSignedCurrency(metrics.unrealizedPnl!)} tone={pnlTone(metrics.unrealizedPnl!)} />
            {/* Computed here, not read from the wire — shown only because both
                halves came from the SAME surface in the SAME accounting
                period (the sleeve ledgers), the one case where summing them
                is not a conflation. */}
            <MetricCard label="Total P&L" value={formatSignedCurrency(total)} tone={pnlTone(total)} context="Realized + unrealized" />
          </>
        ) : (
          <>
            {/* Live surface: one combined total_pnl, no split available —
                shown as exactly that, never decomposed into a guess. */}
            <MetricCard label="Total P&L" value={formatSignedCurrency(total)} tone={pnlTone(total)} href={ROUTES.LEDGER} linkLabel="View trades" />
            <MetricCard label="Realized P&L" value="—" context="Not split from total on this surface" />
            <MetricCard label="Unrealized P&L" value="—" context="Not split from total on this surface" />
          </>
        )}
        <MetricCard
          label="Win rate"
          value={metrics.totalTrades > 0 ? formatPercent(metrics.winRate) : '—'}
          context={metrics.totalTrades === 0 ? 'No settled trades yet' : undefined}
        />
        <MetricCard label="Completed trades" value={metrics.totalTrades.toLocaleString()} href={ROUTES.LEDGER} linkLabel="View trades" />
      </div>

      {/* The mode/provenance claim, in the engine's own already-written words —
          never a second, differently-worded disclosure. This is what keeps
          paper/simulated figures from ever being mistaken for live account
          performance: the label and note state it every time this renders. */}
      <p className="t-helper max-w-md" title={provenance.endpoint ?? undefined}>
        <span className="font-semibold">{provenance.label}.</span> {provenance.note}
      </p>

      {performance.conflict && (
        <p className="t-helper" style={{ color: 'var(--synatra-warning)' }}>
          {performance.conflict}
        </p>
      )}
    </div>
  )
}

function MetricCard({
  label, value, tone, context, href, linkLabel,
}: {
  label: string
  value: string
  tone?: string | undefined
  context?: string | undefined
  href?: string
  linkLabel?: string
}) {
  return (
    <Card className="flex flex-col gap-1.5">
      <span className="t-label">{label}</span>
      <Figure size="lg" tone={tone}>{value}</Figure>
      {context && <span className="t-helper">{context}</span>}
      {href && (
        <Link href={href} className="focus-ring text-2xs font-semibold mt-auto pt-1" style={{ color: 'var(--synatra-primary)' }}>
          {linkLabel ?? 'View details'} →
        </Link>
      )}
    </Card>
  )
}
