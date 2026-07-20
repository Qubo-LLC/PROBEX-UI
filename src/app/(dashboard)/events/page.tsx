import type { Metadata } from 'next'
import { EventLog } from '@/components/events/EventLog'

export const metadata: Metadata = {
  title: 'Events',
  description: 'Engine event log — trades, edges, resolutions, and system activity.',
}

export default function EventsPage() {
  return <EventLog />
}
