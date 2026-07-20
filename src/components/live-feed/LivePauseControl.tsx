'use client'

// LivePauseControl — restored from V1 (git 0e3833a4). V1 paused a simulated
// WebSocket stream; V3 has no stream to pause, but the same operator need is
// real: freeze what's on screen without losing the engine's own polling.
// "Pause" here means "stop this view from adopting new polled snapshots" —
// the underlying ApplicationStateLoader keeps polling regardless (owned
// globally, untouched). Purely a display-freeze, honestly labelled as such.

interface LivePauseControlProps {
  isPaused: boolean
  onToggle: () => void
}

export function LivePauseControl({ isPaused, onToggle }: LivePauseControlProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isPaused}
      aria-label={isPaused ? 'Resume live view' : 'Pause live view'}
      title={isPaused ? 'View frozen — the engine keeps polling in the background' : 'Freeze this view'}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 focus-ring"
      style={isPaused
        ? { background: 'var(--probex-warning-dim)', color: 'var(--probex-warning)', border: '1px solid var(--probex-warning-border)' }
        : { background: 'var(--probex-surface-2)', color: 'var(--probex-text-secondary)', border: '1px solid var(--probex-border-default)' }
      }
    >
      {isPaused ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><polygon points="2,1 11,6 2,11" /></svg>
          Resume
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <rect x="1" y="1" width="4" height="10" rx="1" /><rect x="7" y="1" width="4" height="10" rx="1" />
          </svg>
          Pause
        </>
      )}
    </button>
  )
}
