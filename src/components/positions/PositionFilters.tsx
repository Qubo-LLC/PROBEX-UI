'use client'

// PositionFilters — restored from V1 (git 0e3833a4). V1 persisted these in a
// portfolioStore and included a "Consensus Alignment" pill (fabricated,
// dropped). Positions filters have exactly one consumer (this page), so per
// the project's "don't create a store without a second real consumer" rule
// they stay as local component state rather than growing uiStore.

import { BITCOIN_SEGMENTS, type BitcoinSegment } from '@/types/market'
import { segmentLabel } from '@/lib/display/market'

export type Side = 'yes' | 'no'
export type PnlState = 'profit' | 'loss'

interface PositionFiltersProps {
  search:        string
  onSearchChange: (v: string) => void
  side:          Side | null
  onSideChange:  (v: Side | null) => void
  segment:       BitcoinSegment | null
  onSegmentChange: (v: BitcoinSegment | null) => void
  pnlState:      PnlState | null
  onPnlChange:   (v: PnlState | null) => void
}

export function PositionFilters({
  search, onSearchChange, side, onSideChange, segment, onSegmentChange, pnlState, onPnlChange,
}: PositionFiltersProps) {
  const hasActiveFilter = Boolean(search || side || segment || pnlState)

  const reset = () => { onSearchChange(''); onSideChange(null); onSegmentChange(null); onPnlChange(null) }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ color: 'var(--probex-text-muted)' }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search positions…"
            className="input-base h-8 pl-8 pr-3 text-sm w-full"
            aria-label="Search positions"
          />
        </div>

        <PillGroup label="Side" value={side} onChange={onSideChange} options={[
          { value: 'yes', label: 'YES', color: 'var(--probex-yes)' },
          { value: 'no', label: 'NO', color: 'var(--probex-no)' },
        ]} />

        <PillGroup label="P&L" value={pnlState} onChange={onPnlChange} options={[
          { value: 'profit', label: 'Profit', color: 'var(--probex-positive)' },
          { value: 'loss', label: 'Loss', color: 'var(--probex-negative)' },
        ]} />

        {hasActiveFilter && (
          <button onClick={reset} className="text-xs px-2.5 py-1.5 rounded-md cursor-pointer transition-colors duration-100" style={{ background: 'var(--probex-negative-dim)', color: 'var(--probex-negative)', border: '1px solid rgba(239,68,68,0.15)' }}>
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar" role="tablist" aria-label="Filter by segment">
        <SegmentPill label="All" isActive={segment === null} onClick={() => onSegmentChange(null)} />
        {BITCOIN_SEGMENTS.map((seg) => (
          <SegmentPill key={seg} label={segmentLabel(seg) ?? seg} isActive={segment === seg} onClick={() => onSegmentChange(segment === seg ? null : seg)} />
        ))}
      </div>
    </div>
  )
}

function PillGroup<T extends string>({ label, value, options, onChange }: { label: string; value: T | null; options: Array<{ value: T; label: string; color: string }>; onChange: (v: T | null) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-2xs font-medium uppercase tracking-wider mr-0.5" style={{ color: 'var(--probex-text-disabled)' }}>{label}</span>
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(isActive ? null : opt.value)}
            aria-pressed={isActive}
            className="text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-all duration-100 border"
            style={isActive
              ? { background: `color-mix(in srgb, ${opt.color} 14%, transparent)`, borderColor: `color-mix(in srgb, ${opt.color} 30%, transparent)`, color: opt.color }
              : { background: 'transparent', borderColor: 'var(--probex-border)', color: 'var(--probex-text-secondary)' }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function SegmentPill({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={isActive}
      className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer transition-all duration-120 border"
      style={isActive
        ? { background: 'var(--probex-primary-dim)', borderColor: 'var(--probex-yes-border)', color: 'var(--probex-primary)' }
        : { background: 'transparent', borderColor: 'var(--probex-border)', color: 'var(--probex-text-secondary)' }}
    >
      {label}
    </button>
  )
}
