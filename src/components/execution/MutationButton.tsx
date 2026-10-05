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
  // --synatra-negative is tuned to be legible AS TEXT on a dark surface, which
  // makes it too light to sit UNDER white text: #EF4444 with #fff gives 3.76:1,
  // below AA. That put the least readable label in the product on the Emergency
  // Stop button. --synatra-negative-strong is the same hue darkened for use as a
  // fill; white on it clears 4.5:1 in every theme.
  danger:  { background: 'var(--synatra-negative-strong)', color: '#fff', border: '1px solid transparent' },
  primary: { background: 'var(--synatra-primary)', color: 'var(--synatra-bg)', border: '1px solid transparent' },
  neutral: { background: 'transparent', color: 'var(--synatra-text-secondary)', border: '1px solid var(--synatra-border-default)' },
}

export function MutationButton({
  mutation, label, confirmTitle, confirmDescription, skipConfirm = false,
  tone = 'neutral', disabled = false, disabledReason, endpoint, icon, size = 'md',
}: MutationButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const { state, fire, reset, isPending, blockedReason } = mutation

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

  // A write gate outranks the caller's own `disabled`: a control the engine's
  // mode forbids must be unavailable even when the form beside it is perfectly
  // valid. The gate's own sentence also wins the explanation slot — "the engine
  // is in LIVE mode" is the thing the operator needs to read, not "select a
  // market". See lib/display/writeGate.ts.
  const isDisabled = disabled || isPending || blockedReason !== null
  const unavailableReason = blockedReason ?? disabledReason

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
        {isDisabled && unavailableReason && !isPending && state.status === 'idle' && (
          <span
            className="text-2xs"
            style={{
              // A gate block is a safety statement, not a form hint, so it is
              // legible rather than recessive.
              color: blockedReason !== null
                ? 'var(--synatra-warning)'
                : 'var(--synatra-text-disabled)',
            }}
          >
            {unavailableReason}
          </span>
        )}
        {state.status === 'success' && (
          <span className="text-2xs" style={{ color: 'var(--synatra-positive)' }}>
            ✓ {state.result?.message ?? 'Engine accepted the request'}
            {endpoint && <span style={{ color: 'var(--synatra-text-disabled)' }}> · {endpoint}</span>}
          </span>
        )}
        {state.status === 'error' && (
          <span className="text-2xs" style={{ color: 'var(--synatra-negative)' }}>
            ✕ {state.error?.message ?? 'Request failed'}
            {endpoint && <span style={{ color: 'var(--synatra-text-disabled)' }}> · {endpoint}</span>}
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
