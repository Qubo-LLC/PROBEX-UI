'use client'

// StatusChip — the single badge shape for every status in the product.
//
// Before this existed, HEALTHY / CRITICAL / PAPER / LIVE / CONNECTED were each
// hand-rolled at their call site with slightly different padding, radius, case
// and colour treatment. Consolidating them is what makes a dashboard read as
// one system rather than as a collection of screens.
//
// Design register is Linear/Vercel rather than a solid filled badge: a soft
// tinted fill, a hairline border of the same hue, and a small indicator dot.
// A saturated block of colour reads as an alert; a tinted chip reads as
// information, which is what a status usually is.
//
// Tone is passed to CSS as --chip-color and the fill, border and dot all
// derive from it (see `.chip` in globals.css), so adding a status means
// choosing a colour and nothing else.

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type ChipTone =
  | 'neutral'
  | 'positive'
  | 'warning'
  | 'danger'
  | 'info'
  | 'accent'

const TONE_VAR: Record<ChipTone, string> = {
  neutral:  'var(--probex-text-muted)',
  positive: 'var(--probex-positive)',
  warning:  'var(--probex-warning)',
  danger:   'var(--probex-negative)',
  info:     'var(--probex-primary)',
  accent:   'var(--probex-secondary)',
}

interface StatusChipProps {
  children:  ReactNode
  tone?:     ChipTone
  /** Show the leading indicator dot. */
  dot?:      boolean
  /** Animate the dot. Reserve for states that are genuinely ongoing —
   *  a pulsing dot on a static status is noise. */
  live?:     boolean
  className?: string
  title?:    string
}

export function StatusChip({
  children, tone = 'neutral', dot = true, live = false, className, title,
}: StatusChipProps) {
  return (
    <span
      className={cn('chip', className)}
      style={{ ['--chip-color' as string]: TONE_VAR[tone] }}
      {...(title !== undefined ? { title } : {})}
    >
      {dot && <span className={cn('chip-dot', live && 'chip-dot-live')} aria-hidden="true" />}
      {children}
    </span>
  )
}

/**
 * Maps the engine's own status vocabulary to a tone, so callers don't each
 * re-derive it. Unknown values fall back to neutral rather than throwing —
 * the backend can add a state without breaking the UI.
 */
export function toneForStatus(status: string | null | undefined): ChipTone {
  switch ((status ?? '').toLowerCase()) {
    case 'healthy':
    case 'online':
    case 'connected':
    case 'running':
    case 'enabled':
    case 'live':
      return 'positive'
    case 'degraded':
    case 'caution':
    case 'wounded':
    case 'warning':
    case 'pending':
      return 'warning'
    case 'critical':
    case 'danger':
    case 'dead':
    case 'offline':
    case 'error':
    case 'failed':
      return 'danger'
    case 'paper':
    case 'simulated':
      return 'info'
    default:
      return 'neutral'
  }
}
