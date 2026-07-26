import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ─── Card variants ─────────────────────────────────────────────────────────

type CardVariant = 'default' | 'elevated' | 'interactive' | 'recessed'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?:    CardVariant
  noPadding?:  boolean
  children:    ReactNode
}

const variantStyles: Record<CardVariant, string> = {
  default:     'card',
  elevated:    'card-elevated',
  interactive: 'card-interactive',
  recessed:    'card-recessed',
}

/**
 * Card
 * ────
 * Base card container. Applies the correct surface color, border, and
 * border-radius from the active Probex theme.
 *
 * Usage:
 *   <Card>content</Card>
 *   <Card variant="interactive" onClick={...}>clickable card</Card>
 *   <Card variant="elevated" noPadding>no internal padding</Card>
 */
export function Card({
  variant   = 'default',
  noPadding = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        variantStyles[variant],
        // p-5 (20px) on the 8px rhythm's half-step. p-4 was measurably tight
        // for the density here — content sat close enough to the border that
        // cards read as boxes of text rather than as composed surfaces.
        !noPadding && 'p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ─── Card sub-components ──────────────────────────────────────────────────

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-center justify-between mb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'
}

export function CardTitle({ as: Tag = 'h3', className, children, ...props }: CardTitleProps) {
  // t-card-title: small, uppercase, tracked, secondary. A card title's job is
  // to name the surface and then get out of the way — at the previous
  // text-sm/primary it competed with the metric it was introducing.
  return (
    <Tag className={cn('t-card-title', className)} {...props}>
      {children}
    </Tag>
  )
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)} {...props}>
      {children}
    </div>
  )
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn('pt-3 mt-3 border-t border-border-subtle flex items-center', className)}
      {...props}
    >
      {children}
    </div>
  )
}
