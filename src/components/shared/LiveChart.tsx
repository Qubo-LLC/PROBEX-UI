'use client'

// LiveChart — the Recharts surface, now framed by ChartFrame.
//
// ChartFrame owns title, provenance, data state and the accessible summary;
// this file owns only what Recharts actually needs — series, axes, tooltip and
// the newest-point marker. The split means all seven consumers gained
// idle/unavailable/stale handling and a real tooltip without one call site
// changing, and it is what will let a library decision later be a decision
// about rendering rather than about states.
//
// ─── Why the update is not animated ──────────────────────────────────────────
// These charts receive a confirmed observation every 5–30 seconds and hold a
// rolling window of the most recent N. The tempting fix for the window's jump
// is to animate the series, but Recharts animates by morphing each point's Y
// toward the value that lands in its slot — which draws a path between two
// observations that were never adjacent, at values the engine never reported.
// That is fabricated data rendered as measurement, and it is the one thing this
// product does not do.
//
// So the perceived continuity comes from telling the truth better instead:
// the newest CONFIRMED point is marked, so an arriving observation is visibly
// an event rather than a silent reshuffle, and ChartFrame carries the age of
// that observation. `isAnimationActive` stays false.

import { useEffect, useRef, useState } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartFrame, type ChartState, type ChartVariant } from './ChartFrame'
import type { Provenance } from './ProvenanceBadge'

export interface LiveChartPoint {
  tick:  string | number
  value: number
}

interface LiveChartProps {
  title:      string
  subtitle?:  string
  /** Endpoint path shown in the ProvenanceBadge, e.g. "/api/consensus/history". */
  source:     string
  /** 'live' (direct from the endpoint) or 'derived' (computed client-side
   *  from a live series, e.g. a drawdown curve). Defaults to 'live'. */
  provenance?: Provenance
  data:       LiveChartPoint[]
  variant?:   'area' | 'line'
  height?:    number
  /** Caller supplies its own frame (a Panel) — render the plot only. */
  bare?:      boolean
  color?:     string
  yTickFormatter?: (v: number) => string
  valueFormatter?: (v: number) => string
  emptyTitle?: string
  emptyDescription?: string
  /** Most-recent points to show; the window pans forward as data arrives.
   *  0 disables windowing (full series). Default 40. */
  windowSize?: number
  /** Y-axis domain. Recharts defaults to a zero-based axis, which is right for
   *  volumes and P&L but flattens series that live far from zero — a BTC price
   *  moving $30 inside a 5-minute market is invisible on a $0–$80k axis. Pass
   *  `['dataMin', 'dataMax']` (or explicit bounds) for those. */
  yDomain?: [number | string, number | string]

  // ── State, supplied by the caller when it knows more than "has rows" ───────
  /** Overrides the state inferred from `data`. Use for idle/unavailable/stale,
   *  which the series alone cannot express — an empty array does not say why. */
  state?:   ChartState
  /** Engine's own words for idle/unavailable. */
  message?: string | null
  /** Epoch ms of the newest confirmed observation, for the age read-out.
   *  Explicitly `| undefined` because the repo runs exactOptionalPropertyTypes
   *  and callers read it off a nullable slice. */
  lastConfirmedAt?: number | undefined
  /** Headline figure — promotes the frame to `focal`. */
  currentValue?: React.ReactNode
  delta?: { text: string; positive: boolean }
  /** One sentence for screen readers. Defaults to a description built from the
   *  title and the latest confirmed value — never left unlabelled. */
  summary?: string
}

export function LiveChart({
  title, subtitle, source, provenance = 'live', data, variant = 'area', height = 200, bare = false,
  color = 'var(--probex-primary)',
  yTickFormatter = (v) => String(v),
  valueFormatter = (v) => String(v),
  emptyTitle = 'No history yet',
  emptyDescription = 'This chart populates as the session accumulates data.',
  windowSize = 40,
  yDomain,
  state,
  message,
  lastConfirmedAt,
  currentValue,
  delta,
  summary,
}: LiveChartProps) {
  const gradientId = `live-${title.replace(/\s+/g, '-').toLowerCase()}`
  const windowed = windowSize ? data.slice(-windowSize) : data
  const isWindowed = windowSize > 0 && data.length > windowSize
  const latest = windowed.at(-1) ?? null

  // A confirmed observation arrived. One-shot marker on the newest point —
  // this is an EVENT, not a loop: an infinite pulse would claim the value is
  // still arriving long after it landed.
  const [arrivalN, setArrivalN] = useState(0)
  const prevTick = useRef(latest?.tick)
  useEffect(() => {
    if (latest === null) return
    if (prevTick.current !== undefined && prevTick.current !== latest.tick) setArrivalN((n) => n + 1)
    prevTick.current = latest.tick
  }, [latest])

  // `data` alone can only distinguish "has rows" from "has none". Anything the
  // caller knows beyond that (why it is empty, whether it went stale) has to be
  // passed in; inferring it here would be guessing.
  const resolvedState: ChartState = state ?? (windowed.length === 0 ? 'empty' : 'live')

  const resolvedSummary =
    summary ??
    (latest !== null
      ? `${title}. ${windowed.length} observations, latest ${valueFormatter(latest.value)} at ${String(latest.tick)}.`
      : `${title}. No observations recorded.`)

  const plot = (
    <div className="relative h-full">
      {isWindowed && (
        <span
          className="absolute top-0 right-0 text-2xs tabular-nums z-10 px-1.5 py-0.5 rounded"
          style={{ color: 'var(--probex-text-disabled)', background: 'color-mix(in srgb, var(--probex-surface) 70%, transparent)' }}
        >
          last {windowSize} of {data.length}
        </span>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={windowed} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          {variant === 'area' && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          <CartesianGrid strokeDasharray="3 3" stroke="var(--probex-border)" vertical={false} />
          <XAxis dataKey="tick" tick={{ fill: 'var(--probex-text-disabled)', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={{ fill: 'var(--probex-text-disabled)', fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={yTickFormatter} {...(yDomain !== undefined ? { domain: yDomain } : {})} />
          <Tooltip
            // A crosshair, so the reading is tied to a position rather than
            // floating near the pointer. Replaces the default Recharts cursor,
            // which was a translucent grey band that read as a selection.
            cursor={{ stroke: 'var(--probex-border-strong)', strokeWidth: 1, strokeDasharray: '3 3' }}
            content={<ChartTooltip seriesLabel={title} format={valueFormatter} />}
            isAnimationActive={false}
          />
          {variant === 'area' ? (
            <Area
              type="monotone" dataKey="value" stroke={color} strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              // Only the newest confirmed point carries a marker; every other
              // point is drawn plain. See the header note on why the series
              // itself is not animated.
              dot={<NewestDot color={color} lastTick={latest?.tick} />}
              activeDot={{ r: 3, fill: color, stroke: 'var(--probex-bg)', strokeWidth: 1.5 }}
            />
          ) : (
            <Line
              type="monotone" dataKey="value" stroke={color} strokeWidth={1.5}
              isAnimationActive={false}
              dot={<NewestDot color={color} lastTick={latest?.tick} />}
              activeDot={{ r: 3, fill: color, stroke: 'var(--probex-bg)', strokeWidth: 1.5 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {/* Re-keyed on each confirmed arrival so the ring replays. Gated by
          data-liveness with every other pulse-ring in the product, so it cannot
          fire over synthetic or unreachable data. */}
      {arrivalN > 0 && <span key={arrivalN} className="pulse-ring" aria-hidden="true" />}
    </div>
  )

  return (
    <ChartFrame
      title={title}
      {...(subtitle !== undefined && { subtitle })}
      source={source}
      provenance={provenance}
      state={resolvedState}
      variant={(bare ? 'compact' : currentValue !== undefined ? 'focal' : 'standard') as ChartVariant}
      height={height}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      {...(message !== undefined && { message })}
      {...(lastConfirmedAt !== undefined && { lastConfirmedAt })}
      {...(currentValue !== undefined && { currentValue })}
      {...(delta !== undefined && { delta })}
      summary={resolvedSummary}
    >
      {plot}
    </ChartFrame>
  )
}

// ─── Newest-point marker ──────────────────────────────────────────────────────

/**
 * Draws a dot on the newest confirmed observation only.
 *
 * Recharts calls this for every point, so it returns an empty group for all but
 * the last. That is deliberate: marking every point would turn the series into
 * a scatter plot and lose the one distinction being made — which observation
 * just arrived.
 */
function NewestDot(props: { color: string; lastTick: string | number | undefined; cx?: number; cy?: number; payload?: LiveChartPoint }) {
  const { color, lastTick, cx, cy, payload } = props
  if (cx === undefined || cy === undefined || payload === undefined) return <g />
  if (lastTick === undefined || payload.tick !== lastTick) return <g />
  return (
    <g>
      <circle cx={cx} cy={cy} r={4.5} fill={color} opacity={0.18} />
      <circle cx={cx} cy={cy} r={2.25} fill={color} stroke="var(--probex-bg)" strokeWidth={1} />
    </g>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

/**
 * The instrument read-out. Answers the three questions a chart tooltip owes the
 * operator — what value, when, and which series — in that order, with the value
 * dominant. The default Recharts tooltip answered none of them clearly: it
 * printed the raw dataKey ("value") as the series name.
 */
function ChartTooltip(props: {
  active?: boolean
  payload?: Array<{ payload: LiveChartPoint }>
  seriesLabel: string
  format: (v: number) => string
}) {
  const { active, payload, seriesLabel, format } = props
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload
  if (point === undefined) return null

  return (
    <div
      className="flex flex-col gap-0.5 px-2.5 py-2 rounded-md"
      style={{
        background: 'var(--probex-surface-2)',
        border: '1px solid var(--probex-border-default)',
        boxShadow: 'var(--probex-elev-3)',
      }}
    >
      <span className="text-sm font-bold tabular-nums leading-none" style={{ color: 'var(--probex-text-primary)' }}>
        {format(point.value)}
      </span>
      <span className="t-metadata">{String(point.tick)}</span>
      <span className="text-2xs" style={{ color: 'var(--probex-text-disabled)' }}>{seriesLabel}</span>
    </div>
  )
}
