'use client'

// GlobalConsensusBar — platform-wide consensus strip for Overview.
//
// ─── Why this was rendering nothing ──────────────────────────────────────────
// This component was built as an AwaitingBackend shell for "CE-1", guarded by
// `if (consensusGlobal.available) return null`. That is correct only while the
// endpoint does not exist. `ENDPOINTS.consensus.global` was later promoted to
// 'confirmed' (the backend does ship /api/consensus), and the guard did exactly
// what it says: the entire section vanished from Overview. The shell was
// designed to be replaced by a live branch, and the live branch was never
// written — so the flip silently deleted the feature instead of activating it.
//
// ─── What the endpoint actually returns ──────────────────────────────────────
// Verified 2026-08-20: /api/consensus answers with ONE OF TWO shapes. When the
// consensus engine has produced a score it returns the full reading; when it
// has not it returns `{ available: false, message: "No consensus calculated
// yet" }` with no `consensus` key at all. Both are 200s from a working
// endpoint, so neither is "awaiting backend" and neither is an error. The
// second is its own state, and it gets its own honest presentation here.

import { useApplicationStore } from '@/store/applicationStore'
import { useEndpointAvailability } from '@/config/hooks/useEndpointAvailability'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { AwaitingBackend } from '@/components/shared/AwaitingBackend'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { formatPercent } from '@/lib/utils'

export function GlobalConsensusBar() {
  const consensusGlobal = useEndpointAvailability(ENDPOINTS.consensus.global)
  const slice = useApplicationStore((s) => s.engine.consensus)

  // Registry says no such endpoint → the original shell is still the right
  // answer. Kept so a future de-confirmation degrades gracefully rather than
  // reintroducing the blank-section bug in the other direction.
  if (!consensusGlobal.available) {
    return (
      <div
        role="region"
        aria-label="Global consensus intelligence"
        className="px-5 py-3 rounded-md"
        style={{ background: 'var(--probex-surface)', border: '1px dashed var(--probex-border-default)' }}
      >
        <AwaitingBackend
          bare
          layout="inline"
          title="Global Consensus"
          description="Platform-wide score, participation, and bullish/bearish split across all markets."
          endpoint="CE-1"
        />
      </div>
    )
  }

  const envelope = slice.status === 'success' ? slice.data : null
  const reading  = envelope?.reading ?? null

  // Three distinct situations, three distinct readings of the same strip:
  //   reading present   → the real score
  //   envelope, no read → engine answered "nothing computed yet" (+ its reason)
  //   no envelope       → still loading, or the request failed
  const statusLine =
    reading !== null
      ? null
      : envelope !== null
        ? envelope.message ?? 'The engine has not calculated a consensus yet.'
        : slice.status === 'error'
          ? slice.error?.message ?? 'Consensus request failed.'
          : 'Reading consensus…'

  const score = reading?.score ?? null
  const color =
    score === null || Math.abs(score) < 0.05
      ? 'var(--probex-text-muted)'
      : score > 0 ? 'var(--probex-yes)' : 'var(--probex-no)'

  return (
    <div
      role="region"
      aria-label="Global consensus intelligence"
      className="px-5 py-3 rounded-md flex items-center justify-between gap-4 flex-wrap"
      style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--probex-text-primary)' }}>
            Global Consensus
          </h2>
          {/* 'idle' asserts the endpoint ANSWERED and had nothing to report, so
              it is only correct once an envelope actually arrived. While the
              slice is loading or errored we have no such evidence — claim
              'live' and let ProvenanceBadge's global downgrade turn it into
              'No feed' if the engine is unreachable. */}
          <ProvenanceBadge
            provenance={reading ? 'live' : envelope !== null ? 'idle' : 'live'}
            detail="/api/consensus"
            state={slice}
          />
        </div>
        <p className="text-2xs truncate" style={{ color: 'var(--probex-text-muted)' }}>
          {reading !== null
            ? `${reading.signalCount} signals aggregated platform-wide`
            : statusLine}
        </p>
      </div>

      {reading !== null && (
        <div className="flex items-center gap-5 flex-shrink-0">
          <Stat label="Score"          value={reading.score.toFixed(2)} color={color} />
          <Stat label="Confidence"     value={formatPercent(reading.confidence)} />
          <Stat label="Interpretation" value={reading.interpretation} />
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-2xs uppercase tracking-wider font-medium" style={{ color: 'var(--probex-text-muted)' }}>
        {label}
      </span>
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: color ?? 'var(--probex-text-primary)' }}
      >
        {value}
      </span>
    </div>
  )
}
