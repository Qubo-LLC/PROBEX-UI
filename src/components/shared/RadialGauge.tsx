'use client'

// RadialGauge — the signature premium primitive, extracted from the V1
// ConsensusScoreCard's 270° arc gauge (git 0e3833a4) into a reusable,
// parameterized shared component (PROBEX_V3_IMPLEMENTATION_BLUEPRINT §3).
//
// In V3 this one gauge powers multiple lenses on the engine's reasoning:
//   • Edge Strength (Consensus flagship) — real /api/edges magnitude
//   • Capital health (Survival)          — currentCapital / initialCapital
//   • Target progress, confidence, etc.
//
// Geometry mirrors V1 exactly: a 270° sweep with the gap at the bottom
// (svg rotated 135°), a track ring, and a value ring drawn via strokeDashoffset.
// All colour is caller-supplied (theme tokens). Centre content is a slot so
// callers compose the big number + sublabel however they need.

import type { ReactNode } from 'react'

interface RadialGaugeProps {
  /** Progress ratio 0..1 (clamped). Callers convert their own scale. */
  value:        number
  /** Arc colour (CSS token). */
  color:        string
  /** Pixel diameter. Default 160 (V1 hero size). */
  size?:        number
  /** Ring thickness. Default 10 (V1). */
  strokeWidth?: number
  /** Track (unfilled) colour. Default theme border. */
  trackColor?:  string
  /** Colour of the over-maximum overlay arc. Default theme warning.
   *  Only ever drawn when `value` exceeds 1. */
  overflowColor?: string
  /** Centre content — typically a big value + sublabel. */
  children?:    ReactNode
  /** Accessible description of what the gauge represents. */
  ariaLabel?:   string
  className?:   string
}

export function RadialGauge({
  value,
  color,
  size        = 160,
  strokeWidth = 10,
  trackColor  = 'var(--probex-border-default)',
  overflowColor = 'var(--probex-warning)',
  children,
  ariaLabel,
  className = '',
}: RadialGaugeProps) {
  // ─── Over-maximum ───────────────────────────────────
  // `ratio` used to be the whole story: Math.min(1, value) clamped silently,
  // so 100% and 150% drew the SAME fully-closed ring and the aria-label
  // reported both as 100%. Analytics › Kelly Utilization reads
  // "150% UTILIZED" over a closed green ring — a gauge presenting a value
  // 50% past its own maximum as though it were complete and healthy.
  //
  // The arc cannot physically show more than 270°, so the excess is drawn
  // as a SECOND lap over the top of the full ring, plus a tick at the
  // maximum. The clamp stays (it has to), but it is no longer silent.
  const ratio    = Math.max(0, Math.min(1, value))
  const overflow = Math.max(0, Math.min(1, value - 1))   // 1.5 -> 0.5, 3 -> 1
  const exceeded = value > 1
  const R     = size / 2 - strokeWidth - 2 // inset so the stroke never clips
  const cx    = size / 2
  const CIRC  = 2 * Math.PI * R
  const arc   = CIRC * 0.75            // 270° visible sweep
  const offset = arc - arc * ratio     // remaining unfilled portion
  const overflowOffset = arc - arc * overflow

  // The maximum sits at the arc's END: 270° clockwise from the dash origin
  // at (cx + R, cy). cos(270°) = 0, sin(270°) = -1, so it lands straight
  // "up" in the SVG's own frame — the rotate(135deg) on the element carries
  // it to the right place on screen along with everything else.
  const tickInner = cx - (R - strokeWidth / 2 - 2)
  const tickOuter = cx - (R + strokeWidth / 2 + 2)

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(135deg)' }}
        role="img"
        aria-label={
          ariaLabel ??
          `Gauge at ${Math.round(value * 100)}%${exceeded ? ', exceeding maximum' : ''}`
        }
      >
        {/* Track — the full 270° arc */}
        <circle
          cx={cx} cy={cx} r={R}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc} ${CIRC}`}
          strokeLinecap="round"
        />
        {/* Value — filled portion of the arc */}
        <circle
          cx={cx} cy={cx} r={R}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc} ${CIRC}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 500ms ease' }}
        />
        {/* Over-maximum — a second lap drawn OVER the completed ring, so a
            gauge past its limit can never be mistaken for one merely full. */}
        {exceeded && (
          <>
            <circle
              cx={cx} cy={cx} r={R}
              fill="none"
              stroke={overflowColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc} ${CIRC}`}
              strokeDashoffset={overflowOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 500ms ease' }}
            />
            {/* Tick at the maximum, so the crossing point stays locatable. */}
            <line
              x1={tickInner} y1={cx} x2={tickOuter} y2={cx}
              stroke={overflowColor}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </>
        )}
      </svg>

      {/* Centre slot — upright regardless of the svg rotation */}
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  )
}
