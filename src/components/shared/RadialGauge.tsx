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
  children,
  ariaLabel,
  className = '',
}: RadialGaugeProps) {
  const ratio = Math.max(0, Math.min(1, value))
  const R     = size / 2 - strokeWidth - 2 // inset so the stroke never clips
  const cx    = size / 2
  const CIRC  = 2 * Math.PI * R
  const arc   = CIRC * 0.75            // 270° visible sweep
  const offset = arc - arc * ratio     // remaining unfilled portion

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(135deg)' }}
        role="img"
        aria-label={ariaLabel ?? `Gauge at ${Math.round(ratio * 100)}%`}
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
