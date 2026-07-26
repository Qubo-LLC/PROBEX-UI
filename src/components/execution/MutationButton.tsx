'use client'

// MutationButton — the single control used for every engine write.
//
// Centralising this matters more than the code saved: it guarantees that all
// eight mutation endpoints get the same treatment — confirmation for anything
// destructive, a disabled state while in flight, the engine's own response
// surfaced verbatim rather than a generic "Done", and a visible reminder of
// which endpoint is about to be hit. A one-off button per action would drift.
//
// The engine's state is re-read by ApplicationStateLoader's 2s poll, so the
// surrounding UI catches up on its own after a successful call.

import { useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import type { UseMutationReturn } from '@/config/hooks/useMutation'

type Tone = 'danger' | 'primary' | 'neutral'

interface MutationButtonProps {
  mutation:     UseMutationReturn
  label:        string
  /** Shown on the confirm dialog. Say what will actually happen, concretely. */
  confirmTitle?:       string | undefined
  confirmDescription?: string | undefined
  /** Skip confirmation. Only for reversible, low-consequence actions. */
  skipConfirm?: boolean | undefined
  tone?:        Tone | undefined
  disabled?:    boolean | undefined
  /** Reason the control is unavailable — shown instead of the result line. */
  disabledReason?: string | undefined
  /** `POST /api/...` — rendered next to the outcome so the operator can see
   *  exactly which endpoint answered. */
  endpoint?:    string | undefined
  icon?:        ReactNode | undefined
  size?:        'sm' | 'md' | undefined
}

const TONE_STYLE: Record<Tone, React.CSSProperties> = {
  danger:  { background: 'var(--probex-negative)', color: '#fff', border: '1px solid transparent' },
  primary: { background: 'var(--probex-accent)',   color: '#fff', border: '1px solid transparent' },
  neutral: { background: 'transparent', color: 'var(--probex-text-secondary)', border: '1px solid var(--probex-border-default)' },
}

export function MutationButton({
  mutation, label, confirmTitle, confirmDescription, skipConfirm = false,
  tone = 'neutral', disabled = false, disabledReason, endpoint, icon, size = 'md',
}: MutationButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const { state, fire, reset, isPending } = mutation

  const onClick = () => {
    // Clear any previous outcome so the operator never sees a stale success
    // line next to a fresh attempt.
    if (state.status !== 'idle') reset()
    if (skipConfirm) { void fire(); return }
    setConfirming(true)
  }

  const onConfirm = async () => {
    await fire()
    setConfirming(false)
  }

  const isDisabled = disabled || isPending

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={onClick}
        disabled={isDisabled}
        aria-busy={isPending}
        className={cn(
          'rounded-md font-semibold cursor-pointer transition-all duration-150',
          'flex items-center justify-center gap-2 focus-ring',
          'disabled:opacity-45 disabled:cursor-not-allowed',
          !isDisabled && 'hover:opacity-90 active:opacity-80',
          size === 'sm' ? 'px-2.5 py-1 text-2xs' : 'px-3.5 py-2 text-xs',
        )}
        style={TONE_STYLE[tone]}
      >
        {isPending
          ? <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          : icon}
        {isPending ? 'Working…' : label}
      </button>

      {/* Outcome line. aria-live so a screen reader announces the result of an
          action that otherwise only changes remote state. */}
      <div aria-live="polite" className="min-h-[14px]">
        {disabled && disabledReason && state.status === 'idle' && (
          <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>{disabledReason}</span>
        )}
        {state.status === 'success' && (
          <span className="text-2xs" style={{ color: 'var(--probex-positive)' }}>
            ✓ {state.result?.message ?? 'Engine accepted the request'}
            {endpoint && <span style={{ color: 'var(--probex-text-disabled)' }}> · {endpoint}</span>}
          </span>
        )}
        {state.status === 'error' && (
          <span className="text-2xs" style={{ color: 'var(--probex-negative)' }}>
            ✕ {state.error?.message ?? 'Request failed'}
            {endpoint && <span style={{ color: 'var(--probex-text-disabled)' }}> · {endpoint}</span>}
          </span>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => { void onConfirm() }}
        title={confirmTitle ?? label}
        {...(confirmDescription !== undefined ? { description: confirmDescription } : {})}
        confirmLabel={label}
        tone={tone === 'danger' ? 'danger' : 'default'}
        loading={isPending}
      />
    </div>
  )
}
