'use client'

// ValueFlash — the V3 liveness primitive (PROBEX_V3_RESTORATION_PLAN §0,
// system 4). Wraps any live value and gives it a brief tinted flash whenever it
// changes, so the operator *feels* the 2s polling cadence — the Bloomberg
// flashing-cell idiom, on the engine's real data.
//
// Directional by default: a numeric increase flashes positive, a decrease
// negative, a non-numeric change flashes neutral (primary). Fully theme-token
// driven. The fade-out is a CSS transition, so the global reduced-motion rule
// collapses it to an instant, non-distracting state change automatically.

import { useEffect, useRef, useState, type ReactNode } from 'react'

type FlashTone = 'positive' | 'negative' | 'neutral'

interface ValueFlashProps {
  /** The value to watch. A change triggers the flash. */
  value:      number | string
  children:   ReactNode
  /** Force a tone instead of inferring direction from numeric change. */
  tone?:      FlashTone
  /** Flash hold before fade-out (ms). */
  durationMs?: number
  className?: string
}

const TONE_BG: Record<FlashTone, string> = {
  positive: 'var(--probex-positive-dim)',
  negative: 'var(--probex-negative-dim)',
  neutral:  'var(--probex-primary-dim)',
}

export function ValueFlash({ value, children, tone, durationMs = 550, className = '' }: ValueFlashProps) {
  const prev = useRef<number | string>(value)
  const [flash, setFlash] = useState<FlashTone | null>(null)

  useEffect(() => {
    if (value === prev.current) return

    const inferred: FlashTone =
      tone ??
      (typeof value === 'number' && typeof prev.current === 'number'
        ? value > prev.current ? 'positive' : value < prev.current ? 'negative' : 'neutral'
        : 'neutral')

    prev.current = value
    setFlash(inferred)
    const id = setTimeout(() => setFlash(null), durationMs)
    return () => clearTimeout(id)
  }, [value, tone, durationMs])

  return (
    <span
      className={`rounded transition-colors duration-500 ${className}`}
      style={{
        // Negative horizontal padding via box-decoration keeps the tint hugging
        // the value without shifting surrounding layout.
        backgroundColor: flash ? TONE_BG[flash] : 'transparent',
        boxDecorationBreak: 'clone',
        padding: flash ? '0 3px' : '0',
        margin:  flash ? '0 -3px' : '0',
      }}
    >
      {children}
    </span>
  )
}
