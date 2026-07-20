'use client'

// ProbabilityValue — restored from V1's ProbabilityDisplay (git 0e3833a4),
// rebuilt on the shared ValueFlash primitive instead of duplicating its own
// flash-on-change state (V1 had a bespoke useRef/useEffect flash hook here;
// Phase 0's ValueFlash already does this generically).

import { formatPercent } from '@/lib/utils'
import { ValueFlash } from './ValueFlash'

interface ProbabilityValueProps {
  probability: number   // 0–1
  size?:       'sm' | 'md' | 'lg'
  className?:  string
}

const SIZE_CLASS = { sm: 'text-xs', md: 'text-base', lg: 'text-xl' } as const

export function ProbabilityValue({ probability, size = 'md', className = '' }: ProbabilityValueProps) {
  return (
    <span
      className={`inline-flex items-center font-semibold tabular-nums ${SIZE_CLASS[size]} ${className}`}
      style={{ color: 'var(--probex-text-primary)' }}
      aria-label={`Probability: ${formatPercent(probability)}`}
    >
      <ValueFlash value={probability}>{formatPercent(probability)}</ValueFlash>
    </span>
  )
}
