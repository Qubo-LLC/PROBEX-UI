'use client'

// Identity strip — answers "is the engine running?" in one glance:
// bot name, version, mode badge (safety-critical: PAPER vs LIVE), uptime,
// and an all-clear dot when no attention items are active.

import { formatUptime } from '@/lib/display/engine'
import type { EngineMode } from '@/types/engine'

interface IdentityStripProps {
  /** null while the identity endpoint has not resolved. */
  identity: {
    botName: string
    version: string
    mode:    EngineMode
  } | null
  /** null while /api/stats has not resolved. */
  uptimeSeconds: number | null
  /** True when the attention list is empty and stats are flowing. */
  allClear: boolean
}

export function IdentityStrip({ identity, uptimeSeconds, allClear }: IdentityStripProps) {
  return (
    <header className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-xl font-bold leading-tight truncate" style={{ color: 'var(--probex-text-primary)' }}>
          {identity ? identity.botName : 'Command Center'}
        </h1>
        {identity && (
          <>
            <span className="text-xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
              v{identity.version}
            </span>
            <ModeBadge mode={identity.mode} />
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {uptimeSeconds !== null && (
          <span className="text-xs tabular-nums" style={{ color: 'var(--probex-text-muted)' }}>
            Uptime {formatUptime(uptimeSeconds)}
          </span>
        )}
        {allClear && (
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--probex-positive)' }}>
            <span className="live-dot w-1.5 h-1.5" aria-hidden="true" />
            All systems nominal
          </span>
        )}
      </div>
    </header>
  )
}

/** PAPER (neutral) vs LIVE (loud) — the operator must never mistake the mode. */
function ModeBadge({ mode }: { mode: EngineMode }) {
  const isLive = mode === 'live'
  return (
    <span
      className="text-2xs font-bold uppercase tracking-wider rounded px-1.5 py-0.5"
      style={
        isLive
          ? { background: 'var(--probex-negative-dim)', color: 'var(--probex-negative)', border: '1px solid var(--probex-negative-border)' }
          : { background: 'var(--probex-surface-2)', color: 'var(--probex-text-secondary)', border: '1px solid var(--probex-border)' }
      }
    >
      {mode}
    </span>
  )
}
