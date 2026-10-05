'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ─── Base Dialog ─────────────────────────────────────────────────────────

interface DialogProps {
  open:        boolean
  onClose:     () => void
  title?:      string | undefined
  description?: string | undefined
  children?:   ReactNode | undefined
  /** Footer actions slot (buttons) */
  footer?:     ReactNode | undefined
  /** Max width class — defaults to a small dialog */
  size?:       'sm' | 'md' | 'lg' | undefined
  /** Disable backdrop-click / Escape close (e.g. mid-submit) */
  dismissable?: boolean | undefined
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' } as const

/**
 * Dialog
 * ──────
 * Design-system modal. Centered surface card over a dimmed backdrop, matching
 * the wallet connect modal aesthetic. Handles Escape, backdrop click, body
 * scroll-lock, and initial focus. Built without a portal dependency to stay
 * consistent with the app's existing overlay pattern.
 */
export function Dialog({
  open, onClose, title, description, children, footer, size = 'sm', dismissable = true,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && dismissable) onClose() }
    document.addEventListener('keydown', onKey)
    // Lock body scroll while open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Move focus into the dialog
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, dismissable, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={() => dismissable && onClose()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn('relative w-full rounded-xl overflow-hidden animate-fade-in-up outline-none', SIZES[size])}
        style={{ background: 'var(--synatra-surface)', border: '1px solid var(--synatra-border-default)' }}
      >
        {(title || dismissable) && (
          <div className="flex items-start justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--synatra-border)' }}>
            <div className="flex flex-col gap-0.5 min-w-0">
              {title && <h2 className="t-section-title">{title}</h2>}
              {description && <p className="text-2xs" style={{ color: 'var(--synatra-text-muted)' }}>{description}</p>}
            </div>
            {dismissable && (
              <button
                onClick={onClose}
                className="w-6 h-6 rounded flex items-center justify-center cursor-pointer flex-shrink-0 focus-ring"
                style={{ color: 'var(--synatra-text-muted)' }}
                aria-label="Close dialog"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        )}

        {children && <div className="p-4">{children}</div>}

        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--synatra-border)', background: 'var(--synatra-surface-2)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ConfirmDialog ──────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open:          boolean
  onClose:       () => void
  onConfirm:     () => void
  title:         string
  description?:  string | undefined
  confirmLabel?: string | undefined
  cancelLabel?:  string | undefined
  /** 'danger' renders a destructive (red) confirm button */
  tone?:         'default' | 'danger' | undefined
  /** Show a spinner + disable buttons while an async action runs */
  loading?:      boolean | undefined
}

/**
 * ConfirmDialog
 * ─────────────
 * Lightweight confirmation flow for destructive or irreversible actions
 * (suspend user, resolve market, sign out, etc.).
 */
export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default', loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} dismissable={!loading}>
      <div className="flex items-center justify-end gap-2">
        <button onClick={onClose} disabled={loading} className="btn-ghost px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'px-4 py-2 text-sm font-semibold rounded-md cursor-pointer transition-all duration-150 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed',
            tone === 'danger' ? 'hover:opacity-90 active:opacity-80' : 'btn-primary',
          )}
          style={tone === 'danger' ? { background: 'var(--synatra-negative)', color: '#fff' } : undefined}
        >
          {loading && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
