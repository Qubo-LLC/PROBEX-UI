// Footer — restored from V1 (git 0e3833a4), trimmed to what's true today.
// V1 linked to Resources/Legal pages (API docs, status, careers, terms,
// privacy) and social icons that never existed as real routes — a footer
// full of dead links is exactly the kind of fabricated affordance truth-first
// opposes, so those groups and the icon row are not restored. Copy is
// rewritten for the V3 reframe: an autonomous engine you observe, not a
// prediction market you trade. Server component — no interactivity, no data.

import Link            from 'next/link'
import { ProbexLogo }  from '@/components/ui/ProbexLogo'
import { ROUTES }      from '@/config/constants'

const PLATFORM_LINKS = [
  { label: 'Overview',  href: ROUTES.HOME },
  { label: 'Live Feed',  href: ROUTES.LIVE },
  { label: 'Positions',  href: ROUTES.POSITIONS },
] as const

const TRUST_ITEMS = [
  { k: 'Autonomous',  v: 'The engine trades without manual intervention' },
  { k: 'Live',        v: 'Real-time engine polling, not static data' },
  { k: 'Transparent', v: 'Every figure traces to a live endpoint, or says so' },
] as const

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="mt-14 pt-9 pb-8 px-5"
      style={{
        borderTop: '1px solid var(--probex-border)',
        background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--probex-surface) 40%, transparent))',
      }}
    >
      <div className="max-w-[1920px] mx-auto">
        <div className="flex gap-12 flex-wrap justify-between">
          {/* Brand column */}
          <div className="min-w-[220px] max-w-[320px]">
            <div className="mb-3">
              <ProbexLogo variant="lockup" size="sm" />
            </div>
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--probex-text-muted)' }}>
              An autonomous intelligence trading Bitcoin&apos;s fastest markets —
              and the console for watching it think.
            </p>
            <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--probex-text-secondary)' }}>
              Built for operators, not spectators.
            </p>
          </div>

          {/* Platform links */}
          <div className="min-w-[110px]">
            <div className="text-[9px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--probex-text-muted)' }}>
              Platform
            </div>
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
              {PLATFORM_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-xs no-underline transition-colors hover:!text-[var(--probex-text-primary)]"
                    style={{ color: 'var(--probex-text-secondary)' }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-7 pt-4 flex gap-6 flex-wrap" style={{ borderTop: '1px solid var(--probex-border)' }}>
          {TRUST_ITEMS.map((item) => (
            <div key={item.k} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--probex-positive)' }} />
              <span className="text-2xs" style={{ color: 'var(--probex-text-secondary)' }}>
                <strong className="font-semibold" style={{ color: 'var(--probex-text-primary)' }}>{item.k}.</strong> {item.v}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-5 pt-4 flex justify-between items-center flex-wrap gap-2" style={{ borderTop: '1px solid var(--probex-border)' }}>
          <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            © {year} Probex. All rights reserved.
          </span>
          <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
            Autonomous trading carries risk. Currently running in paper mode.
          </span>
        </div>
      </div>
    </footer>
  )
}
