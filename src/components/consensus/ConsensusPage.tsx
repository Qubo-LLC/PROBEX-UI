'use client'

// ConsensusPage — the engine's signal snapshot: what it reports, how fresh it
// is, and what can legitimately be read from it.
//
// ─── What "consensus" is on this wire ────────────────────────────────────────
// /api/consensus returns ONE reading: the engine's composite `score`, its
// `confidence`, its own one-word `interpretation`, and eight named signals.
// The composite and the interpretation are the engine's — this page weights
// nothing and recommends nothing. /api/consensus/history is that reading's
// trajectory; /api/consensus/bias is a separate YES/NO tally that has
// answered `available: false` throughout.
//
// ─── What changed (2026-09-16) ───────────────────────────────────────────────
// The reading was 33 hours old and the page called it LIVE — a gauge, a
// "Recommendation Engine" ("Buy Yes"/"Buy No", wording the wire never sent),
// an explainability panel with a Kelly bar for a field that is never on the
// wire, and a market selector for a per-market view the engine does not
// have (the reading is asset-wide). Three of the eight signals were dropped
// by the adapter and none of the eight was rendered anywhere.
//
// Now: the reading's own timestamp is the first thing on the page; the score
// and confidence render as Figures whose certainty IS the snapshot's age;
// all eight signals are a ledger with the engine's key names; bias states
// its unavailability in the engine's words; the mechanism lives one tab over
// and is linked, not duplicated. Nothing here says a signal caused an edge
// or a trade — the wire relates them only by time, and that coincidence is
// checked and stated, not assumed.

import { useMemo } from 'react'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEdgeRows } from '@/lib/mappers/edges'
import { parseEventRows } from '@/lib/mappers/events'
import { readingFreshness, signalRows, readingMatchesEdgeEvent } from '@/lib/display/consensus'
import { formatBtcPrice } from '@/lib/mappers/priceHistory'
import { formatPercent } from '@/lib/utils'
import { ROUTES } from '@/config/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState } from '@/components/ui/ErrorState'
import { Figure, certaintyFromSlice } from '@/components/shared/Figure'
import { EdgeTable } from '@/components/shared/EdgeTable'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { Popover, InfoButton, PopoverText, PopoverTitle, type PopoverTriggerProps } from '@/components/ui/Popover'
import { ConfidenceEvolution } from './ConfidenceEvolution'
import { ConsensusHistoryChart } from './ConsensusHistoryChart'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

const YES = 'var(--synatra-yes)'
const NO  = 'var(--synatra-no)'

const stamp = (ts: number) =>
  new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function ConsensusPage({ embedded = false }: EmbeddableProps = {}) {
  const consensus = useApplicationStore((s) => s.engine.consensus)
  const bias      = useApplicationStore((s) => s.engine.consensusBias)
  const edges     = useApplicationStore((s) => s.engine.edges)
  const events    = useApplicationStore((s) => s.engine.events)

  const reading = consensus.data?.reading ?? null
  const fresh = reading ? readingFreshness(reading) : null
  const signals = useMemo(() => (reading ? signalRows(reading) : []), [reading])

  const edgeRows = useMemo(() => (edges.data ? parseEdgeRows(edges.data) : null), [edges.data])
  // Ranked by magnitude: "what does the detector like most", not "what did it
  // find last" (Live Feed's edge alerts are chronological).
  const ranked = useMemo(() => {
    if (!edgeRows || edgeRows.kind !== 'rows') return edgeRows
    return { kind: 'rows' as const, rows: [...edgeRows.rows].sort((a, b) => b.edgePct - a.edgePct) }
  }, [edgeRows])

  const eventRows = useMemo(() => {
    if (!events.data) return null
    const parsed = parseEventRows(events.data)
    return parsed.kind === 'rows' ? parsed.rows : []
  }, [events.data])
  const matchesEdgeEvent = reading ? readingMatchesEdgeEvent(reading, eventRows) : null

  // The Figure certainty for the reading's numbers: the poll may be fresh
  // while the READING is a day old, and it is the reading's age the operator
  // must not miss — so the age is the textual carrier, in the warning colour,
  // on every figure drawn from it.
  const pollCert = certaintyFromSlice(consensus, 5_000)
  const readingCert = fresh?.stale
    ? { certainty: 'stale' as const, staleFor: `snapshot ${fresh.ageLabel}` }
    : pollCert
  const scoreTone = reading ? (Math.abs(reading.score) < 0.05 ? 'var(--synatra-text-secondary)' : reading.score > 0 ? YES : NO) : undefined

  return (
    <div className={pageShell(embedded, 'gap-5')}>
      {!embedded && (
        <PageHeader
          title="Consensus"
          subtitle="The engine's signal snapshot — what it reports, how old it is, and what it says about it"
        />
      )}

      {/* ── A · the reading ──────────────────────────────────────────────── */}
      <section aria-labelledby="cs-reading" className="flex flex-col gap-3">
        <h2 id="cs-reading" className="sr-only">The reading</h2>

        {consensus.status === 'error' && !reading ? (
          <ErrorState title="The consensus reading did not answer" description={consensus.error?.message ?? 'No response from /api/consensus.'} fullPage={false} />
        ) : !consensus.data ? (
          <p className="t-description">Waiting for /api/consensus.</p>
        ) : reading === null ? (
          // The engine answered and said it has nothing computed. Its own
          // words, not a zero.
          <p className="text-sm font-medium leading-relaxed m-0" style={{ color: 'var(--synatra-text-secondary)' }}>
            No reading — the engine reports: “{consensus.data.message ?? 'No consensus calculated yet'}”.
          </p>
        ) : (
          <>
            {/* Freshness first, in the warning register when stale. This is
                the one line the page must not let a reader skip. */}
            {fresh !== null && (
              <p className="text-sm font-medium leading-relaxed m-0" style={{ color: fresh.stale ? 'var(--synatra-warning)' : 'var(--synatra-text-primary)' }}>
                {fresh.stale ? 'Stale snapshot — ' : 'Snapshot '}
                computed {fresh.ageLabel} ({stamp(reading.scoreTimestamp)})
                {matchesEdgeEvent === true && ', on the last edge-detection cycle in the log'}
                {fresh.stale && '. No newer reading has been computed since; the figures below describe that moment, not now.'}
              </p>
            )}

            <div className="flex items-start gap-x-8 gap-y-3 flex-wrap">
              <Figure
                label="Engine reads it as"
                size="lg"
                tone={scoreTone}
                title="interpretation — the engine's own word for the reading"
                footnote={<span className="t-helper">the engine’s interpretation, verbatim</span>}
                {...readingCert}
              >
                {reading.interpretation}
              </Figure>
              <Figure
                label="Composite score"
                size="md"
                tone={scoreTone}
                title="score — signed, computed by the engine from its signals; the combination rule is not documented"
                footnote={<span className="t-helper">signed · engine composite</span>}
                {...readingCert}
              >
                {reading.score > 0 ? '+' : ''}{reading.score.toFixed(3)}
              </Figure>
              <Figure
                label="Confidence"
                size="md"
                title="confidence — the engine's own 0–1 figure for this reading"
                footnote={<span className="t-helper">{reading.signalCount} signal{reading.signalCount === 1 ? '' : 's'} reported</span>}
                {...readingCert}
              >
                {formatPercent(reading.confidence)}
              </Figure>
              {reading.assetPrice !== null && (
                <Figure
                  label={`${reading.assetSymbol ?? 'Asset'} at snapshot`}
                  size="md"
                  title="asset_price — the spot price the engine recorded with the reading"
                  footnote={<span className="t-helper">price when computed, not now</span>}
                  {...readingCert}
                >
                  {formatBtcPrice(reading.assetPrice)}
                </Figure>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── B · the signals ─────────────────────────────────────────────── */}
      <section aria-labelledby="cs-signals" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 flex-wrap">
            <h2 id="cs-signals" className="t-section-title">The signals</h2>
            <span className="t-description">every value in the reading, under the engine’s own names</span>
            <Popover label="About the signals" trigger={(p) => <InfoButton what="the signals" {...p} />}>
              <PopoverTitle>As reported</PopoverTitle>
              <PopoverText>
                The engine sends each signal as a bare number. The contract documents neither
                its scale nor how the eight combine into the composite score, so values are
                printed as sent and only their sign is drawn. The composite and the
                interpretation above are the engine’s own; nothing here re-weights them.
              </PopoverText>
              <PopoverText>
                Names are the wire keys with underscores opened. “Edge direction” and “edge
                confidence” carry the same names as fields on /api/edges, but the reading does
                not say which market or window they were read from.
              </PopoverText>
            </Popover>
          </span>
          <span className="t-metadata">/api/consensus · signals{reading ? ` · ${signals.length}` : ''}</span>
        </div>

        {reading === null ? (
          <p className="t-description">{consensus.data ? 'No signals — there is no reading.' : 'Waiting for /api/consensus.'}</p>
        ) : signals.length === 0 ? (
          <p className="t-description">The reading carries no numeric signals.</p>
        ) : (
          <TableShell label="Consensus signals">
            <Thead>
              <Th align="left" dense grow>Signal</Th>
              <Th align="right" dense>Value</Th>
              <Th align="left" dense hideBelow="sm">Sign</Th>
              <Th align="left" dense hideBelow="md">Wire key</Th>
            </Thead>
            <tbody>
              {signals.map((s) => {
                const tone = s.sign === 'positive' ? YES : s.sign === 'negative' ? NO : 'var(--synatra-text-muted)'
                return (
                  <Tr key={s.key} accent={s.sign === 'zero' ? undefined : tone}>
                    <Td align="left" dense grow>
                      <span className={`block font-medium truncate ${fresh?.stale ? 'c-stale' : ''}`} style={{ color: 'var(--synatra-text-primary)' }}>{s.label}</span>
                      <span className="md:hidden block font-mono text-2xs mt-0.5 truncate" style={{ color: 'var(--synatra-text-muted)' }}>{s.key}</span>
                    </Td>
                    <Td align="right" dense>
                      <span className={`font-mono font-semibold tabular-nums ${fresh?.stale ? 'c-stale' : ''}`} style={{ color: 'var(--synatra-text-primary)' }}>
                        {s.sign === 'positive' ? '+' : ''}{s.value}
                      </span>
                    </Td>
                    <Td align="left" dense hideBelow="sm">
                      <span className="font-mono text-2xs" style={{ color: tone }}>
                        {s.sign === 'positive' ? '▲ positive' : s.sign === 'negative' ? '▼ negative' : '· zero'}
                      </span>
                    </Td>
                    <Td align="left" dense hideBelow="md">
                      <span className="font-mono text-2xs" style={{ color: 'var(--synatra-text-disabled)' }}>{s.key}</span>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </TableShell>
        )}
      </section>

      {/* ── C · context ─────────────────────────────────────────────────── */}
      <section aria-labelledby="cs-context" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-baseline gap-2 flex-wrap">
            <h2 id="cs-context" className="t-section-title">Context</h2>
            <span className="t-description">bias, the detector’s current candidates, and where the mechanism is</span>
          </span>
          <span className="t-metadata">/api/consensus/bias · /api/edges</span>
        </div>

        {/* Bias: a separate tally, and it has said "not available" throughout. */}
        <p className="t-helper m-0">
          <span className="t-label mr-2">YES/NO bias</span>
          {bias.status === 'error' && !bias.data
            ? 'the bias endpoint did not answer.'
            : !bias.data
              ? 'waiting for /api/consensus/bias.'
              : bias.data.detail === null
                ? <>not available — the engine reports “{bias.data.message ?? 'not computed'}”. No split is drawn.</>
                : <>{bias.data.detail.bias.yesCount} YES · {bias.data.detail.bias.noCount} NO across {bias.data.detail.totalEdges} detected edge{bias.data.detail.totalEdges === 1 ? '' : 's'} · recent trend {bias.data.detail.recentTrend.bias}</>}
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span className="t-label">Current candidates <span className="normal-case tracking-normal font-normal" style={{ color: 'var(--synatra-text-disabled)' }}>· ranked by edge, observed alongside the reading — not produced by it</span></span>
            <Link href={`${ROUTES.STRATEGY}?view=pipeline`} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--synatra-primary)' }}>The cycle, on Mechanism →</Link>
          </div>
          {edges.status === 'error' ? (
            <p className="text-xs" style={{ color: 'var(--synatra-warning)' }}>The edge detector did not answer.</p>
          ) : ranked === null ? (
            <p className="t-description">Waiting for /api/edges.</p>
          ) : (
            <EdgeTable
              result={ranked}
              emptyTitle="No edge this cycle"
              emptyDescription="The detector reports no candidate right now. The reading above stands on its own; it is not a per-market view."
            />
          )}
        </div>
      </section>

      {/* ── C · trajectory ──────────────────────────────────────────────── */}
      <section aria-labelledby="cs-history" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-baseline gap-2 flex-wrap">
            <h2 id="cs-history" className="t-section-title">Recorded readings</h2>
            <span className="t-description">every composite the engine computed, oldest first</span>
          </span>
          <span className="t-metadata">/api/consensus/history</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ConsensusHistoryChart />
          <ConfidenceEvolution />
        </div>
      </section>

      {/* ── D · the record ──────────────────────────────────────────────── */}
      {reading !== null && (
        <div className="flex items-center gap-2 pt-2">
          <Popover label="Reading record" width={360} trigger={(p) => <RecordButton {...p} />}>
            <div className="flex flex-col gap-2.5">
              <PopoverTitle>Reading record</PopoverTitle>
              <Line label="Reading computed" value={`${new Date(reading.scoreTimestamp).toISOString()} · ${new Date(reading.scoreTimestamp).toLocaleString()}`} />
              <Line label="Envelope served" value={`${new Date(consensus.data!.timestamp).toISOString()}`} />
              <Line label="Matches an edge event in the log" value={matchesEdgeEvent === null ? 'log not loaded' : matchesEdgeEvent ? 'yes — within 2 s of an edge-detection event' : 'no edge event within 2 s in the retained log'} mono={false} />
              <Line label="Asset" value={`${reading.assetSymbol ?? '—'}${reading.assetPrice !== null ? ` · ${reading.assetPrice}` : ''}`} />
              <Line label="Signals (raw)" value={reading.allSignals.map((s) => `${s.key}=${s.value}`).join('  ')} />
              <span className="t-metadata">/api/consensus</span>
            </div>
          </Popover>
        </div>
      )}
    </div>
  )
}

function RecordButton(props: PopoverTriggerProps) {
  return (
    <button
      type="button"
      className="focus-ring inline-flex items-center gap-1 rounded-sm text-2xs font-mono cursor-pointer"
      style={{ color: 'var(--synatra-text-disabled)' }}
      title="Reading record — timestamps and raw signal values"
      {...props}
    >
      <span>record</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
  )
}

function Line({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="t-label">{label}</span>
      <span className={`text-2xs break-words ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--synatra-text-secondary)' }}>{value}</span>
    </div>
  )
}
