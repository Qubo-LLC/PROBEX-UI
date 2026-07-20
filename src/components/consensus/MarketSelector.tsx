'use client'

// MarketSelector — restored from V1 (git 0e3833a4), a searchable combobox
// (keyboard-accessible, listbox pattern). V1 showed each market's fabricated
// consensus score in the dropdown; V3 shows its live edge magnitude instead
// (from /api/edges) — the same "at a glance" utility, backed by real data.

import { useState } from 'react'
import { segmentLabel } from '@/lib/display/market'
import type { MarketRow } from '@/lib/mappers/markets'
import type { EdgeRow } from '@/lib/mappers/edges'

interface MarketSelectorProps {
  markets:  MarketRow[]
  edgeMap:  Map<string, EdgeRow>
  value:    string | null
  onSelect: (marketId: string) => void
}

export function MarketSelector({ markets, edgeMap, value, onSelect }: MarketSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const current  = markets.find((m) => m.id === value)
  const filtered = markets
    .filter((m) => m.title.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8)

  const choose = (id: string) => { onSelect(id); setOpen(false); setQuery('') }

  return (
    <div className="relative w-full sm:w-[420px] sm:max-w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer text-left transition-colors duration-100 focus-ring"
        style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border-default)' }}
      >
        <span className="text-sm font-medium truncate" style={{ color: current ? 'var(--probex-text-primary)' : 'var(--probex-text-muted)' }}>
          {current?.title ?? 'Select a market…'}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ color: 'var(--probex-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0" style={{ zIndex: 30 }} onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden"
            style={{ zIndex: 31, background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border-default)', boxShadow: '0 12px 32px rgba(0,0,0,0.28)' }}
            role="listbox"
            aria-label="Markets"
          >
            <div style={{ padding: 8, borderBottom: '1px solid var(--probex-border)' }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search markets…"
                aria-label="Search markets"
                autoFocus
                className="input-base text-sm"
              />
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: 'var(--probex-text-muted)' }}>No markets found</p>
              ) : filtered.map((m) => {
                const edge = edgeMap.get(m.id)
                const isActive = m.id === value
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => choose(m.id)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left cursor-pointer transition-colors duration-100"
                    style={{ background: isActive ? 'var(--probex-primary-dim)' : 'transparent', borderBottom: '1px solid var(--probex-border)' }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate" style={{ color: isActive ? 'var(--probex-primary)' : 'var(--probex-text-primary)' }}>{m.title}</span>
                      <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{segmentLabel(m.segment) ?? '—'}</span>
                    </div>
                    {edge && (
                      <span className="text-xs font-bold tabular-nums flex-shrink-0" style={{ color: edge.direction === 'yes' ? 'var(--probex-yes)' : 'var(--probex-no)' }}>
                        {edge.edgePct.toFixed(1)}%
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
