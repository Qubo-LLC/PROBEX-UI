import type { Metadata } from 'next'
import { OverviewPage } from '@/components/overview/OverviewPage'

export const metadata: Metadata = {
  title: 'Overview',
  description: 'PROBEX — an autonomous BTC trading intelligence, and the console for watching it think.',
}

/**
 * Overview page — /
 * V3 restoration (PROBEX_V3_RESTORATION_PLAN.md Phase 1): the market-
 * discovery landing, reframed as a lens on the engine's live reasoning.
 */
export default function DashboardPage() {
  return <OverviewPage />
}
