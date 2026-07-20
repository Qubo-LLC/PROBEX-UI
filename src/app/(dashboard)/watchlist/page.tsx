import type { Metadata } from 'next'
import { WatchlistPage } from '@/components/watchlist/WatchlistPage'

export const metadata: Metadata = {
  title: 'Watchlist — Probex',
  description: "Markets you're following closely.",
}

export default function WatchlistRoutePage() {
  return <WatchlistPage />
}
