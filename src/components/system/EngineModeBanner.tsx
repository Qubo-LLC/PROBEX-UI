'use client'

// EngineModeBanner — states the provenance of everything on screen.
//
// A trading cockpit is only trustworthy if the operator can tell real data from
// substituted data at a glance. Two situations must never be quiet:
//
//   offline — configured for the real engine, cannot reach it, running in
//             production. No numbers are rendered from a fallback; panels show
//             their error states and this banner explains why.
//   mock    — every figure on screen is synthetic. Legitimate for local work
//             and demos, catastrophic if mistaken for real trading activity.
//
// In 'live' the banner renders nothing at all — the normal case stays silent.

import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider'

export function EngineModeBanner() {
  const { mode, reason, baseUrl, environment } = useRuntimeConfig()

  if (mode === 'live') return null

  const isOffline = mode === 'offline'
  const color     = isOffline ? 'var(--probex-negative)' : 'var(--probex-warning)'

  return (
    <div
      role={isOffline ? 'alert' : 'status'}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm"
      style={{
        // Same tinted-fill register as StatusChip: informative, not alarming.
        color:           color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        borderColor:     `color-mix(in srgb, ${color} 32%, transparent)`,
      }}
    >
      <span className="font-semibold tracking-tight">
        {isOffline ? 'Engine Offline' : 'Mock Data'}
      </span>

      <span className="opacity-90">
        {isOffline
          ? 'Live engine unreachable — no trading data is being displayed.'
          : 'Every figure on screen is synthetic and does not reflect real trading.'}
      </span>

      <span className="ml-auto font-data text-xs opacity-70">
        {environment} · {baseUrl}
      </span>

      {/* The precise cause, kept available without dominating the banner. */}
      <span className="w-full font-data text-xs opacity-70">{reason}</span>
    </div>
  )
}
