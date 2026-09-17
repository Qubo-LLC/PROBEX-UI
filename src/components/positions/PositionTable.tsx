'use client'

// PositionTable — the engine's open positions as a ledger, with the evidence
// for each position one row-expansion away.
//
// ─── What changed ────────────────────────────────────────────────────────────
// This was an eight-column table (Market · Side · Entry→Now · Cost/Value ·
// Edge · Unrealized · Runtime · Market State) that scrolled sideways below
// ~1100px, plus a separate PositionDetail card that opened BENEATH the table
// when a row was clicked — a 170-line panel of eleven bordered MetricCells,
// three more bordered sub-sections and a close control, repeating most of the
// row it was about.
//
// The row now carries what identifies a position and how it is doing; the
// expansion carries the evidence — entry context, the edge that justified
// it, the underlying's move since, the market's lifecycle, whether the
// engine's CURRENT edge still agrees with the side taken, and the manual
// close. Same DataTable grammar as the engine field and the observed board:
// elastic title, fixed numeric gutters, columns folding below sm / md, one
// state carrier at the row's edge (the side colour), expansion inline.
//
// Nothing here is new data. Every field the detail card showed is on the
// wire today (/api/positions), joined to /api/edges and the markets cache.
// Fields the wire does not carry — a thesis, a target, a stop — stay absent.

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { formatCurrency, formatSignedCurrency, formatDelta } from '@/lib/utils'
import type { PositionRow } from '@/lib/mappers/positions'
import type { EdgeRow } from '@/lib/mappers/edges'
import { TableShell, Thead, Th, Tr, Td, ExpansionRow } from '@/components/shared/DataTable'
import { formatRuntime, positionCloseState, underlyingMove } from '@/lib/display/positionDisplay'
import { lifecycleLabel, formatCloseTime, closeTimestamp } from '@/lib/display/marketLifecycle'
import { compactWindowTitle } from '@/lib/display/market'
import { formatEdgePct } from '@/lib/display/engine'
import { MARKET_DETAIL_PATH } from '@/config/constants'
import { useClosePosition, MUTATIONS } from '@/config/hooks/useMutation'
import { MutationButton } from '@/components/execution/MutationButton'

const YES_COLOR = 'var(--probex-yes)'
const NO_COLOR  = 'var(--probex-no)'

interface PositionTableProps {
  positions:   PositionRow[]
  edgeMap:     Map<string, EdgeRow>
  /** marketId → closes_at. Missing entries mean "not in the engine's current
   *  market cache", which renders as no claim rather than as "open". */
  closesAtByMarketId?: Map<string, number | null>
  /** Ledger cells dim together when the positions slice is stale. */
  stale?: boolean
}

export function PositionTable({ positions, edgeMap, closesAtByMarketId, stale = false }: PositionTableProps) {
  const closes = closesAtByMarketId ?? new Map<string, number | null>()
  // Keyed by market id (the row identity on this wire) so a re-poll does not
  // reset what the reader opened. Nothing opens by default: an open position
  // is not an event the way an edge is; the row already says what matters.
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const cellCert = stale ? 'c-stale' : ''
  const COLS = 7

  return (
    <TableShell label="Open positions">
      <Thead>
        <Th align="left" dense grow>Position</Th>
        <Th align="right" dense hideBelow="md">Entry → now</Th>
        <Th align="right" dense>Unrealized</Th>
        <Th align="right" dense hideBelow="sm">Edge at entry</Th>
        <Th align="right" dense hideBelow="sm">Held</Th>
        <Th align="left" dense hideBelow="lg">Market</Th>
        <Th align="center" dense><span className="sr-only">Details</span></Th>
      </Thead>
      <tbody>
        {positions.map((p) => {
          const isYes = p.side === 'yes'
          const sideColor = isYes ? YES_COLOR : NO_COLOR
          const edge = p.marketId ? edgeMap.get(p.marketId) : undefined
          const isOpen = open[p.id] ?? false
          const panelId = `position-${p.id.slice(0, 12)}`
          const cs = positionCloseState(p.marketId, closes)
          const title = p.marketTitle ?? p.id
          const pnlTone =
            p.unrealizedPnl === null ? 'var(--probex-text-muted)'
            : p.unrealizedPnl > 0 ? 'var(--probex-positive)'
            : p.unrealizedPnl < 0 ? 'var(--probex-negative)'
            : 'var(--probex-text-primary)'

          return (
            <PositionRowGroup key={p.id}>
              {/* The side is the row's one state carrier, at the edge —
                  the same device the engine field uses for its edge. */}
              <Tr accent={sideColor} id={`${panelId}-row`}>
                <Td align="left" dense grow className={cellCert}>
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span
                      className="text-2xs font-black uppercase tracking-widest flex-shrink-0"
                      style={{ color: sideColor }}
                    >
                      {p.side}
                    </span>
                    {p.marketId ? (
                      <Link
                        href={MARKET_DETAIL_PATH(p.marketId)}
                        className="focus-ring font-semibold block truncate min-w-0"
                        style={{ color: 'var(--probex-text-primary)' }}
                        title={title}
                      >
                        <span className="sm:hidden">{compactWindowTitle(title)}</span>
                        <span className="hidden sm:inline">{title}</span>
                      </Link>
                    ) : (
                      <span className="font-semibold block truncate min-w-0" title={title}>{title}</span>
                    )}
                  </span>
                  {/* What the folded columns carried, restated beneath. */}
                  <span className="lg:hidden block font-mono text-2xs mt-0.5 truncate" style={{ color: 'var(--probex-text-muted)' }}>
                    <span className="md:hidden">
                      {p.entryPrice !== null && p.currentPrice !== null ? `${p.entryPrice.toFixed(0)}¢ → ${p.currentPrice.toFixed(0)}¢` : '—'}
                    </span>
                    <span className="sm:hidden">
                      {p.edgePct !== null && ` · ${formatEdgePct(p.edgePct)} edge`}
                      {p.timeHeldSeconds !== null && ` · ${formatRuntime(p.timeHeldSeconds)}`}
                    </span>
                    {cs.lifecycle !== 'unknown' && (
                      <span className="hidden md:inline"> · {lifecycleLabel(cs.lifecycle).toLowerCase()} {formatCloseTime(cs.closesAt)}</span>
                    )}
                  </span>
                </Td>
                <Td align="right" dense hideBelow="md" className={cellCert}>
                  <span className="font-mono" style={{ color: 'var(--probex-text-secondary)' }}>
                    {p.entryPrice !== null && p.currentPrice !== null
                      ? <>{p.entryPrice.toFixed(0)}¢ → <span style={{ color: sideColor }}>{p.currentPrice.toFixed(0)}¢</span></>
                      : '—'}
                  </span>
                </Td>
                <Td align="right" dense className={cellCert}>
                  <span className="font-mono font-semibold" style={{ color: pnlTone }}>
                    {p.unrealizedPnl !== null ? formatSignedCurrency(p.unrealizedPnl) : '—'}
                  </span>
                  {p.unrealizedPnlPct !== null && (
                    <span className="hidden sm:inline font-mono text-2xs ml-1.5" style={{ color: 'var(--probex-text-muted)' }}>
                      {formatDelta(p.unrealizedPnlPct)}
                    </span>
                  )}
                </Td>
                <Td align="right" dense hideBelow="sm" className={cellCert}>
                  <span className="font-mono">{p.edgePct !== null ? formatEdgePct(p.edgePct) : '—'}</span>
                </Td>
                <Td align="right" dense hideBelow="sm" className={cellCert}>
                  <span
                    className="font-mono"
                    style={{ color: 'var(--probex-text-secondary)' }}
                    {...(p.openedAt !== null ? { title: `Opened ${new Date(p.openedAt).toLocaleString()}` } : {})}
                  >
                    {formatRuntime(p.timeHeldSeconds)}
                  </span>
                </Td>
                <Td align="left" dense hideBelow="lg" className={cellCert}>
                  {cs.lifecycle === 'unknown' ? (
                    <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }} title="Not in the engine's current market cache, so its close time is unknown.">—</span>
                  ) : (
                    <span className="text-2xs font-mono whitespace-nowrap" style={{ color: cs.lifecycle === 'open' ? 'var(--probex-text-secondary)' : 'var(--probex-warning)' }} title={closeTimestamp(cs.closesAt)}>
                      {lifecycleLabel(cs.lifecycle)} · {formatCloseTime(cs.closesAt)}
                    </span>
                  )}
                </Td>
                <Td align="center" dense>
                  <button
                    type="button"
                    onClick={() => setOpen((s) => ({ ...s, [p.id]: !isOpen }))}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    aria-label={`${isOpen ? 'Hide' : 'Show'} evidence for ${title}`}
                    className="focus-ring inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer"
                    style={{ color: 'var(--probex-text-muted)' }}
                  >
                    <span aria-hidden="true" style={{ display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▸</span>
                  </button>
                </Td>
              </Tr>

              <ExpansionRow id={panelId} colSpan={COLS} hidden={!isOpen} dense>
                <PositionEvidence position={p} edge={edge} closeState={cs} />
              </ExpansionRow>
            </PositionRowGroup>
          )
        })}
      </tbody>
    </TableShell>
  )
}

/** A row and its expansion are two <tr>s that must stay siblings inside the
 *  <tbody>; this is the keyed fragment that pairs them. */
function PositionRowGroup({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// ─── The evidence for one position ───────────────────────────────────────────

function PositionEvidence({
  position: p, edge, closeState,
}: {
  position: PositionRow
  edge: EdgeRow | undefined
  closeState: ReturnType<typeof positionCloseState>
}) {
  const isYes = p.side === 'yes'
  const sideColor = isYes ? YES_COLOR : NO_COLOR
  const btcMove = underlyingMove(p.entryBtcPrice, p.currentBtcPrice)
  const closeMutation = useClosePosition(p.marketId)

  // Whether the engine's CURRENT edge on this market still agrees with the
  // side already taken — a live cross-check against /api/edges, not a
  // historical score. 'no-signal' is a fact about the detector this cycle,
  // not a verdict on the position.
  const alignment: 'aligned' | 'contrarian' | 'no-signal' =
    !edge ? 'no-signal' : edge.direction === p.side ? 'aligned' : 'contrarian'
  const alignmentMeta = {
    aligned:     { label: 'Aligned — the engine still sees this edge', color: 'var(--probex-positive)' },
    contrarian:  { label: 'Contrary — the engine’s current edge is on the other side', color: 'var(--probex-warning)' },
    'no-signal': { label: 'No active edge on this market this cycle', color: 'var(--probex-text-muted)' },
  }[alignment]

  return (
    <div className="flex flex-col gap-3">
      {/* Entry context, as a compact ledger of facts the wire carries. */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-2 m-0">
        <Fact label="Opened" value={p.openedAt !== null ? new Date(p.openedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} />
        <Fact label="Edge at entry" value={p.edgePct !== null ? formatEdgePct(p.edgePct) : '—'} />
        <Fact label="Stake" value={p.costBasis !== null ? formatCurrency(p.costBasis) : '—'} />
        <Fact label="Contracts" value={p.contracts !== null ? Math.round(p.contracts).toLocaleString() : '—'} />
        <Fact label="Current value" value={p.currentValue !== null ? formatCurrency(p.currentValue) : '—'} />
        <Fact
          label="BTC since entry"
          value={btcMove !== null ? `${btcMove >= 0 ? '+' : ''}${(btcMove * 100).toFixed(2)}%` : '—'}
          tone={btcMove === null ? undefined : btcMove >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)'}
          title={p.entryBtcPrice !== null && p.currentBtcPrice !== null ? `${formatCurrency(p.entryBtcPrice)} at entry → ${formatCurrency(p.currentBtcPrice)} now` : undefined}
        />
      </dl>

      {/* Probability move, drawn: entry mark to current mark on the side's
          own scale. The bar is the row's 89¢ → 95¢ made visible, nothing more. */}
      {p.entryPrice !== null && p.currentPrice !== null && (
        <div className="flex items-center gap-3">
          <span className="t-label whitespace-nowrap">{p.side} price</span>
          <div className="relative h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: 'var(--probex-border-default)' }}>
            <div className="absolute h-full rounded-full" style={{ width: `${Math.max(p.entryPrice, p.currentPrice)}%`, background: `color-mix(in srgb, ${sideColor} 30%, transparent)` }} />
            <div className="absolute h-full rounded-full" style={{ width: `${Math.min(p.entryPrice, p.currentPrice)}%`, background: sideColor }} />
          </div>
          <span className="font-mono text-2xs tabular-nums whitespace-nowrap" style={{ color: 'var(--probex-text-secondary)' }}>
            {p.entryPrice.toFixed(0)}¢ → <span style={{ color: sideColor }}>{p.currentPrice.toFixed(0)}¢</span>
          </span>
        </div>
      )}

      {/* Current state: the market's lifecycle and the engine's live read. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-2xs">
        <span className="flex items-center gap-1.5" style={{ color: alignmentMeta.color }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: alignmentMeta.color }} aria-hidden="true" />
          <span className="font-semibold">{alignmentMeta.label}</span>
          {edge && <span className="font-mono">· {formatEdgePct(edge.edgePct)} now</span>}
        </span>
        {closeState.lifecycle !== 'unknown' && (
          <span className="font-mono" style={{ color: closeState.lifecycle === 'open' ? 'var(--probex-text-muted)' : 'var(--probex-warning)' }} title={closeTimestamp(closeState.closesAt)}>
            Market {lifecycleLabel(closeState.lifecycle).toLowerCase()} · {formatCloseTime(closeState.closesAt)}
            {closeState.lifecycle === 'closed' && ' — still open against a market whose close has passed'}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2.5" style={{ borderTop: '1px solid var(--probex-border)' }}>
        {p.marketId ? (
          <Link href={MARKET_DETAIL_PATH(p.marketId)} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--probex-primary)' }}>
            Market detail →
          </Link>
        ) : <span />}
        <MutationButton
          mutation={closeMutation}
          label="Close position"
          tone="danger"
          size="sm"
          disabled={p.marketId === null}
          disabledReason="This position has no market id, so it cannot be closed from here."
          confirmTitle="Close this position now?"
          confirmDescription={
            `Closes the ${p.side.toUpperCase()} position on "${p.marketTitle ?? p.id}" at the current market price` +
            (p.unrealizedPnl !== null ? `, realizing ${formatSignedCurrency(p.unrealizedPnl)} of currently unrealized P&L` : '') +
            `. The engine will stop managing it.`
          }
          endpoint={MUTATIONS.closePosition.endpoint}
        />
      </div>
    </div>
  )
}

function Fact({ label, value, tone, title }: { label: string; value: string; tone?: string | undefined; title?: string | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0" {...(title !== undefined ? { title } : {})}>
      <dt className="t-label truncate">{label}</dt>
      <dd className="m-0 font-mono text-xs font-semibold tabular-nums truncate" style={{ color: tone ?? 'var(--probex-text-primary)' }}>{value}</dd>
    </div>
  )
}
