import type { Metadata } from 'next'
import { SleevesPage } from '@/components/runway/SleevesPage'

export const metadata: Metadata = {
  title: 'Ledger',
  description: 'Every order, fill, cancel and settlement in the engine’s sleeve ledgers.',
}

// The sleeve ledgers replace the retired PaperTrader's trade ledger.
export default function LedgerPage() {
  return <SleevesPage title="Ledger" />
}
