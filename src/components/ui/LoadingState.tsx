import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// ─── Skeleton ────────────────────────────────────────────────────────────

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Height of the skeleton block */
  height?:  string | number
  /** Width of the skeleton block */
  width?:   string | number
  /** Whether to render as a circle (for avatars) */
  rounded?: boolean
}

/**
 * Skeleton
 * ────────
 * Animated loading placeholder that matches the element it replaces.
 *
 * Usage:
 *   <Skeleton height={24} width={120} />
 *   <Skeleton height={40} width={40} rounded />  // avatar
 */
export function Skeleton({
  height,
  width,
  rounded = false,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton',
        rounded ? 'rounded-full' : 'rounded',
        className,
      )}
      style={{
        height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        width:  width  !== undefined ? (typeof width  === 'number' ? `${width}px`  : width)  : undefined,
        ...style,
      }}
      role="status"
      aria-label="Loading"
      {...props}
    />
  )
}

// ─── Stat card skeleton ───────────────────────────────────────────────────

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('card p-4 flex flex-col gap-2 min-h-[88px]', className)}
    >
      <Skeleton height={10} width={80} />
      <Skeleton height={28} width={100} />
      <Skeleton height={12} width={60} />
    </div>
  )
}

// ─── Table row skeleton ───────────────────────────────────────────────────

interface TableRowSkeletonProps {
  columns?: number
  rows?:    number
}

export function TableRowSkeleton({ columns = 6, rows = 5 }: TableRowSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td
              key={colIndex}
              className="px-3 py-2.5"
              // Row separator (bottom border on every row except the last),
              // preserving the look of the former table-CSS row rules.
              style={rowIndex < rows - 1 ? { borderBottom: '1px solid var(--probex-border)' } : undefined}
            >
              <Skeleton
                height={16}
                width={colIndex === 0 ? 160 : 80}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ─── Page loading spinner ─────────────────────────────────────────────────

interface SpinnerProps {
  size?:      'sm' | 'md' | 'lg'
  className?: string
  label?:     string
}

const spinnerSizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
}

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'rounded-full border-transparent animate-spin',
        spinnerSizes[size],
        className,
      )}
      style={{
        borderTopColor: 'var(--probex-primary)',
        borderLeftColor: 'var(--probex-primary)',
        borderRightColor: 'var(--probex-border-default)',
        borderBottomColor: 'var(--probex-border-default)',
      }}
    />
  )
}

// ─── Full-page loading state ──────────────────────────────────────────────

interface LoadingStateProps {
  label?:     string
  className?: string
}

export function LoadingState({ label = 'Loading', className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16',
        className,
      )}
      role="status"
    >
      <Spinner size="lg" />
      <p className="text-xs" style={{ color: 'var(--probex-text-muted)' }}>
        {label}
      </p>
    </div>
  )
}

// ─── Card skeleton ────────────────────────────────────────────────────────

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('card p-4 flex flex-col gap-3', className)}>
      <Skeleton height={14} width={140} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}

// ─── Chart skeleton ───────────────────────────────────────────────────────

export function ChartSkeleton({ height = 220, className }: { height?: number; className?: string }) {
  return (
    <div className={cn('card p-4 flex flex-col gap-3', className)}>
      <Skeleton height={14} width={160} />
      <Skeleton height={height} width="100%" />
    </div>
  )
}

// ─── Page header skeleton ─────────────────────────────────────────────────

/** Title + subtitle block matching PageHeader / page title rows. */
export function PageHeaderSkeleton({ withActions = false }: { withActions?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton height={22} width={180} />
        <Skeleton height={12} width={280} />
      </div>
      {withActions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Skeleton height={36} width={120} />
          <Skeleton height={36} width={36} />
        </div>
      )}
    </div>
  )
}

// ─── Full table skeleton (card-wrapped, with header) ──────────────────────

export function TableSkeleton({
  columns = 6, rows = 8, className,
}: { columns?: number; rows?: number; className?: string }) {
  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: 'var(--probex-border)' }}>
        <Skeleton height={14} width={160} />
        <div className="ml-auto"><Skeleton height={32} width={200} /></div>
      </div>
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <TableRowSkeleton columns={columns} rows={rows} />
        </tbody>
      </table>
    </div>
  )
}

// ─── Pill / filter row skeleton ───────────────────────────────────────────

export function PillRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={28} width={72} />
      ))}
    </div>
  )
}
