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
import { useSystemStatus } from '@/config/hooks/useSystemStatus'
import { formatPercent } from '@/lib/utils'
import { readingFreshness } from '@/lib/display/consensus'

export function GlobalConsensusBar() {
  const consensusGlobal = useEndpointAvailability(ENDPOINTS.consensus.global)
  const slice = useApplicationStore((s) => s.engine.consensus)
  const { dataIsSynthetic } = useSystemStatus()

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

  const freshness = reading !== null ? readingFreshness(reading) : null
  const score = reading?.score ?? null
  const color =
    score === null || Math.abs(score) < 0.05
      ? 'var(--probex-text-muted)'
      : score > 0 ? 'var(--probex-yes)' : 'var(--probex-no)'

  return (
    // ─── A ruled block, not a card ─────────────────────────────────────────
    // This used to be a full-width bordered strip at the very bottom of the
    // page — the third bordered surface in a row after the market cards and the
    // table, and a system-level reading dressed as a market. It now sits beside
    // the engine's field as a rail: a hairline on the left, no fill, figures
    // stacked. Consensus is context ABOUT the field, so it lives next to the
    // field and is visibly secondary to it.
    <div
      role="region"
      aria-label="Global consensus intelligence"
      className="flex flex-col gap-3 pl-4 py-1"
      style={{ borderLeft: '1px solid var(--probex-border-strong)' }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="t-label">
            Global consensus
          </h3>
          {/* ─── The badge speaks only when it has something to warn about ────
              This was the last affirmative LIVE badge on Overview. The page
              makes one freshness claim at the top; a healthy reading here does
              not need to restate it, and doing so was exactly the repetition
              that made "Live" stop meaning anything.

              It still renders for every non-affirmative state, and those are
              the states that matter: no reading yet (idle / loading /
              unreachable — ProvenanceBadge's own downgrade decides which),
              a retained reading whose refresh failed (stale), and generated
              data (synthetic). Quiet the affirmation, keep the warnings loud.

              'idle' asserts the endpoint ANSWERED and had nothing to report, so
              it is only correct once an envelope actually arrived. While the
              slice is loading or errored we have no such evidence — claim
              'live' and let the global downgrade turn it into 'No feed'. */}
          {(reading === null || slice.isStale || dataIsSynthetic) && (
            <ProvenanceBadge
              provenance={reading ? 'live' : envelope !== null ? 'idle' : 'live'}
              detail="/api/consensus"
              state={slice}
            />
          )}
        </div>
        {/* The reading's AGE, in the same words the Consensus page uses. A
            composite computed on Sunday is a snapshot, and the score above
            must not read as this morning's; the qualifier turns warning once
            the reading is older than READING_STALE_AFTER_MS. */}
        <p className="text-2xs truncate" style={{ color: freshness?.stale ? 'var(--probex-warning)' : 'var(--probex-text-muted)' }}>
          {reading !== null && freshness !== null
            ? `${reading.signalCount} signals · ${freshness.stale ? 'snapshot' : 'read'} ${freshness.ageLabel}`
            : statusLine}
        </p>
      </div>

      {reading !== null && (
        // Stacked in the rail; the score leads at the md register, the two
        // qualifiers sit beneath at row weight.
        <div className="flex flex-col gap-2">
          <Stat label="Score" value={reading.score.toFixed(2)} color={color} lead />
          <div className="flex flex-col gap-1">
            <Stat label="Confidence"     value={formatPercent(reading.confidence)} />
            <Stat label="Interpretation" value={reading.interpretation} />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color, lead = false }: { label: string; value: string; color?: string; lead?: boolean }) {
  if (lead) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="t-metric-md" style={{ color: color ?? 'var(--probex-text-primary)' }}>{value}</span>
        <span className="t-metadata uppercase" style={{ letterSpacing: '0.06em' }}>{label}</span>
      </div>
    )
  }
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>{label}</span>
      <span className="text-2xs font-semibold font-mono tabular-nums capitalize" style={{ color: color ?? 'var(--probex-text-secondary)' }}>
        {value}
      </span>
    </div>
  )
}
