import type { Metadata } from 'next'
import { OverviewPage } from '@/components/overview/OverviewPage'

export const metadata: Metadata = {
  title: 'Overview',
  description: 'SYNATRA — an autonomous BTC trading intelligence, and the console for watching it think.',
}


export default function DashboardPage() {
  return <OverviewPage />
}
