import type { Metadata } from 'next'
import { MarketsDomain } from '@/components/markets/MarketsDomain'

export const metadata: Metadata = {
  title: 'Markets',
  description: 'Bitcoin 5-minute markets the engine is scanning — filter, sort, and watch opportunities.',
}

export default function MarketsRoutePage() {
  return <MarketsDomain />
}
