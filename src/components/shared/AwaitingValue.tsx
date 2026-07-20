// AwaitingValue — field-level pending marker (V3 Phase 3 "truthful, never
// empty" directive). AwaitingBackend reserves an entire card/section for a
// capability that doesn't exist; this marks a SINGLE value inside an
// otherwise fully-rendered, fully-styled widget. The widget's layout, icons,
// borders, and structure stay at full visual weight — only the number itself
// reads as pending. One ProvenanceBadge in the widget's header already states
// *why* (which endpoint); repeating that per-field would be noise, so this
// is deliberately just a muted placeholder glyph, sized to match the real
// value it stands in for.

type AwaitingValueSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE: Record<AwaitingValueSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-xl',
  xl: 'text-4xl',
}

export function AwaitingValue({ size = 'md', className = '' }: { size?: AwaitingValueSize; className?: string }) {
  return (
    <span
      className={`${SIZE[size]} font-bold tabular-nums ${className}`}
      style={{ color: 'var(--probex-text-disabled)' }}
      aria-label="Awaiting data"
    >
      —
    </span>
  )
}
