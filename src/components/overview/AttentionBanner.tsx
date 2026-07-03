'use client'

// Operator attention strip — the first thing the eye should hit when something
// is wrong, and invisible when everything is nominal. Items come pre-sorted
// (critical first) from the Command Center mapper; nothing is invented here.

import type { AttentionItem } from '@/lib/mappers/overview'

interface AttentionBannerProps {
  items: AttentionItem[]
}

export function AttentionBanner({ items }: AttentionBannerProps) {
  if (items.length === 0) return null

  return (
    <div role="alert" aria-live="assertive" className="flex flex-col gap-1.5">
      {items.map((item, i) => {
        const isCritical = item.severity === 'critical'
        const color      = isCritical ? 'var(--probex-negative)' : 'var(--probex-warning)'
        return (
          <div
            key={`${item.message}-${i}`}
            className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5"
            style={{
              background: isCritical ? 'var(--probex-negative-dim)' : 'var(--probex-warning-dim)',
              border:     `1px solid ${isCritical ? 'var(--probex-negative-border)' : 'var(--probex-warning-border)'}`,
            }}
          >
            <AlertIcon color={color} />
            <span className="text-xs font-semibold" style={{ color }}>
              {item.message}
            </span>
            {item.detail && (
              <span className="text-xs truncate" style={{ color: 'var(--probex-text-muted)' }}>
                {item.detail}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AlertIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
