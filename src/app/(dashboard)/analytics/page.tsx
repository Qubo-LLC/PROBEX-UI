import type { Metadata } from 'next'
import { AnalyticsPage } from '@/components/analytics/AnalyticsPage'

export const metadata: Metadata = {
  title: 'Analytics — Synatra',
  description: 'Edge quality, Kelly utilization, and trading performance analysis.',
}

export default function AnalyticsRoutePage() {
  return <AnalyticsPage />
}
