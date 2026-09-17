'use client'

// Popover — the product's LEVEL 2 disclosure: a short, click-opened
// explanation anchored to the thing it explains.
//
// ─── The three levels ────────────────────────────────────────────────────────
// PROBEX carries four classes of information and had residences for only two:
//
//   A  PRIMARY      the figure, the verdict, the decision   → inline, always
//   B  CONTEXTUAL   the qualifier beside it                 → inline, quieter
//   C  EXPLANATORY  why the figure means what it means      → THIS
//   D  TECHNICAL    endpoint, field, timestamp, diagnostic  → title=, or a
//                                                             detail surface
//
// Before this primitive, class C had two homes and both were wrong. Either it
// was printed in the primary plane as a paragraph at the technical register —
// eleven pixels at 50% ink, permanently occupying space it was too faint to
// use (the incidents scope note on System ran to three lines that way) — or it
// went into a native `title=` attribute, of which the codebase has ~230: a
// hover-only, desktop-only, keyboard-invisible hint with a one-second delay.
// Neither is a place a reader can be sent to.
//
// ─── Why a new primitive, and why not the others ─────────────────────────────
// Tooltip (Radix) is hover/focus-only and vanishes on touch — right for a
// three-word hint on a control, wrong for two sentences a reader may want to
// keep open. Dialog is modal and takes the whole screen for a paragraph.
// ExpansionRow belongs to a table row. Nothing in between existed, so
// SystemStatusIndicator, the former MarketSelector and ProfileMenu each wrote their own
// open state, outside-click and Escape handling. This is that logic, once, and
// SystemStatusIndicator now consumes it; the other two have listbox and menu
// semantics and keep their own until a shared menu primitive is justified.
//
// ─── The rule ────────────────────────────────────────────────────────────────
// Never put class A behind this. A popover holds the explanation of a figure,
// never the figure. If a reader must open something to learn whether the
// engine is holding, what it holds, or whether a probe failed, that is a bug.

import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type ReactNode,
} from 'react'

type Align = 'start' | 'end'

/** Everything a trigger needs to be wired to its panel. Spread onto the
 *  trigger's <button>. */
export interface PopoverTriggerProps {
  onClick: () => void
  'aria-expanded': boolean
  'aria-haspopup': 'dialog'
  'aria-controls': string
  ref: (el: HTMLButtonElement | null) => void
}

export function Popover({
  label,
  trigger,
  children,
  align = 'start',
  width = 300,
  className = '',
}: {
  /** Accessible name of the panel — what the reader opened. */
  label: string
  /** The control that opens the panel. A render function so the caller keeps
   *  full control of its own button (SystemStatusIndicator styles its chip by
   *  state) and no button is ever nested inside another. */
  trigger: (props: PopoverTriggerProps, open: boolean) => ReactNode
  children: ReactNode
  /** Which edge of the trigger the panel hangs from. Flips automatically when
   *  the chosen side would leave the viewport. */
  align?: Align
  /** Panel width in px; clamped to the viewport at narrow widths. */
  width?: number
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelId = useId()

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  // Dismiss on outside click AND Escape — a popover that traps the pointer is
  // worse than the inline paragraph it replaced. Escape returns focus to the
  // trigger; an outside click leaves focus where the reader put it.
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(true) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  // Viewport clamp. A panel hung from a trigger in the middle of a 320px
  // screen overflows whichever side it is aligned to — flipping sides does
  // not help when the panel is wider than either side, measured: a flipped
  // panel landed at x = −153. So it is measured once on open and slid along
  // the x-axis by exactly the overflow, which keeps it anchored to its
  // trigger as far as the viewport allows. No positioning library.
  useLayoutEffect(() => {
    if (!open) { setShift(0); return }
    const el = panelRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const margin = 8
    if (r.right > vw - margin) setShift(-(r.right - (vw - margin)))
    else if (r.left < margin) setShift(margin - r.left)
    else setShift(0)
  }, [open, align])

  const triggerProps: PopoverTriggerProps = {
    onClick: () => setOpen((v) => !v),
    'aria-expanded': open,
    'aria-haspopup': 'dialog',
    'aria-controls': panelId,
    ref: (el) => { triggerRef.current = el },
  }

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      {trigger(triggerProps, open)}
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={label}
          className={`absolute top-full mt-2 z-tooltip ${align === 'end' ? 'right-0' : 'left-0'}`}
          style={{
            width: `min(${width}px, calc(100vw - 2rem))`,
            transform: shift !== 0 ? `translateX(${shift}px)` : undefined,
          }}
        >
          {/* The entrance animation lives on an inner element: fade-in-up
              animates `transform`, and a running CSS animation overrides the
              inline translateX clamp above for its whole duration. */}
          <div
            className="rounded-lg p-3.5 flex flex-col gap-2.5 animate-fade-in-up"
            style={{
              background: 'var(--probex-surface-2)',
              border: '1px solid var(--probex-border-default)',
              boxShadow: 'var(--probex-elev-4)',
            }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The standard Level-2 affordance: a small ⓘ that sits after a label or
 * heading. One shape product-wide, so a reader learns once that this mark
 * means "there is an explanation here". Pass the props Popover hands you.
 *
 * Deliberately quiet — it must never out-weigh the label it follows — but it
 * is a real 24px hit target, and it takes focus like any other control.
 */
export function InfoButton({
  what, className = '', ...props
}: { what: string; className?: string } & PopoverTriggerProps) {
  return (
    <button
      type="button"
      aria-label={`About ${what}`}
      className={`focus-ring inline-flex items-center justify-center w-6 h-6 -my-1 rounded-full cursor-pointer align-middle ${className}`}
      style={{ color: 'var(--probex-text-disabled)' }}
      {...props}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" />
        <path d="M12 11v5" /><path d="M12 8h.01" />
      </svg>
    </button>
  )
}

/** Body copy inside a popover. One register, so every explanation in the
 *  product reads at the same size and ink — 12px, muted, relaxed — which is
 *  the EXPLANATORY register (t-description), not the technical one. */
export function PopoverText({ children }: { children: ReactNode }) {
  return <p className="t-description m-0">{children}</p>
}

/** Optional heading for a popover: the name of the thing being explained. */
export function PopoverTitle({ children }: { children: ReactNode }) {
  return <span className="t-label" style={{ color: 'var(--probex-text-secondary)' }}>{children}</span>
}
