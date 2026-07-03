import type { Metadata } from 'next'
import { CommandCenter } from '@/components/overview/CommandCenter'

export const metadata: Metadata = {
  title: 'Overview',
  description: 'PROBEX Quant Engine command center — live engine vitals, capital, and health.',
}

/**
 * Overview page — /dashboard
 * Command center for the Quant Engine operator (PROBEX_PRODUCT_SPEC.md §4).
 */
export default function DashboardPage() {
  return <CommandCenter />
}
