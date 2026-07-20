'use client'

// Sparkline — compact inline trend line, extracted and generalized from the V1
// HeroCarousel's private sparkline (git 0e3833a4) into a shared primitive
// (PROBEX_V3_IMPLEMENTATION_BLUEPRINT §3). Pure SVG, no dependencies.
//
// Used by market cards, the hero brief, watchlist rows, price micro-cards, and
// anywhere a value's recent trajectory adds context. Colour is caller-supplied
// (theme token) so all five themes are covered; an optional gradient area fill
// echoes the V1 premium treatment.

interface SparklineProps {
  /** Raw series values (already in display units). Needs ≥2 points to draw. */
  points:       number[]
  width?:       number
  height?:      number
  /** Stroke + gradient colour (CSS token). Defaults to the brand primary. */
  color?:       string
  strokeWidth?: number
  /** Fill a soft gradient under the line (V1 hero treatment). */
  area?:        boolean
  className?:   string
}

export function Sparkline({
  points,
  width       = 180,
  height      = 48,
  color       = 'var(--probex-primary)',
  strokeWidth = 1.5,
  area        = true,
  className   = '',
}: SparklineProps) {
  if (points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const rng = max - min || 1 // flat series → straight mid-line, no divide-by-zero

  // Map each value to an (x,y) within the box, leaving 2px vertical breathing room.
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * width
    const y = height - ((v - min) / rng) * (height - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const line = coords.join(' ')
  const fill = [`0,${height}`, ...coords, `${width},${height}`].join(' ')
  // Stable, collision-free gradient id derived from the colour token.
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {area && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.20" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {area && <polygon points={fill} fill={`url(#${gradId})`} />}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
