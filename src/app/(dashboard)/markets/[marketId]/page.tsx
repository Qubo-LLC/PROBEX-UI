import type { Metadata } from 'next'
import { MarketDetailPage } from '@/components/market-detail/MarketDetailPage'

export const metadata: Metadata = {
  title: 'Market — Probex',
}

export default async function MarketDetailRoute({ params }: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await params
  return <MarketDetailPage marketId={marketId} />
}
