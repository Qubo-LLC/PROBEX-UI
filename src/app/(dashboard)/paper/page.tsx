import type { Metadata } from 'next'
import { PaperTradingConsole } from '@/components/paper/PaperTradingConsole'

export const metadata: Metadata = {
  title: 'Paper Trading — Probex',
  description: 'The engine\'s simulated trading session — capital, trades, and settlement.',
}

export default function PaperTradingPage() {
  return <PaperTradingConsole />
}
