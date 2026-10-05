'use client'

import type { ReactNode } from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'

/**
 * Tooltip
 * ───────
 * Design-system tooltip built on Radix (installed). Accessible by default
 * (keyboard focus + hover, ARIA wiring, collision-aware positioning).
 *
 * The app mounts a single <TooltipProvider> at the providers root, so individual
 * tooltips don't need their own provider. Usage:
 *
 *   <Tooltip content="Pause trading">
 *     <button>⏸</button>
 *   </Tooltip>
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 250,
}: {
  content:        ReactNode
  children:       ReactNode
  side?:          'top' | 'right' | 'bottom' | 'left'
  align?:         'start' | 'center' | 'end'
  delayDuration?: number
}) {
  if (content === undefined || content === null || content === '') return <>{children}</>

  return (
    <RadixTooltip.Root delayDuration={delayDuration}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          className="z-[60] max-w-xs px-2.5 py-1.5 rounded-md text-2xs font-medium shadow-lg animate-fade-in-up"
          style={{
            background: 'var(--synatra-surface-2)',
            border:     '1px solid var(--synatra-border-default)',
            color:      'var(--synatra-text-primary)',
          }}
        >
          {content}
          <RadixTooltip.Arrow style={{ fill: 'var(--synatra-surface-2)' }} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}

/** Provider — mounted once at the app root. Re-exported for convenience. */
export const TooltipProvider = RadixTooltip.Provider
