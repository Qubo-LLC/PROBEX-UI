import type { Metadata } from 'next'
import { PositionsConsole } from '@/components/positions/PositionsConsole'

export const metadata: Metadata = {
  title: 'Positions',
  description: 'Capital currently deployed by the engine, and resolution outcomes.',
}

export default function PositionsPage() {
  return <PositionsConsole />
}
