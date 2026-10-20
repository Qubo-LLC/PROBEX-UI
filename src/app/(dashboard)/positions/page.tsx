import type { Metadata } from 'next'
import { SleevesPage } from '@/components/runway/SleevesPage'

export const metadata: Metadata = {
  title: 'Positions',
  description: 'Open positions and settlements in the engine’s sleeves (paper, research sizing).',
}

// The sleeve ledgers replace the retired PaperTrader's position ledger.
export default function PositionsPage() {
  return <SleevesPage title="Positions" />
}
