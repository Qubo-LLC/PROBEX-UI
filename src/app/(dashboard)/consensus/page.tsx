import type { Metadata } from 'next'
import { ConsensusPage } from '@/components/consensus/ConsensusPage'

export const metadata: Metadata = {
  title: 'Consensus — Probex',
  description: 'The engine\'s reasoning made visible — edge strength, recommendation, decision pipeline, and explainability for any market.',
}

export default function ConsensusRoutePage() {
  return <ConsensusPage />
}
