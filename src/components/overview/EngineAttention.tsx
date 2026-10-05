'use client'

// EngineAttention — the derived operator-alert line.
//
// Replaces EngineHealthBanner, which rendered a full-width 42px strip on every
// single load to say "All systems nominal" — a permanent fixture whose most
// common state was "nothing to report". A row that is always present carries no
// information when it fires; the eye stops seeing it long before the day it
// matters.
//
// This renders nothing at all when there is nothing wrong. Healthy is the
// absence of an alert, plus the status indicator in the top nav and the System
// panel in the instrument row — both of which already state it. When something
// IS wrong, the strip appears where a full-width element genuinely earns its
// place, and lists every item rather than the first one with a "+2 more".
//
// Attention items themselves are unchanged: still derived in
// lib/mappers/overview from real endpoint errors, feed state, survival severity,
// failing probes and active backoff. Never invented.

import Link from 'next/link'
import { ROUTES } from '@/config/constants'
import { useCommandCenter } from '@/config/hooks/useServices'
import type { AttentionItem } from '@/lib/mappers/overview'

export function EngineAttention() {
  const vm = useCommandCenter()

  if (vm.attention.length === 0) return null

  const worst = vm.attention.some((a) => a.severity === 'critical') ? 'critical' : 'warning'
  const color = worst === 'critical' ? 'var(--synatra-negative)' : 'var(--synatra-warning)'

  return (
    <section
      role="alert"
      aria-label="Engine attention"
      className="rounded-lg px-4 py-3 flex flex-col gap-2"
      style={{
        background: `color-mix(in srgb, ${color} 7%, var(--synatra-surface))`,
        border: `1px solid color-mix(in srgb, ${color} 26%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2">
        {/* ATTENTION is not LIVE. This banner marks a condition the operator
            must inspect — a failing health probe does not become more urgent by
            breathing, and borrowing the liveness treatment made the two states
            indistinguishable at a glance. The dot keeps its warning colour and
            position; the banner's border, heading and item text carry the
            meaning, so nothing is lost by holding still. */}
        <span className="state-dot flex-shrink-0" style={{ background: color }} aria-hidden="true" />
        <h2 className="t-card-title" style={{ color }}>
          {vm.attention.length} {vm.attention.length === 1 ? 'item needs' : 'items need'} attention
        </h2>
        {/* Where the full diagnostic lives. The band says THAT something is
            wrong; System says what the probe actually reported. */}
        <Link
          href={ROUTES.SYSTEM}
          className="focus-ring ml-auto text-2xs font-semibold no-underline whitespace-nowrap"
          style={{ color: 'var(--synatra-text-muted)' }}
        >
          System console →
        </Link>
      </div>

      <ul className="list-none p-0 m-0 flex flex-col gap-1">
        {vm.attention.map((item, i) => (
          <AttentionRow key={`${item.message}-${i}`} item={item} />
        ))}
      </ul>
    </section>
  )
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const color = item.severity === 'critical' ? 'var(--synatra-negative)' : 'var(--synatra-warning)'
  return (
    // The engine's own words are shown IN the layout (remediation phase 2).
    // They used to live only in a hover `title`, so the banner said WHAT had
    // failed ("api_access") but not WHY ("Market data stale (…s old, 0
    // markets cached)") — and the why is the part that explains Holding, the
    // empty market list and the frozen figures below it.
    <li className="flex items-baseline gap-2 flex-wrap">
      <span
        className="w-1 h-1 rounded-full inline-block flex-shrink-0 translate-y-[-2px]"
        style={{ background: color }}
        aria-hidden="true"
      />
      <span className="text-xs font-semibold" style={{ color }}>
        {item.message}
      </span>
      {item.detail && (
        <span className="font-mono text-2xs break-all" style={{ color: 'var(--synatra-text-secondary)' }}>
          {item.detail}
        </span>
      )}
    </li>
  )
}
