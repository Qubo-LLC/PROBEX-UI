import type { Metadata } from 'next'
import { PortfolioDomain } from '@/components/portfolio/PortfolioDomain'

export const metadata: Metadata = {
  title: 'Portfolio — Probex',
  description: 'Track performance, exposure, and edge alignment across the capital the engine manages.',
}

export default function PortfolioRoutePage() {
  return <PortfolioDomain />
}
