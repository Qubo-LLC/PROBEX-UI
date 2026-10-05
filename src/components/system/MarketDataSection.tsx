'use client'

// MarketDataSection — the tier the System page never had.
//
// ─── Why this is new, and why it needs no new data ───────────────────────────
// An operator asking "is the machine healthy" is asking about four things, and
// the page answered three: is the process up (runtime), are its probes passing
// (health), can the browser reach it (diagnostics). It never grouped the fourth
// — is DATA ARRIVING — despite every figure below being polled continuously and
// already on screen somewhere else:
//
//   feedConnected / feedLatencyMs / currentPrice / edgesDetected
//                                          → /api/stats, FAST tier (2s)
//   markets count + slice status           → /api/markets, 8s
//   marketFetcher / marketHistory / clobClient
//                                          → /api/runtime components
//
// Scattered, those read as unrelated readings: feed latency was one Row inside
// the state panel, marketFetcher was one dot among fourteen in a component
// grid. Grouped, they answer a question — a healthy process that has stopped
// receiving market data is a specific and common failure, and it now has a
// place on the page where it is visible as a group rather than inferable from
// three separate rows.
//
// Nothing here is derived, invented, or newly requested. This is composition.
//
// ─── What is deliberately NOT here ───────────────────────────────────────────
// Last successful cycle, cycle timing, markets processed, market discovery
// counts, per-venue state. None of them exist in the engine's DTOs. The section
// covers what the contract actually reports and stops there.

import { useMemo } from 'react'
import { useApplicationStore } from '@/store/applicationStore'
import { parseMarketRows } from '@/lib/mappers/markets'
import { formatBtcPrice } from '@/lib/mappers/priceHistory'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'

export function MarketDataSection() {
  const stats        = useApplicationStore((s) => s.engine.stats)
  const marketsSlice = useApplicationStore((s) => s.engine.markets)
  const runtime      = useApplicationStore((s) => s.engine.runtime)

  const s = stats.data
  const components = runtime.data?.components ?? null

  // Two counts, and the difference between them matters.
  //
  // `engineCount` is the engine's own claim. `readable` is how many of those
  // items actually parsed into the agreed schema. They are normally equal; when
  // they are not, the gap IS the finding — the engine reports markets the
  // dashboard cannot read, which is the schema-mismatch condition the product
  // refuses to paper over elsewhere.
  //
  // The figure shows the readable count, because that is what every other
  // market surface in the app is actually working from. That makes it a
  // client-side computation over the payload rather than a reported value —
  // genuinely `derived`, and marked so.
  const engineCount = marketsSlice.data?.count ?? null
  const readable = useMemo(() => {
    if (!marketsSlice.data) return null
    const parsed = parseMarketRows(marketsSlice.data)
    return parsed.kind === 'rows' ? parsed.rows.length : null
  }, [marketsSlice.data])

  const countMismatch = engineCount !== null && readable !== null && engineCount !== readable

  const feedDown = s !== null && !s.feedConnected

  return (
    // ─── Lightly contained, and only this section ─────────────────────────
    // "Is data actually arriving" is the question an operator opens this page
    // to answer, and it was rendering at exactly the same weight as the
    // process-memory readout above it. Every section looking identical is its
    // own kind of flatness — the borderless treatment stops meaning anything
    // if it is applied uniformly.
    //
    // The containment here is deliberately weaker than the posture group's:
    // a tinted ground and a hairline, no elevation. Enough to read as an
    // anchor, not enough to compete with the verdict at the top of the page.
    <section
      aria-label="Market data"
      className="flex flex-col gap-4 rounded-lg px-4 py-4"
      style={{ background: 'var(--synatra-surface)', border: '1px solid var(--synatra-border)' }}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <h2 className="t-section-title">Market data</h2>
          {/* What each reading IS — explanatory, so it lives here rather than
              as a footnote under every figure. The footnotes that remain are
              contextual (a latency, a mismatch, a failure) and belong beside
              the number they qualify. */}
          <Popover
            label="About the market data readings"
            trigger={(p) => <InfoButton what="the market data readings" {...p} />}
          >
            <PopoverTitle>What these readings are</PopoverTitle>
            <PopoverText>
              <strong>Price feed</strong> and <strong>last price</strong> are the engine&rsquo;s own
              report of its BTC feed from /api/stats — its reading, not an exchange quote.
            </PopoverText>
            <PopoverText>
              <strong>Markets readable</strong> is counted here from the /api/markets payload:
              items that parsed into the agreed schema. It is the engine&rsquo;s current cache
              count, not a claim that those markets are open right now — Service health
              reports how old the cache is.
            </PopoverText>
          </Popover>
        </span>
        {/* System is the INSTRUMENT surface: it prints endpoint paths in the
            open rather than hiding them in tooltips the way the intelligence
            surfaces do. That asymmetry is deliberate and stays. */}
        <span className="t-metadata">/api/stats · /api/markets · /api/runtime</span>
      </div>

      {/* A feed that has stopped is the one condition in this section that
          must interrupt rather than be scanned past. It gets a tinted rule,
          which is a state signal, not a container. */}
      {feedDown && (
        <p
          className="text-xs rounded-md px-3 py-2"
          style={{
            color: 'var(--synatra-negative)',
            background: 'color-mix(in srgb, var(--synatra-negative) 9%, transparent)',
            border: '1px solid var(--synatra-negative-border)',
          }}
          role="status"
        >
          The engine reports its price feed as disconnected. Prices and edges below
          are whatever it last held, not current observations.
        </p>
      )}

      <div className="flex flex-wrap gap-x-10 gap-y-5">
        {s !== null ? (
          <Figure
            label="Price feed"
            size="md"
            {...certaintyFromSlice(stats, 2_000)}
            tone={s.feedConnected ? 'var(--synatra-positive)' : 'var(--synatra-negative)'}
            footnote={s.feedConnected ? `${Math.round(s.feedLatencyMs)}ms round trip` : 'no samples arriving'}
          >
            {s.feedConnected ? 'Connected' : 'Down'}
          </Figure>
        ) : (
          <Figure label="Price feed" size="md" certainty="absent" absentReason="/api/stats has not answered" />
        )}

        {s !== null ? (
          <Figure label="Last price" size="md" {...certaintyFromSlice(stats, 2_000)}>
            {formatBtcPrice(s.currentPrice)}
          </Figure>
        ) : (
          <Figure label="Last price" size="md" certainty="absent" absentReason="/api/stats has not answered" />
        )}

        {readable !== null ? (
          <Figure
            label="Markets readable"
            size="md"
            // The one genuinely derived figure on this page: a client-side
            // count over the payload, not a number the engine reported.
            certainty="derived"
            // NOT "open right now". Measured against the live engine: /api/stats
            // reported the PRICE feed connected at 456ms while /health's
            // api_access probe simultaneously reported "Market data stale
            // (20575.1s old, 57 markets cached)" — the same 57 this figure
            // counts. Those are two different subsystems and both reports were
            // true, but a footnote claiming the markets are open right now
            // asserts a freshness this endpoint does not establish. The figure
            // states what it is: the engine's current count. The service-health
            // section below states how old it is.
            {...(countMismatch
              ? { footnote: `the engine reports ${engineCount} — ${engineCount! - readable} did not match the agreed schema` }
              : marketsSlice.status === 'error'
                ? { footnote: 'last known — the endpoint is failing' }
                : {})}
          >
            {String(readable)}
          </Figure>
        ) : (
          <Figure
            label="Markets readable"
            size="md"
            certainty="absent"
            absentReason={
              marketsSlice.status === 'error'
                ? 'The markets endpoint is not answering'
                : 'Waiting for the market fetcher'
            }
          />
        )}

        {s !== null ? (
          <Figure
            label="Edges detected"
            size="md"
            {...certaintyFromSlice(stats, 2_000)}
            footnote="since this engine process started"
          >
            {s.edgesDetected.toLocaleString()}
          </Figure>
        ) : (
          <Figure label="Edges detected" size="md" certainty="absent" absentReason="/api/stats has not answered" />
        )}
      </div>

      {/* The three runtime components this section actually depends on, pulled
          out of the fourteen-component grid where they were indistinguishable
          from the alerting and accounting flags. Same booleans, read in the
          context that makes them mean something. */}
      {components !== null && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
          <span className="t-label">Ingestion components</span>
          <ComponentFlag label="CLOB client"    active={components.clobClient} />
          <ComponentFlag label="Market fetcher" active={components.marketFetcher} />
          <ComponentFlag label="Market history" active={components.marketHistory} />
        </div>
      )}
    </section>
  )
}

/** A runtime flag as an inline word rather than a bordered tile. The dot, the
 *  colour and the word all agree, so the state survives greyscale. */
function ComponentFlag({ label, active }: { label: string; active: boolean }) {
  const tone = active ? 'var(--synatra-positive)' : 'var(--synatra-text-disabled)'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: tone,
          // Halo only on live components — the glow IS the running signal.
          boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${tone} 18%, transparent)` : 'none',
        }}
        aria-hidden="true"
      />
      <span style={{ color: 'var(--synatra-text-secondary)' }}>{label}</span>
      <span className="text-2xs font-bold uppercase tracking-wider" style={{ color: tone }}>
        {active ? 'on' : 'off'}
      </span>
    </span>
  )
}
