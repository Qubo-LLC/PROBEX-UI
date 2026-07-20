'use client'

// MarketFilterBar — restored from V1 (git 0e3833a4). State lived in
// marketStore (deleted in M5); now lives in uiStore, its first real
// consumer — purely presentational otherwise, matching V1's design intent.

import { useRef } from 'react'
import { useUIStore } from '@/store/uiStore'
import { BITCOIN_SEGMENTS } from '@/types/market'
import { segmentLabel } from '@/lib/display/market'
import type { BitcoinSegment } from '@/types/market'
import type { MarketSortField } from '@/store/uiStore'

const SORT_OPTIONS: Array<{ field: MarketSortField; label: string }> = [
  { field: 'volume24h',   label: 'Volume' },
  { field: 'probability', label: 'Probability' },
  { field: 'liquidity',   label: 'Liquidity' },
  { field: 'closesAt',    label: 'Closing Soon' },
]

export function MarketFilterBar() {
  const search    = useUIStore((s) => s.marketSearch)
  const segment   = useUIStore((s) => s.marketSegment)
  const sortBy    = useUIStore((s) => s.marketSortBy)
  const viewMode  = useUIStore((s) => s.marketViewMode)
  const setSearch = useUIStore((s) => s.setMarketSearch)
  const setSegment = useUIStore((s) => s.setMarketSegment)
  const setSort    = useUIStore((s) => s.setMarketSort)
  const setViewMode = useUIStore((s) => s.setMarketViewMode)
  const resetFilters = useUIStore((s) => s.resetMarketFilters)

  const inputRef = useRef<HTMLInputElement>(null)
  const hasFilter = Boolean(search || segment)

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: Search + Sort + View toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            aria-hidden="true" style={{ color: 'var(--probex-text-muted)' }}
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Bitcoin markets…"
            className="input-base h-8 pl-8 pr-3 text-sm w-full"
            aria-label="Search markets"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer focus-ring rounded"
              style={{ color: 'var(--probex-text-muted)' }}
              aria-label="Clear search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSort(e.target.value as MarketSortField, 'desc')}
            className="h-8 pl-2.5 pr-6 text-xs rounded-md cursor-pointer appearance-none transition-colors duration-100"
            style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border-default)', color: 'var(--probex-text-secondary)', minWidth: 110 }}
            aria-label="Sort markets by"
          >
            {SORT_OPTIONS.map((opt) => <option key={opt.field} value={opt.field}>{opt.label}</option>)}
          </select>
          <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" style={{ color: 'var(--probex-text-muted)' }}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--probex-border-default)' }} role="group" aria-label="View mode">
          {(['grid', 'table'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              aria-pressed={viewMode === m}
              aria-label={`${m} view`}
              className="flex items-center justify-center w-8 h-8 cursor-pointer transition-colors duration-100 focus-ring"
              style={{
                background: viewMode === m ? 'var(--probex-primary-dim)' : 'transparent',
                color: viewMode === m ? 'var(--probex-primary)' : 'var(--probex-text-muted)',
                borderRight: m === 'grid' ? '1px solid var(--probex-border-default)' : 'none',
              }}
            >
              {m === 'grid' ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {hasFilter && (
          <button
            onClick={resetFilters}
            className="text-xs px-2.5 py-1.5 rounded-md cursor-pointer transition-colors duration-100 focus-ring"
            style={{ background: 'var(--probex-negative-dim)', color: 'var(--probex-negative)', border: '1px solid var(--probex-negative-border)' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Row 2: Segment pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar" role="tablist" aria-label="Bitcoin market segments">
        <SegmentPill label="All" isActive={segment === null} onClick={() => setSegment(null)} />
        {BITCOIN_SEGMENTS.map((seg) => (
          <SegmentPill key={seg} label={segmentLabel(seg) ?? seg} isActive={segment === seg} onClick={() => setSegment(seg as BitcoinSegment)} />
        ))}
      </div>
    </div>
  )
}

function SegmentPill({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={isActive}
      className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer transition-all duration-100 border focus-ring"
      style={isActive
        ? { background: 'var(--probex-primary-dim)', borderColor: 'var(--probex-yes-border)', color: 'var(--probex-primary)' }
        : { background: 'transparent', borderColor: 'var(--probex-border)', color: 'var(--probex-text-secondary)' }
      }
    >
      {label}
    </button>
  )
}
