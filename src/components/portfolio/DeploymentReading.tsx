'use client'

// DeploymentReading — how capital is deployed right now: how much, in what,
// on which side, and whether the engine's current view still agrees with it.
//
// ─── What this replaced ──────────────────────────────────────────────────────
// Three bordered cards (Top Exposure · Edge Alignment · Performance Snapshot),
// three more under "Allocation" (By Segment · By Position Side · By P&L
// State), and an Insights card — seven surfaces that, with no open positions,
// rendered seven dashes and three copies of "No open positions". With
// positions, they restated the same rows six ways.
//
// One ruled reading now. Derived from the open-position rows and the live
// edge map, and marked derived; a single sentence when the book is flat.

import { useMemo } from 'react'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { parsePositionRows, type PositionRow } from '@/lib/mappers/positions'
import { parseEdgeRows, toEdgeRowMap, type EdgeRow } from '@/lib/mappers/edges'
import { formatCurrency, formatSignedCurrency } from '@/lib/utils'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'
import { ROUTES } from '@/config/constants'

export function DeploymentReading() {
  const positionsSlice = useApplicationStore((s) => s.engine.positions)
  const edgesSlice     = useApplicationStore((s) => s.engine.edges)

  const positions: PositionRow[] = useMemo(() => {
    if (!positionsSlice.data) return []
    const parsed = parsePositionRows(positionsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [positionsSlice.data])

  const edgeMap = useMemo(
    () => (edgesSlice.data ? toEdgeRowMap(parseEdgeRows(edgesSlice.data)) : new Map<string, EdgeRow>()),
    [edgesSlice.data],
  )

  const reading = useMemo(() => {
    if (positions.length === 0) return null
    const deployed = positions.reduce((s, p) => s + (p.costBasis ?? 0), 0)
    const value    = positions.reduce((s, p) => s + (p.currentValue ?? 0), 0)
    const yes = positions.filter((p) => p.side === 'yes')
    const yesStake = yes.reduce((s, p) => s + (p.costBasis ?? 0), 0)

    const byAsset = new Map<string, { stake: number; value: number; count: number; pnl: number }>()
    for (const p of positions) {
      const k = p.assetSymbol ?? p.segment ?? 'unknown'
      const g = byAsset.get(k) ?? { stake: 0, value: 0, count: 0, pnl: 0 }
      g.stake += p.costBasis ?? 0; g.value += p.currentValue ?? 0; g.count += 1; g.pnl += p.unrealizedPnl ?? 0
      byAsset.set(k, g)
    }
    const assets = [...byAsset.entries()].map(([key, g]) => ({ key, ...g, share: deployed > 0 ? g.stake / deployed : 0 })).sort((a, b) => b.stake - a.stake)

    let aligned = 0, contrarian = 0, noSignal = 0
    for (const p of positions) {
      const e = p.marketId ? edgeMap.get(p.marketId) : undefined
      if (!e) noSignal++
      else if (e.direction === p.side) aligned++
      else contrarian++
    }
    const withPct = positions.filter((p) => p.unrealizedPnlPct !== null)
    const best  = withPct.length ? [...withPct].sort((a, b) => (b.unrealizedPnlPct ?? 0) - (a.unrealizedPnlPct ?? 0))[0]! : null
    const worst = withPct.length ? [...withPct].sort((a, b) => (a.unrealizedPnlPct ?? 0) - (b.unrealizedPnlPct ?? 0))[0]! : null

    return { deployed, value, yes: yes.length, no: positions.length - yes.length, yesStake, assets, aligned, contrarian, noSignal, best, worst }
  }, [positions, edgeMap])

  const cert = certaintyFromSlice(positionsSlice, 5_000)

  return (
    <section aria-labelledby="pf-deploy" className="flex flex-col gap-4 py-6" style={{ borderBottom: '1px solid var(--probex-border)' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <h2 id="pf-deploy" className="t-section-title">Deployment</h2>
          <Popover label="About deployment" trigger={(p) => <InfoButton what="deployment" {...p} />}>
            <PopoverTitle>Derived from the open positions</PopoverTitle>
            <PopoverText>
              Stake, side split and the per-asset table are sums over the engine&rsquo;s
              open-position rows, computed here. Alignment compares each position&rsquo;s
              side with the engine&rsquo;s current edge on that market — a live cross-check,
              not a historical score; &ldquo;no signal&rdquo; means the detector reports no edge
              on that market this cycle.
            </PopoverText>
          </Popover>
        </span>
        <Link href={ROUTES.POSITIONS} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--probex-primary)' }}>
          Each position and its evidence →
        </Link>
      </div>

      {reading === null ? (
        <p className="t-description">
          {positionsSlice.status === 'error'
            ? 'The positions endpoint did not answer, so deployment is unknown.'
            : positionsSlice.data === null
              ? 'Waiting for open-position state.'
              : 'Nothing deployed — the book is flat. Deployment appears here the moment the engine opens a position.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
            <Figure label="Deployed" size="md" certainty="derived" footnote={`now worth ${formatCurrency(reading.value)}`}>
              {formatCurrency(reading.deployed)}
            </Figure>
            <Figure label="Side split" size="md" certainty="derived" footnote={`${formatCurrency(reading.yesStake)} on YES`}>
              <span style={{ color: 'var(--probex-yes)' }}>{reading.yes}</span>
              <span style={{ color: 'var(--probex-text-muted)' }}> / </span>
              <span style={{ color: 'var(--probex-no)' }}>{reading.no}</span>
            </Figure>
            <Figure
              label="Aligned with current edge"
              size="md"
              certainty="derived"
              footnote={`${reading.contrarian} contrary · ${reading.noSignal} no signal`}
            >
              {`${reading.aligned} of ${positions.length}`}
            </Figure>
            {reading.best && reading.worst ? (
              <Figure
                label="Range"
                size="md"
                certainty="derived"
                footnote={`best ${reading.best.assetSymbol ?? ''} · worst ${reading.worst.assetSymbol ?? ''}`}
              >
                <span style={{ color: 'var(--probex-positive)' }}>{`${(reading.best.unrealizedPnlPct ?? 0) >= 0 ? '+' : ''}${((reading.best.unrealizedPnlPct ?? 0) * 100).toFixed(1)}%`}</span>
                <span style={{ color: 'var(--probex-text-muted)' }}> … </span>
                <span style={{ color: (reading.worst.unrealizedPnlPct ?? 0) < 0 ? 'var(--probex-negative)' : 'var(--probex-positive)' }}>{`${((reading.worst.unrealizedPnlPct ?? 0) * 100).toFixed(1)}%`}</span>
              </Figure>
            ) : (
              <Figure label="Range" size="md" certainty="absent" absentReason="No marked positions yet" />
            )}
          </div>

          <div className="max-w-2xl">
            <TableShell label="Deployment by asset">
              <Thead>
                <Th align="left" dense grow>Asset</Th>
                <Th align="right" dense>Positions</Th>
                <Th align="right" dense>Stake</Th>
                <Th align="right" dense hideBelow="sm">Share</Th>
                <Th align="right" dense>Unrealized</Th>
              </Thead>
              <tbody>
                {reading.assets.map((a) => (
                  <Tr key={a.key}>
                    <Td align="left" dense grow className={cert.certainty === 'stale' ? 'c-stale' : ''}>
                      <span className="font-semibold" style={{ color: 'var(--probex-text-primary)' }}>{a.key}</span>
                    </Td>
                    <Td align="right" dense><span className="font-mono">{a.count}</span></Td>
                    <Td align="right" dense><span className="font-mono">{formatCurrency(a.stake)}</span></Td>
                    <Td align="right" dense hideBelow="sm"><span className="font-mono" style={{ color: 'var(--probex-text-muted)' }}>{Math.round(a.share * 100)}%</span></Td>
                    <Td align="right" dense>
                      <span className="font-mono font-semibold" style={{ color: a.pnl > 0 ? 'var(--probex-positive)' : a.pnl < 0 ? 'var(--probex-negative)' : undefined }}>
                        {formatSignedCurrency(a.pnl)}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        </>
      )}
    </section>
  )
}
