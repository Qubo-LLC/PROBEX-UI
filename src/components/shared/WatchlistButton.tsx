'use client'

// WatchlistButton — restored from V1 (git 0e3833a4), now backed by the real
// preferencesStore (localStorage) instead of V1's sessionStorage mock, which
// lost the watchlist on every browser restart. Cross-device sync remains a
// documented gap (P3-02) — this is real local persistence, not fake data.

import { usePreferencesStore, useIsWatchlisted } from '@/store/preferencesStore'
import { cn } from '@/lib/utils'

interface WatchlistButtonProps {
  marketId:   string
  size?:      'sm' | 'md'
  variant?:   'icon' | 'pill'
  className?: string
}

export function WatchlistButton({ marketId, size = 'sm', variant = 'icon', className }: WatchlistButtonProps) {
  const isWatching = useIsWatchlisted(marketId)
  const toggle = usePreferencesStore((s) => s.toggleWatchlist)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    toggle(marketId)
  }

  const starColor = isWatching ? 'var(--probex-warning)' : 'var(--probex-text-muted)'
  const iconSize  = size === 'sm' ? 13 : 15

  if (variant === 'pill') {
    return (
      <button
        onClick={handleClick}
        type="button"
        aria-label={isWatching ? 'Remove from watchlist' : 'Add to watchlist'}
        aria-pressed={isWatching}
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md cursor-pointer transition-all duration-150',
          className,
        )}
        style={isWatching
          ? { background: 'var(--probex-warning-dim)', color: 'var(--probex-warning)', border: '1px solid var(--probex-warning-border)' }
          : { background: 'var(--probex-surface-2)', color: 'var(--probex-text-secondary)', border: '1px solid var(--probex-border)' }
        }
      >
        <StarIcon size={iconSize} filled={isWatching} color={starColor} />
        {isWatching ? 'Watchlisted' : 'Watchlist'}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      type="button"
      aria-label={isWatching ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-pressed={isWatching}
      className={cn(
        'flex items-center justify-center rounded cursor-pointer transition-transform duration-150 active:scale-90',
        size === 'sm' ? 'w-6 h-6' : 'w-7 h-7',
        className,
      )}
      style={{ background: isWatching ? 'var(--probex-warning-dim)' : 'transparent' }}
    >
      <StarIcon size={iconSize} filled={isWatching} color={starColor} />
    </button>
  )
}

function StarIcon({ size, filled, color }: { size: number; filled: boolean; color: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? color : 'none'} stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transition: 'fill 0.15s, color 0.15s' }}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
