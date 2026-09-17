'use client'

// FooterTrust — the three claims the footer makes about the product.
//
// ─── Why this is a client component ──────────────────────────────────────────
// These lines sit at the bottom of every route, and one of them was a
// runtime-state claim written as a constant:
//
//   Live — "Real-time engine polling, not static data"  (now "Connected — reading the engine's API…")
//
// That is true when an engine is answering and false in exactly the two states
// the rest of this work exists to make visible. With the engine unreachable,
// the footer asserted real-time polling of something the app was not contacting
// at all — the same class of claim as the old "LIVE" provenance badges, just
// further down the page where it was easier to miss.
//
// All three also carried a GREEN dot, unconditionally. Green is the product's
// "healthy / positive / active" signal, so a green dot beside a false liveness
// claim was the colour system vouching for it.
//
// The other two claims are genuinely constant: "Autonomous" describes the
// product, and "Transparent" describes a policy the code actually enforces
// (ProvenanceBadge cannot render "Live" over synthetic data). Only the middle
// one describes the current connection, so only it is derived — and only it
// changes colour.
//
// Extracted rather than making the whole Footer a client component: the footer
// is otherwise static markup with no reason to ship to the client.

import { useSystemStatus } from '@/config/hooks/useSystemStatus'
import { useApplicationStore } from '@/store/applicationStore'

/**
 * The risk line in the footer's bottom bar.
 *
 * Was the literal string "Autonomous trading carries risk. Currently running in
 * paper mode." — a statement about the running engine baked in as static copy.
 * It would have read "paper mode" on a live deployment, which is the single
 * most consequential thing this product can get wrong, and it kept asserting a
 * mode while the engine was unreachable.
 */
export function FooterMode() {
  const status = useSystemStatus()
  const identity = useApplicationStore((s) => s.engine.identity)
  const mode = identity.data?.mode ?? null

  const text =
    status.dataIsSynthetic
      ? 'Autonomous trading carries risk. No engine is connected — this session is synthetic.'
      : !status.dataIsLive
        ? 'Autonomous trading carries risk. The engine is unreachable; its execution mode is unknown.'
        : mode === 'live'
          ? 'Autonomous trading carries risk. The engine is running in LIVE mode — real capital is at risk.'
          : mode === 'paper'
            ? 'Autonomous trading carries risk. The engine is running in paper mode.'
            : 'Autonomous trading carries risk. The engine has not reported its execution mode.'

  return (
    <span
      className="text-2xs"
      style={{ color: mode === 'live' && status.dataIsLive ? 'var(--probex-negative)' : 'var(--probex-text-muted)' }}
    >
      {text}
    </span>
  )
}

export function FooterTrust() {
  const status = useSystemStatus()

  const dataClaim =
    status.dataIsSynthetic
      ? { k: 'Synthetic', v: 'Generated data — this session is not connected to an engine', tone: 'var(--probex-warning)' }
      : !status.dataIsLive
        ? { k: 'Disconnected', v: 'The engine is unreachable — values are withheld, not substituted', tone: 'var(--probex-negative)' }
        : { k: 'Connected', v: 'Reading the engine’s API every few seconds — each figure carries its own read time', tone: 'var(--probex-positive)' }

  const items = [
    { k: 'Autonomous', v: 'The engine trades without manual intervention', tone: 'var(--probex-text-muted)' },
    dataClaim,
    { k: 'Transparent', v: 'Every figure names the endpoint it came from, or says it is absent', tone: 'var(--probex-text-muted)' },
  ]

  return (
    <div className="mt-7 pt-4 flex gap-6 flex-wrap" style={{ borderTop: '1px solid var(--probex-border)' }}>
      {items.map((item) => (
        <div key={item.k} className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
            style={{ background: item.tone }}
            aria-hidden="true"
          />
          <span className="text-2xs" style={{ color: 'var(--probex-text-secondary)' }}>
            <strong className="font-semibold" style={{ color: 'var(--probex-text-primary)' }}>{item.k}.</strong>{' '}
            {item.v}
          </span>
        </div>
      ))}
    </div>
  )
}
