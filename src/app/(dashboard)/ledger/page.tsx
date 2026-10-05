import type { Metadata } from 'next'
import { TradeLedger } from '@/components/ledger/TradeLedger'

export const metadata: Metadata = {
  title: 'Trade ledger',
  description: 'Every trade record the engine holds, and what happened to it.',
}

export default function LedgerPage() {
  return <TradeLedger />
}
