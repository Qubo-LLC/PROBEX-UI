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
        !noPadding && 'p-4',
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
      className={cn('flex items-center justify-between mb-3', className)}
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
  return (
    <Tag
      className={cn('text-sm font-semibold text-text-primary', className)}
      {...props}
    >
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
