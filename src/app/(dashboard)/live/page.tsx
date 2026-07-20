import type { Metadata } from 'next'
import { LiveFeedConsole } from '@/components/live-feed/LiveFeedConsole'

export const metadata: Metadata = {
  title: 'Live Feed',
  description: 'Real-time engine data — price stream, current market cycle, edge alerts.',
}

export default function LivePage() {
  return <LiveFeedConsole />
}
