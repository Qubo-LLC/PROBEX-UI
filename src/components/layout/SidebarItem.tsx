'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSidebarCollapsed, useSidebarStore } from '@/store/sidebarStore'

// ─── Types ────────────────────────────────────────────────────────────────

interface SidebarItemProps {
  /** Navigation target */
  href:         string
  /** Icon (Lucide component or any ReactNode) */
  icon:         ReactNode
  /** Full label (shown when expanded) */
  label:        string
  /** Optional badge (count chip, "PRO" chip, etc.) */
  badge?:       ReactNode
}

/**
 * SidebarItem
 * ───────────
 * A single navigation link in the sidebar.
 *
 * Behavior:
 *   - Active state: detected from `usePathname()` — exact or prefix match
 *   - Collapsed state: shows icon only, hides label and badge
 *   - Tooltip: shown on hover when sidebar is collapsed (CSS-driven)
 *   - Accessible: keyboard navigable, proper aria-current
 */
export function SidebarItem({
  href,
  icon,
  label,
  badge,
}: SidebarItemProps) {
  const pathname    = usePathname()
  const isCollapsed = useSidebarCollapsed()
  const closeMobile = useSidebarStore((s) => s.closeMobile)

  // Active if exact match or starts with href (for nested routes)
  // Special case: '/' only matches exactly
  const isActive = href === '/'
    ? pathname === href
    : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? label : undefined}
      // Mobile drawer: selecting a destination dismisses the overlay. On
      // desktop the persistent sidebar is unaffected (closeMobile is a no-op
      // when the overlay is already closed).
      onClick={closeMobile}
      className={cn(
        'nav-item relative group',
        isActive && 'nav-item-active',
        isCollapsed && 'justify-center px-0',
      )}
    >
      {/* Icon */}
      <span
        className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Label — hidden when collapsed */}
      {!isCollapsed && (
        <span className="flex-1 text-sm font-medium truncate">
          {label}
        </span>
      )}

      {/* Badge — hidden when collapsed */}
      {!isCollapsed && badge && (
        <span className="flex-shrink-0">
          {badge}
        </span>
      )}

      {/* Tooltip shown on hover when collapsed */}
      {isCollapsed && (
        <span
          className={cn(
            'pointer-events-none absolute left-full ml-2 z-50',
            'rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap',
            'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0',
            'transition-all duration-150 shadow-elev-3',
          )}
          style={{
            background:   'var(--synatra-surface-3)',
            color:        'var(--synatra-text-primary)',
            border:       '1px solid var(--synatra-border-default)',
          }}
          role="tooltip"
        >
          {label}
        </span>
      )}
    </Link>
  )
}
