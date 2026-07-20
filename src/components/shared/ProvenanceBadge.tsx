'use client'

// ProvenanceBadge — the V3 data-lineage grammar (PROBEX_V3_RESTORATION_PLAN §0,
// system 1). Every value in the product can declare *how it is known*:
//
//   live     — polled directly from a confirmed engine endpoint
//   derived  — computed client-side from live values (labelled, not measured)
//   awaiting — the backing endpoint does not exist yet (paired with AwaitingBackend)
//   stale    — last-known value; the source has stopped updating
//
// This turns the truth-first constraint into a premium, institutional signal
// (Aladdin-style data lineage) rather than an apology. Colour comes entirely
// from theme tokens so all five themes are covered.

export type Provenance = 'live' | 'derived' | 'awaiting' | 'stale'

interface ProvenanceBadgeProps {
  provenance: Provenance
  /** Optional detail shown after the label, e.g. an endpoint id ("CE-2"). */
  detail?:    string
  className?: string
}

const CONFIG: Record<Provenance, { label: string; color: string; dot: boolean; pulse: boolean }> = {
  live:     { label: 'Live',     color: 'var(--probex-positive)',      dot: true,  pulse: true  },
  derived:  { label: 'Derived',  color: 'var(--probex-text-muted)',    dot: false, pulse: false },
  awaiting: { label: 'Awaiting', color: 'var(--probex-warning)',       dot: true,  pulse: false },
  stale:    { label: 'Stale',    color: 'var(--probex-text-disabled)', dot: true,  pulse: false },
}

export function ProvenanceBadge({ provenance, detail, className = '' }: ProvenanceBadgeProps) {
  const c = CONFIG[provenance]
  return (
    <span
      className={`inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-wider ${className}`}
      style={{ color: c.color }}
      title={detail ? `${c.label} — ${detail}` : c.label}
      aria-label={`Data source: ${c.label}${detail ? ` (${detail})` : ''}`}
    >
      {c.dot && (
        <span
          className={c.pulse ? 'live-dot w-1.5 h-1.5' : 'w-1.5 h-1.5 rounded-full inline-block'}
          style={{ background: c.color }}
          aria-hidden="true"
        />
      )}
      <span>{c.label}</span>
      {detail && (
        <span className="font-medium normal-case" style={{ color: 'var(--probex-text-disabled)' }}>
          · {detail}
        </span>
      )}
    </span>
  )
}
