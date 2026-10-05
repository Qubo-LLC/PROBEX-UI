'use client'

// RuntimePanel — /api/runtime rendered natively: mode, lifecycle timestamps,
// the 10-component matrix, and the bot-reported counters.
//
// Truth note (spec §6.2): runtime.stats can be written externally via
// POST /api/update-stats and currently holds seeded test data, so the
// counters are explicitly labelled "reported by the bot process" and are
// NOT used for any PnL display elsewhere in the app.

import { useApplicationStore } from '@/store/applicationStore'
import { formatSignedCurrency } from '@/lib/utils'
import { ErrorState } from '@/components/ui/ErrorState'
import { StatusChip } from '@/components/ui/StatusChip'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'
import type { RuntimeComponents } from '@/types/engine'

/**
 * Functional clusters for the 14 runtime flags.
 *
 * ⚠️ This grouping is a FRONTEND PRESENTATION CHOICE, not engine truth. The
 * engine exposes a flat boolean map with no dependency or topology information,
 * so these clusters are derived from the component NAMES and nothing else. The
 * page says so on screen rather than implying the engine reports a topology.
 *
 * Why group at all: fourteen identical tiles in a flat grid made the single
 * inactive component (telegram_alerter) no easier to find than any other. With
 * clusters, an incomplete cluster is visible at a glance and the reader learns
 * which AREA is affected, not just which flag.
 */
const CLUSTERS: ReadonlyArray<{ label: string; keys: ReadonlyArray<keyof RuntimeComponents> }> = [
  { label: 'Core',         keys: ['bot', 'healthMonitor'] },
  { label: 'Market Data',  keys: ['clobClient', 'marketFetcher', 'marketHistory'] },
  { label: 'Execution',    keys: ['executionEngine', 'paperTrader', 'resolutionTracker'] },
  { label: 'Intelligence', keys: ['consensusEngine', 'survivalBrain', 'analyticsEngine'] },
  { label: 'Accounting',   keys: ['pnlCalculator', 'portfolioTracker'] },
  { label: 'Alerting',     keys: ['telegramAlerter'] },
]

const COMPONENT_LABELS: Record<keyof RuntimeComponents, string> = {
  bot:               'Bot Core',
  clobClient:        'CLOB Client',
  executionEngine:   'Execution Engine',
  marketFetcher:     'Market Fetcher',
  resolutionTracker: 'Resolution Tracker',
  pnlCalculator:     'PnL Calculator',
  telegramAlerter:   'Telegram Alerter',
  healthMonitor:     'Health Monitor',
  survivalBrain:     'Survival Brain',
  paperTrader:       'Paper Trader',
  consensusEngine:   'Consensus Engine',
  marketHistory:     'Market History',
  portfolioTracker:  'Portfolio Tracker',
  analyticsEngine:   'Analytics Engine',
}

export function RuntimePanel() {
  const slice   = useApplicationStore((s) => s.engine.runtime)
  const runtime = slice.data

  if (slice.status === 'error') {
    return (
      <ErrorState
        title="Runtime status unavailable"
        description={slice.error?.message ?? 'The /api/runtime endpoint did not respond.'}
        fullPage={false}
      />
    )
  }

  // The runtime slice polls on the SLOW (30s) tier, so `return null` left this
  // panel — and Process Metrics and Config with it — completely absent for up to
  // half a minute after a page load. Measured: three of six System panels were
  // missing on arrival. A diagnostic surface should say it is waiting.
  if (!runtime) {
    return (
      <section aria-label="Engine runtime" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="t-section-title">Engine runtime</h2>
          <span className="t-metadata">awaiting /api/runtime</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--synatra-text-disabled)' }}>
          Reading the component matrix… this endpoint is polled every 30 seconds.
        </p>
      </section>
    )
  }

  const keys = Object.keys(COMPONENT_LABELS) as Array<keyof RuntimeComponents>
  const activeCount = keys.filter((k) => runtime.components[k]).length

  return (
    // No Card — see HealthPanel for the reasoning. Runtime, health and market
    // data are three readings of one machine, separated by rules.
    <section aria-label="Engine runtime" className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="t-section-title">Engine runtime</h2>
          <span
            className="t-value"
            style={activeCount < keys.length ? { color: 'var(--synatra-warning)' } : undefined}
          >
            {activeCount}/{keys.length} components active
          </span>
          {/* The clusters caveat, moved up from a permanent line beneath the
              matrix into the heading's disclosure: it qualifies the whole
              grouping once, and a reader who has learned it does not need to
              read past it on every visit. */}
          <Popover
            label="About the component clusters"
            trigger={(p) => <InfoButton what="the component clusters" {...p} />}
          >
            <PopoverTitle>Clusters are a presentation grouping</PopoverTitle>
            <PopoverText>
              The engine reports a flat list of component flags with no topology. The
              clusters below are derived from component names so an incomplete area is
              visible at a glance — they are not a dependency graph the engine reported.
            </PopoverText>
          </Popover>
        </div>
        <div className="flex items-center gap-3">
          {/* Live was the POSITIVE tone here, which reads as "good" for the
              state that risks real capital — and contradicts the Execution
              console, where LIVE is `danger`. One vocabulary across the
              product: live is a warning-weight fact, paper is neutral info. */}
          <StatusChip tone={runtime.mode === 'live' ? 'danger' : 'info'} dot={false}>
            {runtime.mode}
          </StatusChip>
          <span className="t-metadata">
            since {new Date(runtime.initializedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Component matrix.
          Each tile is a small monitoring widget rather than a labelled
          rectangle: a status dot with a matching halo, the component name, and
          an explicit ON/OFF readout on the right. Previously an inactive tile
          was signalled only by 55% opacity on the whole tile, which is easy to
          miss in a grid of fourteen and reads as "disabled control" rather than
          "component down". Now the dot colour, the text weight and the readout
          all agree, and inactive tiles keep full contrast on their label so
          they stay legible while still looking distinct. */}
      <div className="flex flex-col gap-3">
        {CLUSTERS.map((cluster) => {
          const liveInCluster = cluster.keys.filter((k) => runtime.components[k]).length
          const complete = liveInCluster === cluster.keys.length
          return (
            <div key={cluster.label} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="t-label">{cluster.label}</span>
                {/* A word and a ratio, so an incomplete cluster survives
                    greyscale as well as colour. */}
                <span
                  className="text-2xs font-semibold tabular-nums"
                  style={{ color: complete ? 'var(--synatra-text-disabled)' : 'var(--synatra-warning)' }}
                >
                  {liveInCluster}/{cluster.keys.length}
                </span>
              </div>
              {/* ─── Grouping by proximity, not by border ──────────────────
                  The first de-boxed pass kept `flex-1` on the label, which
                  pushed each ON/OFF readout to the far right of its grid cell.
                  With the tile borders gone there was nothing left to bind a
                  state to its own label, and the readout ended up nearer the
                  NEXT component's dot than its own — the classic failure of
                  removing a container without replacing what it was doing.

                  The fix is spacing rather than a restored box: the gap WITHIN
                  an item is now much smaller than the gap BETWEEN items
                  (0.5rem against 2rem), so proximity does the grouping the
                  border used to. Fewer columns at each breakpoint buy that
                  separation without crowding. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-0.5">
                {cluster.keys.map((key) => {
                  const active = runtime.components[key]
          const tone = active ? 'var(--synatra-positive)' : 'var(--synatra-text-disabled)'
          return (
            // De-boxed. These were fourteen bordered, elevated tiles — the
            // page's densest concentration of containers, for fourteen
            // booleans that are components of ONE reading (is the process
            // whole?). The cluster heading above already provides the grouping;
            // each tile's own border added a second, redundant boundary and
            // made the matrix read as fourteen subjects.
            //
            // The state signals are untouched: dot colour, its halo, the label
            // weight and the explicit ON/OFF readout all still agree, so an
            // inactive component survives greyscale exactly as before.
            <div
              key={key}
              // `justify-start`, not a stretched row: the three parts stay
              // together and the leftover cell width becomes trailing space.
              className="flex items-center justify-start gap-2 py-1.5 text-xs min-w-0"
              title={`${COMPONENT_LABELS[key]}: ${active ? 'active' : 'inactive'}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: tone,
                  // Halo only on live components — the glow is the "running"
                  // signal, so an offline dot must not have one.
                  boxShadow: active
                    ? `0 0 0 3px color-mix(in srgb, ${tone} 18%, transparent)`
                    : 'none',
                }}
                aria-hidden="true"
              />
              {/* No `flex-1` — that is what broke the pairing. The label sits
                  directly beside its own state. */}
              <span
                className="truncate font-medium"
                style={{ color: active ? 'var(--synatra-text-secondary)' : 'var(--synatra-text-muted)' }}
              >
                {COMPONENT_LABELS[key]}
              </span>
              <span
                className="text-2xs font-bold uppercase tracking-wider flex-shrink-0 tabular-nums"
                // Was color-mix(… var(--synatra-positive) 80%, transparent),
                // which softens by dropping ALPHA to 0.8 rather than by mixing
                // toward the surface. Green at 0.8 over this tile's own green
                // tint measured 1.17:1 — the ON readout, the one thing this row
                // exists to state, was the least legible text in the product.
                style={{ color: active ? 'var(--synatra-positive)' : 'var(--synatra-text-disabled)' }}
              >
                {active ? 'on' : 'off'}
              </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bot-reported counters.
          These are NOT trustworthy accounting: runtime.stats is writable from
          outside the app via POST /api/update-stats and has held seeded test
          data. The previous label read "total P&L", which claims exactly the
          authority this field does not have — and the caveat that said so was a
          footnote below it. The figure keeps its place and loses the claim.

          The qualification stays INLINE — "not accounting" is part of what
          these numbers are, and a reader must not need a click to learn that a
          P&L figure is not the account's P&L. The two-sentence explanation of
          why (the write path, where the real ledger lives) is the disclosure. */}
      <div className="flex flex-col gap-1.5 pt-1" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <span className="flex items-center gap-1.5">
          <span className="t-label">Bot-reported counters · not accounting</span>
          <Popover
            label="About the bot-reported counters"
            trigger={(p) => <InfoButton what="the bot-reported counters" {...p} />}
          >
            <PopoverTitle>A report, not a ledger</PopoverTitle>
            <PopoverText>
              Written by the bot process and externally writable via POST /api/update-stats,
              so nothing here is used for accounting anywhere else in the product.
            </PopoverText>
            <PopoverText>
              Account P&amp;L is on Portfolio (/api/portfolio); execution activity is on the
              Execution console.
            </PopoverText>
          </Popover>
        </span>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs tabular-nums" style={{ color: 'var(--synatra-text-secondary)' }}>
          <span>{runtime.stats.edgesDetected} edges detected</span>
          <span>{runtime.stats.ordersExecuted} orders executed</span>
          <span>
            {formatSignedCurrency(runtime.stats.totalPnl)}{' '}
            <span style={{ color: 'var(--synatra-text-disabled)' }}>P&amp;L as reported</span>
          </span>
          <span className="t-metadata">since {new Date(runtime.stats.startedAt).toLocaleString()}</span>
        </div>
      </div>
    </section>
  )
}
