'use client'

// PROBEX logo system.
//
// One component, five presentations — so the brand never drifts between
// surfaces the way separate one-off markup does:
//
//   <ProbexLogo variant="icon" />      icon only (compact sidebar, avatars)
//   <ProbexLogo variant="lockup" />    icon + PROBEX wordmark (topnav, footer)
//   <ProbexLogo variant="stacked" />   icon above wordmark (auth, splash)
//   <ProbexLogo variant="loading" />   icon with a breathing pulse
//
// The mark itself is the isometric brand render, served from /public as a
// raster. It is used via <img> rather than inlined because it is a 3D render,
// not vector art — there is no SVG source to inline, and the browser caches one
// file across every surface.
//
// Sizes come from a token scale rather than free numbers, so an icon in the
// sidebar and one in a dialog are provably the same size.

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { BASE_PATH } from '@/config/constants'

/** Rendered pixel size of the icon per token. */
export const LOGO_SIZES = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 48,
  xl: 72,
  '2xl': 112,
} as const

export type LogoSize = keyof typeof LOGO_SIZES

interface ProbexLogoProps {
  variant?: 'icon' | 'lockup' | 'stacked' | 'loading'
  size?:    LogoSize
  /** Hide the wordmark below this breakpoint (lockup only). */
  responsiveWordmark?: boolean
  className?: string
  /** Set when the logo sits next to an existing accessible label, so the
   *  brand isn't announced twice. */
  decorative?: boolean
}

/** Wordmark sizing paired to each icon size, kept proportional by hand rather
 *  than derived — optical balance beats arithmetic for letterforms. */
const WORDMARK_CLASS: Record<LogoSize, string> = {
  xs:    'text-sm',
  sm:    'text-base',
  md:    'text-lg',
  lg:    'text-2xl',
  xl:    'text-3xl',
  '2xl': 'text-4xl',
}

function Mark({ size, priority, className }: { size: number; priority?: boolean; className?: string }) {
  return (
    <Image
      // basePath is NOT applied to plain <img>/next/image src strings the way
      // it is to <Link> — see config/constants BASE_PATH note.
      src={`${BASE_PATH}/icon-512x512.png`}
      alt=""
      width={size}
      height={size}
      // The mark is a dense render; without this it visibly softens when the
      // browser picks a lower-resolution decode for small sizes.
      quality={100}
      priority={priority ?? false}
      // Eager by default. The logo only ever appears in chrome (topnav,
      // sidebar, footer) or on a splash — all first-paint surfaces. Left lazy,
      // the brand mark pops in after the rest of the shell has painted, which
      // is exactly the wrong first impression for an identity element.
      loading="eager"
      className={cn('select-none', className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  )
}

export function ProbexLogo({
  variant = 'icon',
  size = 'sm',
  responsiveWordmark = false,
  className,
  decorative = false,
}: ProbexLogoProps) {
  const px = LOGO_SIZES[size]
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': 'Probex' }

  if (variant === 'icon') {
    return (
      <span {...a11y} className={cn('inline-flex shrink-0', className)}>
        <Mark size={px} className="rounded-[22%]" />
      </span>
    )
  }

  if (variant === 'loading') {
    return (
      <span {...a11y} className={cn('inline-flex shrink-0', className)}>
        {/* Breathing pulse rather than a spinner: the mark is the brand moment
            on a splash screen, and spinning a logo cheapens it. */}
        <Mark size={px} className="rounded-[22%] animate-brand-pulse" priority />
      </span>
    )
  }

  if (variant === 'stacked') {
    return (
      <span {...a11y} className={cn('inline-flex flex-col items-center gap-3', className)}>
        <Mark size={px} className="rounded-[22%]" priority />
        <Wordmark size={size} />
      </span>
    )
  }

  // lockup
  return (
    <span {...a11y} className={cn('inline-flex items-center gap-2.5', className)}>
      <Mark size={px} className="rounded-[22%]" />
      <Wordmark size={size} className={responsiveWordmark ? 'hidden sm:inline' : undefined} />
    </span>
  )
}

function Wordmark({ size, className }: { size: LogoSize; className?: string | undefined }) {
  return (
    <span
      className={cn(
        WORDMARK_CLASS[size],
        // Tight tracking and heavy weight is what reads as a wordmark rather
        // than as running text at the same size.
        'font-bold tracking-tight leading-none text-text-primary',
        className,
      )}
    >
      PROBEX
    </span>
  )
}
