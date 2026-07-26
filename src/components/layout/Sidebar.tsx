'use client'

import {cn} from '@/lib/utils'
import {useSidebarCollapsed} from '@/store/sidebarStore'
import {ROUTES} from '@/config/constants'
import {SidebarItem}    from './SidebarItem'
import {SidebarSection} from './SidebarSection'

// ─── Inline SVG icon set (inline, no external dependency) ────────────

const Icons = {
  Overview:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/></svg>,
  Consensus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12z"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>,
  Markets:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  Live:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  Strategy:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Portfolio: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></svg>,
  Positions: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Wallet:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M17 15h.01"/></svg>,
  Execution: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Paper:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l2 2 4-4"/></svg>,
  Analytics: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-4 3 2 4-6"/></svg>,
  Research:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Watchlist: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Survival:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>,
  Events:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>,
  System:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  Settings:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
}

// ─── Main Sidebar component ───────────────────────────────────────────────

/**
 * Sidebar
 * ───────
 * Cockpit navigation, one entry per domain page. The IA consolidation collapsed
 * 16 destinations into 9, each aligned to a backend API group; the views that
 * were absorbed are now URL-addressable tabs (e.g. /markets?view=watchlist) and
 * their old routes redirect, so nothing became unreachable.
 *
 *   Observe      — what is happening (Overview, Live Feed, Markets)
 *   Capital      — what the engine is doing with money (Positions, Portfolio, Execution)
 *   Intelligence — what it believes and how it has performed (Strategy, Analytics)
 *   Engine       — how it is running (System)
 *
 * "Trading" was retired as a group label: the operator oversees an autonomous
 * engine rather than trading directly, and the manual controls that do exist
 * live inside Execution.
 *
 * Widths: expanded 200px, collapsed 52px (animated via CSS).
 * No role gating — single-operator cockpit. AuthGate is the future guard
 * point (spec §6.3); navigation itself carries no permissions.
 */
export function Sidebar() {
  const isCollapsed = useSidebarCollapsed()

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        'flex flex-col h-full flex-shrink-0',
        'transition-[width] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        'overflow-hidden',
        isCollapsed ? 'w-[52px]' : 'w-[200px]',
      )}
      style={{
        background:   'var(--probex-sidebar-bg)',
        borderRight:  '1px solid var(--probex-border)',
      }}
    >
      {/* Dedicated navigation rail */}
      <div className="sidebar-rail flex-1 overflow-y-auto overflow-x-hidden py-2">

        {/* ── Observe ─────────────────────────────────────── */}
        <SidebarSection label="Observe">
          <SidebarItem
            href={ROUTES.HOME}
            icon={<Icons.Overview />}
            label="Overview"
          />
          <SidebarItem
            href={ROUTES.LIVE}
            icon={<Icons.Live />}
            label="Live Feed"
          />
          <SidebarItem
            href={ROUTES.MARKETS}
            icon={<Icons.Markets />}
            label="Markets"
          />
        </SidebarSection>

        {/* ── Capital ─────────────────────────────────────── */}
        <SidebarSection label="Capital">
          <SidebarItem
            href={ROUTES.POSITIONS}
            icon={<Icons.Positions />}
            label="Positions"
          />
          <SidebarItem
            href={ROUTES.PORTFOLIO}
            icon={<Icons.Portfolio />}
            label="Portfolio"
          />
          <SidebarItem
            href={ROUTES.EXECUTION}
            icon={<Icons.Execution />}
            label="Execution"
          />
        </SidebarSection>

        {/* ── Intelligence ────────────────────────────────── */}
        <SidebarSection label="Intelligence">
          <SidebarItem
            href={ROUTES.STRATEGY}
            icon={<Icons.Strategy />}
            label="Strategy"
          />
          <SidebarItem
            href={ROUTES.ANALYTICS}
            icon={<Icons.Analytics />}
            label="Analytics"
          />
        </SidebarSection>

        {/* ── Engine ──────────────────────────────────────── */}
        <SidebarSection label="Engine">
          <SidebarItem
            href={ROUTES.SYSTEM}
            icon={<Icons.System />}
            label="System"
          />
        </SidebarSection>

        {/* ── Bottom: Settings ─────────────────────────────── */}
        <div className="pt-1">
          <SidebarSection label="">
            <SidebarItem
              href={ROUTES.SETTINGS}
              icon={<Icons.Settings />}
              label="Settings"
            />
          </SidebarSection>
        </div>
      </div>
    </aside>
  )
}
