'use client'

// MarketBook — what the engine did on this market: the open position if it
// holds one, and every settled trade the ledger records against the id.
//
// A join on market_id against records the store already polls for Positions
// and Portfolio (lib/display/marketDetail.marketBook). Each row is the same
// facts the Settled Positions blotter shows, so the two surfaces agree by
// construction, and each links back into that blotter for the full set.
//
// Absence is stated only once the sources have answered: "no trade on this
// market" is a claim about the ledger, and the ledger must have been read.

import Link from 'next/link'
import { stamp } from '@/lib/display/time'
import type { MarketBook as Book } from '@/lib/display/marketDetail'
import type { ServiceState } from '@/lib/services/response'
import { formatCurrency, formatSignedCurrency } from '@/lib/utils'
import { formatEdgePct } from '@/lib/display/engine'
import { formatRuntime } from '@/lib/display/positionDisplay'
import { ROUTES } from '@/config/constants'

const YES = 'var(--probex-yes)'
const NO  = 'var(--probex-no)'

interface MarketBookProps {
  book: Book | null
  ledger: ServiceState<unknown>
  positions: ServiceState<unknown>
}

export function MarketBook({ book, ledger, positions }: MarketBookProps) {
  return (
    <section aria-labelledby="md-book" className="flex flex-col gap-3 pt-6" style={{ borderTop: '1px solid var(--probex-border)' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-baseline gap-2 flex-wrap">
          <h2 id="md-book" className="t-section-title">The book on this market</h2>
          <span className="t-description">positions and settled trades the engine records against this id</span>
        </span>
        <span className="flex items-baseline gap-3">
          <span className="t-metadata">/api/positions · /api/trades/ledger</span>
          <Link href={ROUTES.POSITIONS} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--probex-primary)' }}>
            Positions →
          </Link>
        </span>
      </div>

      {book === null ? (
        <p className="t-description">
          {ledger.status === 'error' || positions.status === 'error'
            ? 'The ledger or the positions record did not answer — whether the engine traded this market is unknown.'
            : 'Waiting for the positions and the ledger.'}
        </p>
      ) : book.open === null && book.settled.length === 0 ? (
        <p className="t-description">No open position and no settled trade on this market in the engine’s records.</p>
      ) : (
        <div className="flex flex-col" style={{ borderBottom: '1px solid var(--probex-border)' }}>
          {book.open !== null && (
            <Row
              accent={book.open.side === 'yes' ? YES : NO}
              side={book.open.side}
              headline="Open position"
              result={book.open.unrealizedPnl !== null ? `${formatSignedCurrency(book.open.unrealizedPnl)} unrealized` : 'unrealized P&L not reported'}
              resultTone={book.open.unrealizedPnl === null ? undefined : book.open.unrealizedPnl >= 0 ? 'var(--probex-positive)' : 'var(--probex-negative)'}
              facts={[
                ['Stake', book.open.costBasis !== null ? formatCurrency(book.open.costBasis) : '—'],
                ['Entry', book.open.entryPrice !== null ? `${book.open.entryPrice.toFixed(1)}¢` : '—'],
                ['Now', book.open.currentPrice !== null ? `${book.open.currentPrice.toFixed(1)}¢` : '—'],
                ['Edge at entry', book.open.edgePct !== null ? formatEdgePct(book.open.edgePct) : '—'],
                ['Held', formatRuntime(book.open.timeHeldSeconds)],
                ['Opened', book.open.openedAt !== null ? stamp(book.open.openedAt) : '—'],
              ]}
            />
          )}
          {book.settled.map((t) => (
            <Row
              key={`${t.openedAt}-${t.closedAt}`}
              accent={t.won ? 'var(--probex-positive)' : 'var(--probex-negative)'}
              side={t.direction}
              headline={t.won ? 'Settled · won' : 'Settled · lost'}
              result={formatSignedCurrency(t.pnl)}
              resultTone={t.won ? 'var(--probex-positive)' : 'var(--probex-negative)'}
              facts={[
                ['Stake', formatCurrency(t.size)],
                ['Entry → exit', `${t.entryPrice.toFixed(1)}¢ → ${t.exitPrice !== null ? `${t.exitPrice.toFixed(1)}¢` : 'resolved'}`],
                ['Edge at entry', formatEdgePct(t.edgePct)],
                ['Held', formatRuntime(t.holdTimeSeconds)],
                ['Opened', stamp(t.openedAt)],
                ['Settled', stamp(t.closedAt)],
              ]}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function Row({ accent, side, headline, result, resultTone, facts }: {
  accent: string
  side: string
  headline: string
  result: string
  resultTone?: string | undefined
  facts: Array<[string, string]>
}) {
  const isYes = side.toLowerCase() === 'yes'
  return (
    <div className="flex flex-col gap-2 py-2.5 pl-2.5 pr-1" style={{ borderTop: '1px solid var(--probex-border)', borderLeft: `2.5px solid ${accent}` }}>
      <div className="flex items-baseline gap-2 flex-wrap text-xs">
        <span className="text-2xs font-black uppercase tracking-widest" style={{ color: isYes ? YES : NO }}>{side}</span>
        <span className="font-semibold" style={{ color: 'var(--probex-text-primary)' }}>{headline}</span>
        <span className="font-mono tabular-nums ml-auto" style={{ color: resultTone ?? 'var(--probex-text-secondary)' }}>{result}</span>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-1.5 m-0">
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 min-w-0">
            <dt className="t-label truncate">{label}</dt>
            <dd className="m-0 font-mono text-xs tabular-nums truncate" style={{ color: 'var(--probex-text-secondary)' }}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
