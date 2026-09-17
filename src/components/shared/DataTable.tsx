'use client'

// Minimal table primitives shared across the cockpit's data consoles
// (EdgeTable, Live Feed market cycle, Positions). Consistent header/cell
// styling in one place; each console supplies its own columns and rows.

import type { ReactNode } from 'react'

type Align = 'left' | 'right' | 'center'

/**
 * Breakpoint below which a column is hidden. The ledger rule: supplementary
 * columns HIDE at narrow widths rather than scroll — a reader at 375px must
 * never need a horizontal scroll to see what matters, and a column that only
 * becomes visible by scrolling is one they will not find.
 *
 * Literal class strings, not template-built, so Tailwind's scanner sees them.
 */
export type HideBelow = 'sm' | 'md' | 'lg'
const HIDE_CLASS: Record<HideBelow, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
}

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

export function Th({
  children, align = 'left', dense = false, grow = false, hideBelow,
}: {
  children: ReactNode
  align?: Align
  dense?: boolean
  /** The one elastic column — absorbs all slack so the fixed numeric columns
   *  keep their gutters. A ledger has exactly one of these.
   *
   *  `w-full max-w-0` is the pair that makes this work in an auto-layout
   *  <table>: `w-full` alone cannot make a cell narrower than its content, so
   *  a long title still pushed the table to 546px inside a 274px scroller at
   *  320 (measured). `max-w-0` lets the cell shrink to whatever the fixed
   *  columns leave, and the content inside truncates instead of overflowing. */
  grow?: boolean
  hideBelow?: HideBelow | undefined
}) {
  return (
    <th
      scope="col"
      // t-label: same token as every other label in the product, so a column
      // heading and a metric label are provably the same thing.
      className={`${dense ? 'px-3 py-2' : 'px-4 py-2.5'} t-label whitespace-nowrap${grow ? ' w-full max-w-0 min-w-[7rem]' : ''}${hideBelow ? ` ${HIDE_CLASS[hideBelow]}` : ''}`}
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
export function Tr({
  children, onClick, accent, id,
}: {
  children: ReactNode
  onClick?: (() => void) | undefined
  /**
   * A colour drawn as a 2.5px rule down the row's left edge — the row's ONE
   * state carrier. The same device EventRowItem uses for severity: state lives
   * at the edge where it doesn't compete with the values, and a ledger with
   * nothing to say about a row draws nothing. Never a chip in a cell.
   * Renders because TableShell sets border-collapse, under which a <tr>
   * border is honoured.
   */
  accent?: string | undefined
  id?: string | undefined
}) {
  return (
    <tr
      {...(id !== undefined && { id })}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      className={`row-hover${onClick ? ' cursor-pointer' : ''}`}
      style={{
        borderTop: '1px solid var(--probex-border)',
        borderLeft: accent ? `2.5px solid ${accent}` : '2.5px solid transparent',
      }}
    >
      {children}
    </tr>
  )
}

/**
 * A row that sits beneath another and spans every column — the ledger's
 * inline expansion. Nothing here animates: the content is either present or
 * not, which is what keeps this correct under reduced motion without a gate.
 *
 * `id` pairs with the toggle's `aria-controls`; `hidden` keeps the row in the
 * DOM but out of layout and the accessibility tree, so a collapsed expansion
 * is not announced.
 */
export function ExpansionRow({
  children, colSpan, id, hidden = false, dense = false,
}: {
  children: ReactNode
  colSpan: number
  id: string
  hidden?: boolean
  dense?: boolean
}) {
  return (
    <tr id={id} hidden={hidden} style={{ background: 'var(--probex-surface-2)' }}>
      <td colSpan={colSpan} className={dense ? 'px-3 py-2.5' : 'px-4 py-3'}>
        {children}
      </td>
    </tr>
  )
}

export function Td({
  children, align = 'left', className, dense = false, grow = false, hideBelow,
}: {
  children: ReactNode
  align?: Align
  className?: string
  dense?: boolean
  /** The elastic column's cell: allowed to wrap/truncate, unlike numeric cells
   *  which stay nowrap so the gutters hold. */
  grow?: boolean
  hideBelow?: HideBelow | undefined
}) {
  return (
    <td
      // Taller rows (py-3) — the previous py-2 packed rows tight enough that
      // scanning a column required tracking with a finger. Numerals are
      // tabular so columns align and digits don't shift as values tick.
      className={`${dense ? 'px-3 py-2' : 'px-4 py-3'} ${grow ? 'w-full max-w-0 min-w-[7rem]' : 'whitespace-nowrap'} tabular-nums${hideBelow ? ` ${HIDE_CLASS[hideBelow]}` : ''}${className ? ` ${className}` : ''}`}
      style={{ textAlign: align }}
    >
      {children}
    </td>
  )
}
