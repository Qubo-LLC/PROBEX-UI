import type { Metadata } from 'next'
import { StrategyDomain } from '@/components/strategy/StrategyDomain'

export const metadata: Metadata = {
  title: 'Strategy',
  description: 'Edge detection, pattern filtering, and position sizing — why the engine trades.',
}

export default function StrategyPage() {
  return <StrategyDomain />
}
