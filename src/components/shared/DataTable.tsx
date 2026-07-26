'use client'

// Minimal table primitives shared across the cockpit's data consoles
// (EdgeTable, Live Feed market cycle, Positions). Consistent header/cell
// styling in one place; each console supplies its own columns and rows.

import type { ReactNode } from 'react'

type Align = 'left' | 'right' | 'center'

/** Bordered, horizontally-scrollable table shell. */
export function TableShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className="overflow-x-auto rounded-lg"
      style={{ border: '1px solid var(--probex-border)' }}
    >
      <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }} aria-label={label}>
        {children}
      </table>
    </div>
  )
}

/** Header row wrapper — expects <Th> children.
 *  The header sits on surface-2 with a stronger bottom rule, so it reads as a
 *  fixed frame the rows scroll beneath rather than as the first row of data. */
export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr
        style={{
          background: 'var(--probex-surface-2)',
          borderBottom: '1px solid var(--probex-border-default)',
        }}
      >
        {children}
      </tr>
    </thead>
  )
}

export function Th({ children, align = 'left', dense = false }: { children: ReactNode; align?: Align; dense?: boolean }) {
  return (
    <th
      scope="col"
      // t-label: same token as every other label in the product, so a column
      // heading and a metric label are provably the same thing.
      className={`${dense ? 'px-3 py-2' : 'px-4 py-2.5'} t-label whitespace-nowrap`}
      style={{ textAlign: align }}
    >
      {children}
    </th>
  )
}

/** Body row.
 *  Hover is a translucent wash (--probex-state-hover) rather than a surface
 *  swap: on a dense table a colour jump reads as the row changing tier, while
 *  a wash reads as "the pointer is here". Row separators are hairlines — the
 *  rhythm of the rows should carry the grid, not the lines between them. */
export function Tr({ children, onClick }: { children: ReactNode; onClick?: (() => void) | undefined }) {
  return (
    <tr
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      className={`row-hover${onClick ? ' cursor-pointer' : ''}`}
      style={{ borderTop: '1px solid var(--probex-border)' }}
    >
      {children}
    </tr>
  )
}

export function Td({ children, align = 'left', className, dense = false }: { children: ReactNode; align?: Align; className?: string; dense?: boolean }) {
  return (
    <td
      // Taller rows (py-3) — the previous py-2 packed rows tight enough that
      // scanning a column required tracking with a finger. Numerals are
      // tabular so columns align and digits don't shift as values tick.
      className={`${dense ? 'px-3 py-2' : 'px-4 py-3'} whitespace-nowrap tabular-nums${className ? ` ${className}` : ''}`}
      style={{ textAlign: align }}
    >
      {children}
    </td>
  )
}
