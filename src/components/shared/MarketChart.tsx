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
//
// Loaded via next/dynamic({ ssr:false }). Feed-agnostic: polling today or a
// WebSocket later feed the same series — this component never changes.

import { useEffect, useRef } from 'react'
import {
  createChart, AreaSeries, ColorType, CrosshairMode, LineType,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts'

interface MarketChartProps {
  points:  Array<{ time: number; value: number }>
  up:      boolean
  height?: number
}

const WINDOW_SEC    = 10 * 60 // stable trailing viewport width
const MAX_LEAD_SEC  = 6       // how far past the last confirmed sample the clock may lead
const VEL_DECAY_SEC = 4       // velocity half-life-ish decay while no data arrives
const CORRECT_RATE  = 4       // spring pull toward anchor (per second)
const MAX_DEV_FRAC  = 0.0005  // projection clamp: ±0.05% of price around the anchor
const VEL_SAMPLES   = 6       // confirmed samples used for slope estimation

function readTokens() {
  const cs = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  return {
    up:      v('--probex-positive', '#10B981'),
    down:    v('--probex-negative', '#EF4444'),
    upDim:   v('--probex-positive-dim', 'rgba(16,185,129,0.15)'),
    downDim: v('--probex-negative-dim', 'rgba(239,68,68,0.15)'),
    grid:    v('--probex-chart-grid', 'rgba(255,255,255,0.05)'),
    axis:    v('--probex-chart-axis', 'rgba(255,255,255,0.2)'),
    text:    v('--probex-text-muted', '#8891a5'),
    mono:    v('--font-mono', 'monospace'),
  }
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

export function MarketChart({ points, up, height = 140 }: MarketChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Area'> | null>(null)
  const rafRef       = useRef(0)
  const anim         = useRef<Anim>({ display: 0, anchorV: 0, anchorT: 0, anchorAtMs: 0, velocity: 0, tipTime: 0, firstTime: 0, lastFrameMs: 0, seeded: false })

  // ── Create the chart once (recreate only on height change) ────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const t = readTokens()

    const chart = createChart(el, {
      height,
      width: el.clientWidth || 320,
      // attributionLogo: the TradingView logo is disabled (the library's
      // optional courtesy mark, not a legal requirement); attribution lives in
      // Settings › About instead.
      layout:          { background: { type: ColorType.Solid, color: 'transparent' }, textColor: t.text, fontSize: 10, fontFamily: t.mono, attributionLogo: false },
      grid:            { vertLines: { color: t.grid }, horzLines: { color: t.grid } },
      timeScale:       { timeVisible: true, secondsVisible: false, borderColor: t.axis, lockVisibleTimeRangeOnResize: true },
      rightPriceScale: { borderColor: t.axis, scaleMargins: { top: 0.18, bottom: 0.12 } },
      crosshair:       { mode: CrosshairMode.Magnet },
      handleScroll:    false,
      handleScale:     false,
    })

    const s = chart.addSeries(AreaSeries, {
      lineColor: t.up, lineWidth: 2, topColor: t.upDim, bottomColor: 'transparent',
      lineType: LineType.Curved, lastValueVisible: true,
      priceLineVisible: true, priceLineColor: t.up, priceLineWidth: 1, priceLineStyle: 2,
    })

    chartRef.current  = chart
    seriesRef.current = s

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
    })
    ro.observe(el)

    // ── The motion engine: one frame = one projection + one spring step ─────
    const frame = () => {
      const a   = anim.current
      const ser = seriesRef.current
      const api = chartRef.current
      const nowMs = performance.now()
      const dt    = a.lastFrameMs > 0 ? Math.min(0.1, (nowMs - a.lastFrameMs) / 1000) : 1 / 60
      a.lastFrameMs = nowMs

      if (ser && api && a.seeded) {
        // Lead: seconds elapsed since the anchor sample arrived, capped so a
        // stale feed halts projection instead of inventing a trend.
        const lead = Math.min((nowMs - a.anchorAtMs) / 1000, MAX_LEAD_SEC)

        // Dead-reckoned target: anchor + decayed velocity, clamped to a tight
        // honest band. With no fresh data, velocity decays → target settles
        // back onto the confirmed anchor.
        const decayedVel = a.velocity * Math.exp(-lead / VEL_DECAY_SEC)
        const maxDev     = Math.abs(a.anchorV) * MAX_DEV_FRAC
        const projected  = a.anchorV + Math.max(-maxDev, Math.min(maxDev, decayedVel * lead))

        // Exponential spring toward the projected target — continuous, no
        // overshoot, frame-rate independent.
        a.display += (projected - a.display) * (1 - Math.exp(-dt * CORRECT_RATE))
        try { ser.update({ time: a.tipTime as UTCTimestamp, value: a.display }) } catch { /* time race — ignore */ }

        // Viewport scrolls with the (capped) live clock — continuous drift.
        const to   = a.anchorT + lead + 1
        const from = Math.max(a.firstTime, to - WINDOW_SEC)
        if (to > from) { try { api.timeScale().setVisibleRange({ from: from as UTCTimestamp, to: to as UTCTimestamp }) } catch { /* ignore */ } }
      }
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      chart.remove()
      chartRef.current  = null
      seriesRef.current = null
      anim.current = { display: 0, anchorV: 0, anchorT: 0, anchorAtMs: 0, velocity: 0, tipTime: 0, firstTime: 0, lastFrameMs: 0, seeded: false }
    }
  }, [height])

  // ── Confirmed data arrival = anchor correction (never an animation reset) ──
  useEffect(() => {
    const s = seriesRef.current
    if (!s || points.length === 0) return
    const t = readTokens()
    s.applyOptions({ lineColor: up ? t.up : t.down, topColor: up ? t.upDim : t.downDim, priceLineColor: up ? t.up : t.down })

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
  }, [points, up])

  return <div ref={containerRef} style={{ width: '100%', height }} aria-hidden="true" />
}
