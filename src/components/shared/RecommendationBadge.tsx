'use client'

// RecommendationBadge — restored from V1's LiveMarketRow (git 0e3833a4).
// Unlike V1's consensus-derived badges, `recommendation` is a real field on
// the documented EngineEdgeItemDTO ('strong_buy_yes'|'buy_yes'|'hold'|
// 'buy_no'|'strong_buy_no') — this restores unchanged visually because the
// data underneath it was always genuinely live, just unused until now.
// Unrecognized strings render as a neutral fallback rather than guessing.

const REC_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  strong_buy_yes: {
    bg: 'color-mix(in srgb, var(--probex-yes) 18%, transparent)',
    color: 'var(--probex-yes)',
    border: 'color-mix(in srgb, var(--probex-yes) 40%, transparent)',
  },
  buy_yes: {
    bg: 'color-mix(in srgb, var(--probex-yes) 10%, transparent)',
    color: 'var(--probex-yes)',
    border: 'color-mix(in srgb, var(--probex-yes) 25%, transparent)',
  },
  hold: {
    bg: 'var(--probex-surface-2)',
    color: 'var(--probex-text-muted)',
    border: 'var(--probex-border)',
  },
  buy_no: {
    bg: 'color-mix(in srgb, var(--probex-no) 10%, transparent)',
    color: 'var(--probex-no)',
    border: 'color-mix(in srgb, var(--probex-no) 25%, transparent)',
  },
  strong_buy_no: {
    bg: 'color-mix(in srgb, var(--probex-no) 18%, transparent)',
    color: 'var(--probex-no)',
    border: 'color-mix(in srgb, var(--probex-no) 40%, transparent)',
  },
}

const LABEL: Record<string, string> = {
  strong_buy_yes: 'Strong Buy Yes',
  buy_yes:        'Buy Yes',
  hold:           'Hold',
  buy_no:         'Buy No',
  strong_buy_no:  'Strong Buy No',
}

export function RecommendationBadge({ recommendation, className = '' }: { recommendation: string | null; className?: string }) {
  if (recommendation === null) return null
  const style = REC_STYLE[recommendation] ?? REC_STYLE.hold!
  const label = LABEL[recommendation] ?? recommendation

  return (
    <span
      className={`inline-block text-2xs font-bold uppercase tracking-wider rounded px-1.5 py-0.5 whitespace-nowrap ${className}`}
      style={{ backgroundColor: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      {label}
    </span>
  )
}
