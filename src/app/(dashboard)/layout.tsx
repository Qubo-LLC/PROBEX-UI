import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { APP_NAME } from '@/config/constants'

export const metadata: Metadata = {
  title: {
    template: `%s · ${APP_NAME}`,
    default:  APP_NAME,
  },
}

interface DashboardLayoutProps {
  children: ReactNode
}

/**
 * Dashboard layout — applies the full three-region shell:
 *   [Sidebar] [TopNavigation + Main content]
 *
 * This layout is shared by all cockpit routes via the (dashboard) route
 * group — /, /markets, /portfolio, /wallet, etc. URLs carry no prefix;
 * nginx owns external routing.
 *
 * Auth protection: will add a <RoleGuard> wrapper here
 * that redirects to /auth/login if the user is not authenticated.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AppShell>
      {children}
    </AppShell>
  )
}
