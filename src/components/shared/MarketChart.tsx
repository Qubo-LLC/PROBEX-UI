'use client'

// MarketChart — the SINGLE shared live BTC curve for the whole app (Overview
// hero + Live Feed), built on TradingView Lightweight Charts.
//
// MOTION ENGINE (UX polish pass). The previous implementation eased toward each
// poll then RESTED, producing visible "tick → glide → stop" motion. This version
// never rests while visible:
//
//   • Velocity estimation — the slope of the recent CONFIRMED samples gives a
//     price velocity. Between backend updates the tip dead-reckons along that
//     trajectory (decaying toward zero, hard-clamped to a tiny band around the
//     last confirmed price) so motion continues believably at 60fps without
//     fabricating volatility.
//   • Spring correction — each new confirmed price becomes the new anchor; the
//     displayed tip is pulled toward the (projected) anchor by an exponential
//     spring every frame. Backend updates are corrections, not animation
//     triggers: no ease restarts, no snapping.
//   • History stays exact — ONLY the single leading point animates. The moment
//     newer confirmed points arrive, the old tip is first written back to its
//     EXACT confirmed value, then the new points are appended. No projected
//     value ever remains in history.
//   • Viewport — scrolls continuously against wall-clock time (capped when the
//     feed goes stale, so the chart never scrolls off into fabricated emptiness).
//   • Incremental — setData() runs exactly once; everything after is
//     series.update(). No redraw flicker.
//   • Gated — the fabricated motion needs a licence from the DATA (is the feed
//     real?) and from the USER (reduced motion). Without both, the tip is
//     pinned to the confirmed observation and nothing drifts. Withholding
//     motion never withholds information.
//
// Loaded via next/dynamic({ ssr:false }). Feed-agnostic: polling today or a
// WebSocket later feed the same series — this component never changes.
//
// ─── Framed by ChartFrame (Wave 2C.1) ────────────────────────────────────────
// Everything above is unchanged. What changed is what sits AROUND it: the
// exported `MarketChart` is now a thin adapter that renders `ChartFrame` over
// `MarketChartCanvas` below, exactly as `LiveChart` renders `ChartFrame` over a
// Recharts plot. Two rendering libraries, one outer state and accessibility
// language:
//
//   Recharts            → ChartFrame → Recharts plot        (LiveChart)
//   Lightweight Charts  → ChartFrame → MarketChartCanvas    (this file)
//
// The split exists because ChartFrame withholds `children` in the states that
// have no plot (loading / idle / empty / unavailable). Had the frame been
// wrapped around this component's own JSX, the container div would come and go
// underneath a `useEffect` keyed on `[height]` and the chart would never be
// created on the return trip. As two components, the canvas mounts and unmounts
// with the plot and its create-once effect stays exactly as it was.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createChart, AreaSeries, ColorType, CrosshairMode, LineType,
  type IPriceLine,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts'
import { ChartFrame, type ChartState, type ChartVariant } from './ChartFrame'
import type { Provenance } from './ProvenanceBadge'
import { useSystemStatus } from '@/config/hooks/useSystemStatus'
import { useSettingsStore } from '@/store/settingsStore'
import { formatBtcPrice } from '@/lib/mappers/priceHistory'
import { projectTip, springStep } from '@/lib/chart/projection'

interface MarketChartCanvasProps {
  points:  Array<{ time: number; value: number }>
  up:      boolean
  height?: number
}

const WINDOW_SEC    = 10 * 60 // stable trailing viewport width
const VEL_SAMPLES   = 6       // confirmed samples used for slope estimation
// MAX_LEAD_SEC / VEL_DECAY_SEC / CORRECT_RATE / MAX_DEV_FRAC now live beside the
// arithmetic that uses them, in lib/chart/projection — see that file's header.

// Confirmed samples arrive on the FAST tier (ApplicationStateLoader, 2s). 15s is
// past seven missed polls and well past MAX_LEAD_SEC, so it cannot fire on one
// slow response — only on a feed that has actually stopped.
const STALE_AFTER_MS = 15_000

function readTokens() {
  const cs = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  return {
    up:      v('--probex-positive', '#10B981'),
    down:    v('--probex-negative', '#EF4444'),
    upDim:   v('--probex-positive-dim', 'rgba(16,185,129,0.15)'),
    downDim: v('--probex-negative-dim', 'rgba(239,68,68,0.15)'),
    grid:    v('--probex-chart-grid', 'rgba(255,255,255,0.05)'),
    // --probex-chart-axis is no longer read: axis borders are hidden on both
    // stacks now (recharts already set axisLine={false}). Kept in the token file
    // for any future chart that wants a visible rule.
    text:    v('--probex-text-muted', '#8891a5'),
    cross:   v('--probex-border-strong', 'rgba(255,255,255,0.22)'),
    mono:    v('--font-mono', 'monospace'),
  }
}

// ─── Reduced motion ───────────────────────────────────────────────────────────
// The product already has a reduced-motion state; what it did not have was a way
// for that state to reach a canvas. globals.css gates on TWO things — the
// Settings toggle (SettingsEffects writes <html data-reduce-motion>) and the OS
// preference — and both are honoured here for the same reason: reading only the
// toggle would leave a user who set the preference at the OS level with a
// product that has gone still everywhere except the one chart still
// dead-reckoning at 60fps. Nothing new is introduced; this is the same pair the
// stylesheet has always used.

let reduceMotionMql: MediaQueryList | null = null

function reducedMotionQuery(): MediaQueryList | null {
  if (typeof window === 'undefined') return null
  reduceMotionMql ??= window.matchMedia('(prefers-reduced-motion: reduce)')
  return reduceMotionMql
}

/**
 * DOM read for the rAF loop. The MediaQueryList is created once and stays live,
 * so this allocates nothing per frame — and, like the liveness attribute beside
 * it, a change takes effect on the next frame with no remount.
 */
function motionIsReduced(): boolean {
  if (typeof document === 'undefined') return false
  if (document.documentElement.hasAttribute('data-reduce-motion')) return true
  return reducedMotionQuery()?.matches ?? false
}

/**
 * The same fact as reactive state. The frame loop and the accessible summary
 * have to agree: if the tip is no longer being dead-reckoned, the summary must
 * stop describing it as projected.
 */
function useReducedMotion(): boolean {
  const setting = useSettingsStore((s) => s.accessibility.reduceMotion)
  const [systemPref, setSystemPref] = useState(false)

  useEffect(() => {
    const mql = reducedMotionQuery()
    if (mql === null) return undefined
    const sync = () => setSystemPref(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  return setting || systemPref
}

interface Anim {
  display:      number   // animated tip value currently drawn
  anchorV:      number   // last CONFIRMED price (numerical truth)
  anchorT:      number   // its sample time (sec)
  anchorAtMs:   number   // performance.now() when the anchor arrived
  velocity:     number   // price units / sec, from confirmed samples
  tipTime:      number   // series time slot of the animated tip (== anchorT)
  firstTime:    number
  lastFrameMs:  number
  seeded:       boolean
}

function MarketChartCanvas({ points, up, height = 140 }: MarketChartCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Area'> | null>(null)
  const rafRef       = useRef(0)
  // Q-5: the axis label that reports the current price. It is driven from
  // the CONFIRMED anchor, never from the animated tip, so it can only ever
  // show a number the engine actually sent.
  const priceLineRef = useRef<IPriceLine | null>(null)
  const anim         = useRef<Anim>({ display: 0, anchorV: 0, anchorT: 0, anchorAtMs: 0, velocity: 0, tipTime: 0, firstTime: 0, lastFrameMs: 0, seeded: false })

  // ─── Chart epoch — the fix for the blank-canvas-after-remount bug ──────────
  // Measured: change the viewport mid-session and the chart went blank and
  // STAYED blank until the next confirmed sample arrived.
  //
  // The cause is a dependency gap between this file's two effects. The create
  // effect below owns the chart and its cleanup resets `anim` to seeded:false;
  // the arrival effect further down is the only caller of `setData()`, and it
  // is keyed on `[points, up]`. So when the chart is recreated — a remount, or
  // a height change — the new series starts empty while `points` keeps its
  // identity, the arrival effect does not re-run, and nothing ever seeds it.
  // The canvas is mounted and correctly sized, drawing nothing.
  //
  // On a healthy 2s feed that self-heals within one poll, which is why it read
  // as a flicker; on a stalled or slow feed it is permanent.
  //
  // Bumping this on every creation gives the arrival effect a reason to re-run
  // and re-seed from the points already in hand. No skeleton, no refetch, and
  // no state that did not already exist — the data is re-drawn, not re-fetched.
  const [chartEpoch, setChartEpoch] = useState(0)

  // ── Create the chart once (recreate only on height change) ────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const t = readTokens()

    const chart = createChart(el, {
      // ─── Sizing ───────────────────────────────────────────────────────────
      // `autoSize` hands width/height tracking to the library's own
      // ResizeObserver, which is the only mechanism that actually resizes a v5
      // chart. The hand-rolled observer below this call used
      // `applyOptions({ width })`, and in lightweight-charts 5.2.0 that does
      // not resize: measured directly, forcing the container 646 → 400 → 700 →
      // 646 left the chart at 320px throughout. Sizing is owned by `resize()`
      // or by this flag; `width`/`height` in options are only a creation-time
      // seed, so the chart was fixed at whatever size it was born with.
      //
      // That single fact produced both reported symptoms. At 1440 the container
      // had not been laid out when this dynamically-imported component mounted,
      // so `el.clientWidth` was 0, the `|| 320` fallback won, and a 320px chart
      // sat in a 646px slot forever. On a narrow reload the chart happened to be
      // born at the right width and looked correct — which is why the bug read
      // as "resize only". Shrinking the viewport then left an oversized canvas
      // that the parent's `overflow-hidden` clipped.
      //
      // width/height below remain the documented fallback for environments
      // without ResizeObserver, per the library's own note.
      autoSize: true,
      height,
      width: el.clientWidth || 320,
      // attributionLogo: the TradingView logo is disabled (the library's
      // optional courtesy mark, not a legal requirement); attribution lives in
      // Settings › About instead.
      layout:          { background: { type: ColorType.Solid, color: 'transparent' }, textColor: t.text, fontSize: 11, fontFamily: t.mono, attributionLogo: false },
      // Vertical gridlines OFF and axis borders hidden, to match the recharts
      // surfaces: they draw horizontal lines only and no axis rule, and two
      // charts on one page disagreeing about their own frame is the loudest
      // inconsistency in the product's chart language.
      grid:            { vertLines: { visible: false }, horzLines: { color: t.grid } },
      // ─── Why secondsVisible is now true ─────────────────────────────────
      // The viewport is a fixed 10-minute window (WINDOW_SEC) fed by 2-second
      // samples, so with `secondsVisible: false` every tick inside a minute
      // formatted to the same HH:mm string — measured at 1440px, the axis
      // printed "11:53" eight times in a row and "11:54" twice. An axis that
      // repeats one label across most of its width states nothing about where
      // you are in the series, and reads as broken.
      //
      // This adds no precision that is not already there: the samples carry
      // second-level timestamps, and the library is now allowed to show them
      // rather than truncating every tick to its minute. It also self-corrects
      // the density — HH:mm:ss labels are wider, so lightweight-charts spaces
      // ticks further apart and draws fewer of them.
      timeScale:       { timeVisible: true, secondsVisible: true, borderVisible: false, lockVisibleTimeRangeOnResize: true },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.18, bottom: 0.12 } },
      crosshair:       {
        mode: CrosshairMode.Magnet,
        vertLine: { color: t.cross, width: 1, style: 2, labelVisible: false },
        horzLine: { color: t.cross, width: 1, style: 2, labelVisible: false },
      },
      handleScroll:    false,
      handleScale:     false,
    })

    const s = chart.addSeries(AreaSeries, {
      lineColor: t.up, lineWidth: 2, topColor: t.upDim, bottomColor: 'transparent',
      lineType: LineType.Curved,
      // ── Q-5 · the curve may move; the NUMBER may not ──────────────────
      // lastValueVisible and priceLineVisible both report the series' last
      // point, and that point is the dead-reckoned tip: the price axis was
      // therefore printing an unconfirmed, extrapolated figure and updating
      // it at 60fps. The curve is a projection the viewer reads as motion;
      // a number on an axis is read as a measurement.
      //
      // Both are off. A price line pinned to the confirmed anchor is created
      // below instead, and it moves only when the engine sends a new
      // observation.
      lastValueVisible: false,
      priceLineVisible: false,
    })

    chartRef.current  = chart
    seriesRef.current = s

    // No hand-rolled ResizeObserver: `autoSize` above installs the library's
    // own, which works. Keeping a second one that calls a no-op would only
    // reintroduce the illusion that resizing was handled.

    // ── The motion engine: one frame = one projection + one spring step ─────
    const frame = () => {
      const a   = anim.current
      const ser = seriesRef.current
      const api = chartRef.current
      const nowMs = performance.now()
      const dt    = a.lastFrameMs > 0 ? Math.min(0.1, (nowMs - a.lastFrameMs) / 1000) : 1 / 60
      a.lastFrameMs = nowMs

      // ── Motion gate ────────────────────────────────────────────────────
      // Everything below this line INVENTS intermediate motion: the tip is
      // dead-reckoned along an extrapolated velocity and the viewport drifts
      // against wall-clock time, so the curve keeps moving between polls. That
      // is honest for a live feed — it is showing where the price is heading
      // between samples — and a lie for anything else. Under synthetic data it
      // renders a continuously ticking chart driven by numbers no engine
      // produced, which is the single most convincing "this is live" signal
      // the product has.
      //
      // So the motion needs a licence from two independent parties, and both
      // are read from the DOM rather than threaded through as props: one source
      // of truth each, and a change takes effect on the next frame without a
      // remount.
      //
      //   the DATA — is this feed real? (globals.css [data-liveness])
      //   the USER — do they want motion at all? (reduced motion, both sources)
      //
      // Neither CSS gate can reach this loop: it is canvas drawing driven by
      // rAF, not a CSS animation, so the same states are re-read here.
      //
      // Withholding motion never withholds information. The chart still renders,
      // still updates as confirmed points arrive, and keeps every bit of its
      // state and provenance; it simply stops fabricating the motion in between,
      // and the tip below is pinned to the confirmed observation rather than to
      // a projection of it.
      const animate =
        document.documentElement.dataset.liveness !== 'inert' && !motionIsReduced()

      if (ser && api && a.seeded && !animate) {
        // Snap the tip to its confirmed value and hold the viewport on the data
        // that actually exists. No projection, no drift. This is the whole of
        // the reduced-motion behaviour too — the branch was already correct for
        // "do not fabricate motion", which is exactly what reduced motion asks
        // for, so it is reused rather than duplicated.
        if (a.display !== a.anchorV) {
          a.display = a.anchorV
          try { ser.update({ time: a.tipTime as UTCTimestamp, value: a.display }) } catch { /* time race — ignore */ }
        }
        rafRef.current = requestAnimationFrame(frame)
        return
      }

      if (ser && api && a.seeded) {
        // Dead-reckoned target: anchor + decayed velocity, clamped to a tight
        // honest band. `lead` is the viewport's bound and is returned alongside
        // so the two stay in one place. See lib/chart/projection.
        const { lead, projected } = projectTip(a.anchorV, a.velocity, (nowMs - a.anchorAtMs) / 1000)

        // Exponential spring toward the projected target — continuous, no
        // overshoot, frame-rate independent.
        a.display = springStep(a.display, projected, dt)
        try { ser.update({ time: a.tipTime as UTCTimestamp, value: a.display }) } catch { /* time race — ignore */ }

        // Viewport scrolls with the (capped) live clock — continuous drift.
        const to   = a.anchorT + lead + 1
        const from = Math.max(a.firstTime, to - WINDOW_SEC)
        if (to > from) { try { api.timeScale().setVisibleRange({ from: from as UTCTimestamp, to: to as UTCTimestamp }) } catch { /* ignore */ } }
      }
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)

    // A fresh, empty series now exists. Tell the arrival effect so it seeds it
    // from the points already held, rather than waiting for the next poll.
    // This runs once per creation (deps are [height]), so it cannot loop.
    setChartEpoch((e) => e + 1)

    return () => {
      cancelAnimationFrame(rafRef.current)
      // chart.remove() tears down the library's own autoSize observer with it.
      chart.remove()
      chartRef.current  = null
      seriesRef.current = null
      // Owned by the series, which chart.remove() has just disposed; drop the
      // handle so the next mount creates a fresh one rather than re-pricing a
      // line that no longer exists.
      priceLineRef.current = null
      anim.current = { display: 0, anchorV: 0, anchorT: 0, anchorAtMs: 0, velocity: 0, tipTime: 0, firstTime: 0, lastFrameMs: 0, seeded: false }
    }
  }, [height])

  // ── Confirmed data arrival = anchor correction (never an animation reset) ──
  useEffect(() => {
    const s = seriesRef.current
    if (!s || points.length === 0) return
    const t = readTokens()
    s.applyOptions({ lineColor: up ? t.up : t.down, topColor: up ? t.upDim : t.downDim })

    const a = anim.current
    const last  = points[points.length - 1]
    const first = points[0]
    if (!last || !first) return
    a.firstTime = first.time

    // Velocity from the most recent confirmed samples (robust simple slope).
    const recent = points.slice(-VEL_SAMPLES)
    const r0 = recent[0]
    const rN = recent[recent.length - 1]
    if (r0 && rN && rN.time > r0.time) a.velocity = (rN.value - r0.value) / (rN.time - r0.time)

    if (!a.seeded) {
      s.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })))
      a.display = last.value
      a.seeded  = true
    } else {
      // History integrity: before appending newer points, write the old tip
      // NOTE: reached only when the SAME chart instance receives newer points.
      // After a recreation `seeded` is false and the branch above re-seeds.
      // back to its EXACT confirmed value (it is still the series' last point,
      // so update() at the same time is legal). Only then append the new
      // confirmed points. Result: no projected value ever persists.
      if (a.tipTime > 0 && last.time > a.tipTime) {
        try { s.update({ time: a.tipTime as UTCTimestamp, value: a.anchorV }) } catch { /* ignore */ }
      }
      for (const p of points) {
        if (p.time <= a.tipTime) continue
        const isLast = p.time === last.time
        // The new tip enters at the current display value; the spring glides it.
        try { s.update({ time: p.time as UTCTimestamp, value: isLast ? a.display : p.value }) } catch { /* ignore */ }
      }
    }

    a.anchorV    = last.value
    a.anchorT    = last.time
    a.anchorAtMs = performance.now()
    a.tipTime    = last.time

    // Q-5 · the confirmed read-out. Created once, then re-priced ONLY here —
    // inside the confirmed-arrival effect — so the axis label steps from one
    // observation to the next and never travels through the values the tip
    // animates across between them.
    const lineColor = up ? t.up : t.down
    if (priceLineRef.current === null) {
      priceLineRef.current = s.createPriceLine({
        price: last.value,
        color: lineColor,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      })
    } else {
      priceLineRef.current.applyOptions({ price: last.value, color: lineColor })
    }
    // `chartEpoch` is what makes a recreated chart re-seed immediately instead
    // of waiting for the next confirmed sample. See its declaration above.
  }, [points, up, chartEpoch])

  // No aria-hidden here any more: ChartFrame wraps this element in a labelled
  // role="img", which both names the plot AND makes its canvas subtree
  // presentational. Keeping the attribute as well would hide the labelled
  // region from nothing and only obscure where the naming now lives.
  return <div ref={containerRef} style={{ width: '100%', height }} />
}

// ─── The frame ────────────────────────────────────────────────────────────────

interface MarketChartProps {
  points:  Array<{ time: number; value: number }>
  up:      boolean
  height?: number

  /** Accessible name and (in non-compact variants) the frame's heading. */
  title?:      string
  /** Endpoint id shown beside the provenance badge in non-compact variants. */
  source?:     string
  provenance?: Provenance
  /** Defaults to `compact`: both current call sites (the Overview hero and the
   *  Live Feed price card) already own a header, a price and a provenance
   *  badge, so the frame contributes state and accessibility only. */
  variant?:    ChartVariant

  /** Overrides the state inferred from `points` and feed silence. Callers that
   *  hold the slice know things the series cannot express — an empty array does
   *  not say whether the endpoint failed or simply has not answered yet. */
  state?:   ChartState
  /** The engine's own words for idle / unavailable. */
  message?: string | null
  /** Overrides the generated accessible summary. */
  summary?: string
  valueFormatter?: (v: number) => string
}

/**
 * The BTC curve, wearing the product's shared chart framing.
 *
 * ─── Why this needs its own confirmed/projected vocabulary ───────────────────
 * Every other chart in the product plots confirmed observations and nothing
 * else, so ChartFrame's `summary` can simply name the newest one. This chart
 * cannot: its leading point is dead-reckoned between polls, so the number a
 * sighted operator reads off the tip is a temporary visual estimate, not a
 * measurement. Announcing it as "latest" would hand a screen-reader user a
 * fabricated price with none of the visual cues that mark it as motion.
 *
 * So the summary states the latest CONFIRMED observation — always the anchor,
 * never `display` — and, when the tip is actually being projected, says so in
 * its own sentence. `display` is deliberately never read here: it changes at
 * 60fps inside a ref, and lifting it into React state would both re-render the
 * tree every frame and put a projected number where an observation belongs.
 */
export function MarketChart({
  points,
  up,
  height = 140,
  title = 'BTC / USD',
  source = '/api/price-history',
  provenance = 'live',
  variant = 'compact',
  state,
  message,
  summary,
  valueFormatter = formatBtcPrice,
}: MarketChartProps) {
  // The same derivation LivenessEffect writes to <html data-liveness>, which is
  // the attribute the motion engine above reads each frame. Read from the
  // source rather than from the DOM so React re-renders when it changes — and
  // so the frame's claim about projection can never disagree with whether the
  // canvas is projecting.
  const { dataIsLive } = useSystemStatus()
  const reduceMotion = useReducedMotion()

  const first = points.at(0) ?? null
  const last  = points.at(-1) ?? null
  const lastTime  = last?.time ?? 0
  const lastValue = last?.value ?? 0

  // ─── Arrival clock ─────────────────────────────────────────────────────────
  // When the newest confirmed observation ARRIVED, measured on this client —
  // not the sample's own timestamp. The two differ by whatever the engine's
  // clock differs from the browser's, and an age computed across that skew
  // would report a healthy feed as stale (or the reverse) for reasons that have
  // nothing to do with the feed. A difference of two backend timestamps is
  // skew-free and is what the span in the summary uses; an age against
  // `Date.now()` is not, so it is measured here instead.
  //
  // Known limit: on mount the store may already hold samples that arrived
  // before this component existed, so the first arrival is recorded as "now".
  // That under-reports age by at most one poll in the normal case, and by at
  // most STALE_AFTER_MS when mounting onto an already-dead feed. It resolves
  // itself and never invents a value.
  //
  // Keyed on the tip's time AND value, not on `points`: the engine can revise a
  // sample inside the same second, which is a genuine arrival that a time-only
  // dependency would miss. Both are primitives on purpose — depending on the
  // array's identity would let any caller that builds `points` inline turn this
  // into a render loop, since the effect sets state unconditionally.
  const [lastArrivalMs, setLastArrivalMs] = useState<number | null>(null)
  useEffect(() => {
    if (lastTime === 0) return
    setLastArrivalMs(Date.now())
  }, [lastTime, lastValue])

  // ─── Silence detector ──────────────────────────────────────────────────────
  // A self-rescheduling timeout rather than an interval: while the feed is
  // healthy it wakes exactly once, at the moment silence would become
  // reportable, and costs nothing in between. Only once the feed has actually
  // stopped does it tick per second — and it has to, because ChartFrame renders
  // the age at render time. Without a tick, "Last confirmed 15s ago" would
  // freeze at 15s and become a false statement a minute later.
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (lastArrivalMs === null) return undefined
    let id = 0
    const schedule = () => {
      const age = Date.now() - lastArrivalMs
      id = window.setTimeout(
        () => {
          setNowMs(Date.now())
          schedule()
        },
        age < STALE_AFTER_MS ? STALE_AFTER_MS - age : 1_000,
      )
    }
    schedule()
    return () => window.clearTimeout(id)
  }, [lastArrivalMs])

  const wentQuiet = lastArrivalMs !== null && nowMs - lastArrivalMs >= STALE_AFTER_MS

  const resolvedState: ChartState =
    state ?? (points.length === 0 ? 'empty' : wentQuiet ? 'stale' : 'live')

  const showsPlot = resolvedState === 'live' || resolvedState === 'stale'

  // ─── Is the tip currently projected? ───────────────────────────────────────
  // Mirrors the motion engine's gate exactly — same two licences, same answer.
  // If the tip is pinned to the confirmed observation, describing it as a
  // projection would be as wrong as the reverse, so reduced motion clears this
  // along with the motion itself.
  //
  // `stale` deliberately does NOT clear it. The projection decays toward the
  // anchor over VEL_DECAY_SEC rather than arriving instantly, so for the first
  // tens of seconds of silence the tip is still a visibly separate estimate.
  // See lib/chart/projection.
  const projecting = showsPlot && dataIsLive && !reduceMotion

  const resolvedSummary = useMemo(() => {
    if (summary !== undefined) return summary
    if (last === null) return `${title}. No price observations recorded.`

    const parts = [`${title}.`]

    const span = first !== null ? formatSpan(first.time, last.time) : null
    parts.push(
      `${points.length} confirmed observation${points.length === 1 ? '' : 's'}${span ? ` over ${span}` : ''}.`,
    )

    const clock = formatClock(last.time)
    parts.push(`Latest confirmed ${valueFormatter(last.value)}${clock ? ` at ${clock}` : ''}.`)

    if (projecting) {
      parts.push(
        'The leading tip of the line is a projected estimate drawn between updates, not a confirmed observation.',
      )
    }
    return parts.join(' ')
  }, [summary, title, first, last, points.length, valueFormatter, projecting])

  return (
    <ChartFrame
      title={title}
      source={source}
      provenance={provenance}
      state={resolvedState}
      variant={variant}
      height={height}
      emptyTitle="No price observations yet"
      emptyDescription="The curve draws itself as the engine's price feed accumulates samples."
      {...(message !== undefined && { message })}
      {...(lastArrivalMs !== null && { lastConfirmedAt: lastArrivalMs })}
      summary={resolvedSummary}
    >
      <MarketChartCanvas points={points} up={up} height={height} />
    </ChartFrame>
  )
}

/** Elapsed time between two CONFIRMED sample times (seconds). A difference of
 *  two engine timestamps, so it carries no clock-skew assumption. */
function formatSpan(fromSec: number, toSec: number): string | null {
  const sec = Math.round(toSec - fromSec)
  if (!Number.isFinite(sec) || sec <= 0) return null
  if (sec < 60) return `${sec}s`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m`
  return `${Math.round(min / 60)}h`
}

/** The sample's own timestamp, in the reader's locale — the same instant the
 *  chart's time axis labels. Null rather than a guess on a bad input. */
function formatClock(sec: number): string | null {
  const ms = sec * 1_000
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toLocaleTimeString()
}
