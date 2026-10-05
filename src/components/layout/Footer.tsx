// Footer — restored from V1 (git 0e3833a4), trimmed to what's true today.
// V1 linked to Resources/Legal pages (API docs, status, careers, terms,
// privacy) and social icons that never existed as real routes — a footer
// full of dead links is exactly the kind of fabricated affordance truth-first
// opposes, so those groups and the icon row are not restored. Copy is
// rewritten for the V3 reframe: an autonomous engine you observe, not a
// prediction market you trade. Server component — no interactivity, no data.

import Link            from 'next/link'
import { SYNATRALogo }  from '@/components/ui/SynatraLogo'
import { ROUTES }      from '@/config/constants'
import { FooterTrust, FooterMode } from './FooterTrust'

const PLATFORM_LINKS = [
  { label: 'Overview',  href: ROUTES.HOME },
  { label: 'Live Feed',  href: ROUTES.LIVE },
  { label: 'Positions',  href: ROUTES.POSITIONS },
] as const

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="mt-14 pt-9 pb-8 px-5"
      style={{
        borderTop: '1px solid var(--synatra-border)',
        background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--synatra-surface) 40%, transparent))',
      }}
    >
      <div className="max-w-[1920px] mx-auto">
        <div className="flex gap-12 flex-wrap justify-between">
          {/* Brand column */}
          <div className="min-w-[220px] max-w-[320px]">
            <div className="mb-3">
              <SYNATRALogo variant="lockup" size="sm" />
            </div>
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--synatra-text-muted)' }}>
              An autonomous intelligence trading Bitcoin&apos;s fastest markets —
              and the console for watching it think.
            </p>
            <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--synatra-text-secondary)' }}>
              Built for operators, not spectators.
            </p>
          </div>

          {/* Platform links */}
          <div className="min-w-[110px]">
            <div className="text-2xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--synatra-text-muted)' }}>
              Platform
            </div>
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
              {PLATFORM_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-xs no-underline transition-colors hover:!text-[var(--synatra-text-primary)]"
                    style={{ color: 'var(--synatra-text-secondary)' }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust strip — one of its three claims describes the CURRENT engine
            connection, so the strip is a client component. See FooterTrust. */}
        <FooterTrust />

        {/* Bottom bar */}
        <div className="mt-5 pt-4 flex justify-between items-center flex-wrap gap-2" style={{ borderTop: '1px solid var(--synatra-border)' }}>
          <span className="text-2xs" style={{ color: 'var(--synatra-text-muted)' }}>
            © {year} Synatra. All rights reserved.
          </span>
          {/* The execution mode was hardcoded to "paper" here, which is a claim
              about the running engine written as static copy — it stayed on
              screen unchanged when the engine was unreachable, and would have
              said "paper" on a LIVE deployment. FooterMode derives it. */}
          <FooterMode />
        </div>
      </div>
    </footer>
  )
}
