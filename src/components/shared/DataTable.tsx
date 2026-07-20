'use client'

// Minimal table primitives shared across the cockpit's data consoles
// (EdgeTable, Live Feed market cycle, Positions). Consistent header/cell
// styling in one place; each console supplies its own columns and rows.

import type { ReactNode } from 'react'

type Align = 'left' | 'right' | 'center'

/** Bordered, horizontally-scrollable table shell. */
export function TableShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md" style={{ border: '1px solid var(--probex-border)' }}>
      <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }} aria-label={label}>
        {children}
      </table>
    </div>
  )
}

/** Header row wrapper — expects <Th> children. */
export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr style={{ background: 'var(--probex-surface)' }}>{children}</tr>
    </thead>
  )
}

export function Th({ children, align = 'left', dense = false }: { children: ReactNode; align?: Align; dense?: boolean }) {
  return (
    <th
      scope="col"
      className={`${dense ? 'px-2.5 py-1.5' : 'px-3 py-2'} text-2xs font-semibold uppercase tracking-wider whitespace-nowrap`}
      style={{ color: 'var(--probex-text-muted)', textAlign: align }}
    >
      {children}
    </th>
  )
}

/** Body row with the standard top border and a subtle hover for scanability. */
export function Tr({ children, onClick }: { children: ReactNode; onClick?: (() => void) | undefined }) {
  return (
    <tr
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      className={`transition-colors duration-100 hover:bg-[var(--probex-surface)]${onClick ? ' cursor-pointer' : ''}`}
      style={{ borderTop: '1px solid var(--probex-border)' }}
    >
      {children}
    </tr>
  )
}

export function Td({ children, align = 'left', className, dense = false }: { children: ReactNode; align?: Align; className?: string; dense?: boolean }) {
  return (
    <td className={`${dense ? 'px-2.5 py-1.5' : 'px-3 py-2'} whitespace-nowrap${className ? ` ${className}` : ''}`} style={{ textAlign: align }}>
      {children}
    </td>
  )
}
