'use client'

// MarketHeader — restored from V1 (git 0e3833a4). ConsensusBadge +
// SentimentIndicator (fabricated) are replaced by the live EdgeBadge.

import { useRouter } from 'next/navigation'
import type { MarketRow } from '@/lib/mappers/markets'
import type { EdgeRow } from '@/lib/mappers/edges'
import { ROUTES } from '@/config/constants'
import { EdgeBadge } from '@/components/shared/EdgeBadge'
import { ProbabilityValue } from '@/components/shared/ProbabilityValue'
import { WatchlistButton } from '@/components/shared/WatchlistButton'

interface MarketHeaderProps {
  market: MarketRow
  edge:   EdgeRow | undefined
}

export function MarketHeader({ market, edge }: MarketHeaderProps) {
  const router = useRouter()
  const resolves = market.closesAt !== null
    ? new Date(market.closesAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <header className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--probex-border)', background: 'var(--probex-surface)' }}>
      <button
        onClick={() => router.push(ROUTES.MARKETS)}
        className="flex items-center gap-1.5 text-2xs font-semibold mb-3 cursor-pointer focus-ring rounded"
        style={{ color: 'var(--probex-text-muted)', background: 'transparent', border: 0, padding: 0 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        Markets
      </button>

      <div className="flex items-start gap-3 mb-3">
        <h1 className="flex-1 text-lg font-bold leading-tight" style={{ color: 'var(--probex-text-primary)' }}>
          {market.title}
        </h1>
        <WatchlistButton marketId={market.id} variant="pill" />
      </div>

      <div className="flex items-center gap-5 flex-wrap">
        <EdgeBadge edge={edge} />
        {market.probability !== null && <ProbabilityValue probability={market.probability} size="lg" />}
        {resolves && (
          <span className="text-xs ml-auto" style={{ color: 'var(--probex-text-muted)' }}>Resolves {resolves}</span>
        )}
      </div>
    </header>
  )
}
