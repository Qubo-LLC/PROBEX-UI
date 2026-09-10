'use client'

// EngineStatusStrip — what the global chrome says about the engine.
//
// ─── What this used to be ────────────────────────────────────────────────────
// Five state assertions, two of them animated, on every screen in the product:
//
//   BTC $x  ·  WOUNDED (pulsing)  ·  ●123ms  ·  SystemStatusIndicator  ·  ♥
//
// Three separate problems compounded there.
//
// 1. WOUNDED is an INTERPRETATION of capital, not a fact about the market. It
//    is produced by the survival brain from P&L, burn rate and runway, and it
//    means something specific — the engine has scaled its Kelly modifier and
//    raised its edge threshold in response to losses. Rendered as a red word in
//    the chrome, detached from every one of those inputs, it read as an alarm
//    the operator could neither act on nor dismiss. It now lives where its
//    meaning can be reconstructed: SurvivalConsole, WalletPage and
//    PortfolioMetrics already render it beside the targets and runway that
//    explain it, and Strategy shows the thresholds it moves.
//
// 2. Feed latency was a second, quieter claim about the same subject as the
//    indicator beside it. It is diagnostics, and diagnostics belong on System.
//
// 3. LiveHeartbeat and SystemStatusIndicator asserted the same fact — "the
//    engine is answering" — twenty pixels apart, one of them by pulsing. The
//    indicator already carries a live dot, so the heartbeat added motion
//    without adding information.
//
// ─── What is left, and why exactly these two ─────────────────────────────────
// BTC is the product's one persistent figure: a market-intelligence product
// whose operator moves between Portfolio, Strategy and System should not have
// to navigate back to Overview to see the price everything else is about.
//
// SystemStatusIndicator stays because it is the ONE tier-1 liveness signal in
// the product and the only global carrier of execution MODE. Paper versus live
// is a safety-relevant fact that must be visible from every surface — hiding it
// to quieten the chrome would trade noise for risk. It is also the single
// element still licensed to pulse, which is what makes that motion mean
// something again now that nothing around it competes.
//
// Nothing replaces what was removed. The strip is two elements, and the
// remaining detail is one click away on System, where an operator asking about
// it is already going.

import { useApplicationStore } from '@/store/applicationStore'
import { formatBtcPrice } from '@/lib/mappers/priceHistory'
import { SystemStatusIndicator } from '@/components/system/SystemStatusIndicator'

export function EngineStatusStrip() {
  const stats = useApplicationStore((s) => s.engine.stats)
  const price = useApplicationStore((s) => s.engine.priceHistory)

  // Price: prefer /api/stats; fall back to /api/price-history (stats has a
  // history of failing while price-history keeps working).
  const currentPrice = stats.data?.currentPrice ?? price.data?.current ?? null

  return (
    // `min-w-0` is load-bearing, not tidiness. This strip sits in the right
    // track of the header's `grid-cols-[1fr_auto_1fr]`. Without it a flex
    // container refuses to shrink below its content width, so at 375px the
    // strip pushed left out of its own track and rendered ON TOP of the centre
    // column's command-palette button — measured as a 36×24px overlap. The
    // header itself never overflowed, which is why this survived: the document
    // scroll width was clean and only the two boxes were colliding.
    <div className="flex items-center gap-3 sm:gap-4 min-w-0" role="status" aria-label="Engine status">
      {currentPrice !== null && (
        <span className="flex items-baseline gap-1.5 min-w-0">
          {/* `sm:` (640px), not a hand-rolled `xs:` — this Tailwind config
              defines no xs SCREEN breakpoint (the `xs` keys in it are the
              fontSize and borderRadius scales), so `xs:inline` would be an
              unknown class and the label would vanish at every width. */}
          <span className="t-label hidden sm:inline">BTC</span>
          {/* Truncates rather than overflowing. A clipped price is recoverable
              (the figure is on the Overview hero); a price drawn through a
              button is not. */}
          <span className="t-metric-sm truncate">{formatBtcPrice(currentPrice)}</span>
        </span>
      )}

      <SystemStatusIndicator />
    </div>
  )
}
