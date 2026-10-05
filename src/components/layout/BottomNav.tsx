'use client'

// BottomNav — the mobile navigation rail.
//
// Below `md` the sidebar is an off-canvas drawer behind a hamburger, so every
// destination costs two taps and none is visible. A bottom rail puts the five
// most-used surfaces one thumb-reach away and, more importantly, makes the
// current location visible without opening anything.
//
// ─── It does not replace the drawer ──────────────────────────────────────────
// There are ten domain routes and five slots. The drawer remains the complete
// index and keeps its focus trap; this rail is a shortcut to the five an
// operator actually moves between, plus a "More" slot that opens the drawer
// rather than hiding the other five behind a dead end. Nothing became
// unreachable, and no route was invented — every entry below is a route the
// application already serves.
//
// Slots follow the sidebar's own grouping: one from OBSERVE's three (Overview),
// the live stream, the market catalogue, the capital surface an operator checks
// most (Positions), and the engine's health (System). Portfolio, Execution,
// Strategy, Analytics and Settings live one tap deeper, in More.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/config/constants'
import { useSidebarStore } from '@/store/sidebarStore'

const Icon = {
  Overview: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" />
    </svg>
  ),
  Live: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  Markets: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  Positions: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  More: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
}

const TABS = [
  { href: ROUTES.HOME,      label: 'Overview',  icon: Icon.Overview },
  { href: ROUTES.LIVE,      label: 'Feed',      icon: Icon.Live },
  { href: ROUTES.MARKETS,   label: 'Markets',   icon: Icon.Markets },
  { href: ROUTES.POSITIONS, label: 'Positions', icon: Icon.Positions },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const openMobile = useSidebarStore((s) => s.openMobile)

  // `/` matches everything with startsWith, so the home tab is exact-only.
  const isActive = (href: string) =>
    href === ROUTES.HOME ? pathname === '/' || pathname === '' : pathname.startsWith(href)

  return (
    <nav
      // md:hidden — the rail is for the widths where the sidebar is off-canvas.
      className="md:hidden fixed bottom-0 left-0 right-0 z-sidebar"
      style={{
        background: 'var(--synatra-surface)',
        borderTop: '1px solid var(--synatra-border)',
        // Below the home indicator on iOS the rail would otherwise sit under
        // the system gesture area.
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: 'var(--synatra-elev-3)',
      }}
      aria-label="Primary"
    >
      <ul className="flex items-stretch m-0 p-0 list-none">
        {TABS.map(({ href, label, icon: Ico }) => {
          const active = isActive(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                // 56px tall: the rail is the one place in the product where a
                // 44px comfort target is cheap to honour, and a thumb target
                // that misses costs a navigation.
                className="focus-ring flex flex-col items-center justify-center gap-1 h-14 no-underline"
                style={{ color: active ? 'var(--synatra-primary)' : 'var(--synatra-text-muted)' }}
                aria-current={active ? 'page' : undefined}
              >
                <Ico />
                <span className="text-2xs font-semibold tracking-wide">{label}</span>
                {/* The active tab is marked by position AND a rule, not by
                    colour alone. */}
                <span
                  aria-hidden="true"
                  className="block w-6 h-px rounded-full"
                  style={{ background: active ? 'var(--synatra-primary)' : 'transparent' }}
                />
              </Link>
            </li>
          )
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={openMobile}
            className="focus-ring w-full flex flex-col items-center justify-center gap-1 h-14 cursor-pointer bg-transparent border-0"
            style={{ color: 'var(--synatra-text-muted)' }}
            aria-label="Open full navigation"
          >
            <Icon.More />
            <span className="text-2xs font-semibold tracking-wide">More</span>
            <span aria-hidden="true" className="block w-6 h-px" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
