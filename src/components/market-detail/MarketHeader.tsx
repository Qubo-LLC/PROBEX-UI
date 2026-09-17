'use client'

// MarketHeader — what this market IS, and whether it is still one.
//
// Identity comes from the market's own record while the engine holds it and
// from its recorded history once it does not (identityReading), because every
// market here rotates out within minutes and the page must keep naming it.
// The lifecycle chip is a comparison of `closes_at` against the clock — the
// one status the wire supports — and when the record is gone the chip says
// "Expired", which is the fact the 404 established, not a guess about how the
// market resolved (the wire never says).
//
// The technical record — id, token ids, tier, category, timestamps — is a
// Level-2 disclosure at the end of the meta line. It used to be nowhere.

import Link from 'next/link'
import type { MarketRow } from '@/lib/mappers/markets'
import type { MarketIdentityReading } from '@/lib/display/marketDetail'
import { marketLifecycle, formatCloseTime, closeTimestamp, lifecycleTone, lifecycleLabel } from '@/lib/display/marketLifecycle'
import { shortMarketId } from '@/lib/display/eventDisplay'
import { ROUTES } from '@/config/constants'
import { StatusChip } from '@/components/ui/StatusChip'
import { Popover, PopoverTitle, type PopoverTriggerProps } from '@/components/ui/Popover'
import { WatchlistButton } from '@/components/shared/WatchlistButton'

interface MarketHeaderProps {
  marketId: string
  identity: MarketIdentityReading | null
  /** The market's own record — undefined once the engine no longer holds it. */
  market:   MarketRow | undefined
  /** True when the detail endpoint answered NOT_FOUND: the record has expired. */
  expired:  boolean
}

export function MarketHeader({ marketId, identity, market, expired }: MarketHeaderProps) {
  const life = market !== undefined ? marketLifecycle(market.closesAt) : null
  const closeTitle = market !== undefined ? closeTimestamp(market.closesAt) : undefined
  const category = market?.segment ?? null
  const duration = identity?.durationMinutes ?? null

  return (
    <header className="flex flex-col gap-2.5">
      <Link
        href={ROUTES.MARKETS}
        className="inline-flex items-center gap-1.5 text-2xs font-semibold focus-ring rounded self-start"
        style={{ color: 'var(--probex-text-muted)' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        Markets
      </Link>

      <div className="flex items-start gap-3 flex-wrap">
        <h1 className="flex-1 min-w-0 t-page-title break-words" style={{ fontSize: '1.25rem' }}>
          {identity !== null ? identity.question : <>Market <span className="font-mono">{shortMarketId(marketId)}</span></>}
        </h1>
        <WatchlistButton marketId={marketId} variant="pill" />
      </div>

      <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
        {life !== null && market !== undefined ? (
          <StatusChip tone={lifecycleTone(life)} live={life === 'open' || life === 'closing'} {...(closeTitle !== undefined ? { title: closeTitle } : {})}>
            {lifecycleLabel(life)}{life !== 'unknown' && ` · ${formatCloseTime(market.closesAt)}`}
          </StatusChip>
        ) : expired ? (
          <StatusChip tone="neutral" title="GET /api/markets/:id answered 404 — the engine no longer holds this market">
            Expired · no longer held by the engine
          </StatusChip>
        ) : null}

        {duration !== null && <span className="t-helper">{duration}-minute window</span>}
        {category !== null && <span className="t-helper">{category}</span>}
        {identity?.source === 'history' && (
          <span className="t-helper" title="The market's own record has expired; its question is read from the recorded snapshots">
            named from its recorded history
          </span>
        )}

        <Popover label="Market record" width={340} trigger={(p) => <RecordButton {...p} />}>
          <MarketRecord marketId={marketId} market={market} />
        </Popover>
      </div>
    </header>
  )
}

function RecordButton(props: PopoverTriggerProps) {
  return (
    <button
      type="button"
      className="focus-ring inline-flex items-center gap-1 rounded-sm text-2xs font-mono cursor-pointer"
      style={{ color: 'var(--probex-text-disabled)' }}
      title="Market record — identifiers and timestamps"
      {...props}
    >
      <span>record</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
  )
}

function MarketRecord({ marketId, market }: { marketId: string; market: MarketRow | undefined }) {
  return (
    <div className="flex flex-col gap-2.5">
      <PopoverTitle>Market record</PopoverTitle>
      <Line label="Market id" value={marketId} />
      {market?.yesTokenId && <Line label="YES token" value={market.yesTokenId} />}
      {market?.noTokenId && <Line label="NO token" value={market.noTokenId} />}
      {market?.closesAt !== null && market?.closesAt !== undefined && (
        <Line label="Closes" value={`${new Date(market.closesAt).toISOString()} · ${new Date(market.closesAt).toLocaleString()}`} />
      )}
      {market?.baselinePrice !== null && market?.baselinePrice !== undefined && (
        <Line label="Reported baseline" value={`${market.baselinePrice.toLocaleString()} (engine field baseline_price)`} mono={false} />
      )}
      <span className="t-metadata">{market !== undefined ? '/api/markets/:id' : '/api/markets/:id → 404 · /api/markets/:id/history'}</span>
    </div>
  )
}

function Line({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="t-label">{label}</span>
      <span className={`text-2xs break-all ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--probex-text-secondary)' }}>{value}</span>
    </div>
  )
}
