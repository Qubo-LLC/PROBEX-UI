import type { Metadata } from 'next'
import { PortfolioPage } from '@/components/portfolio/PortfolioPage'

export const metadata: Metadata = {
  title: 'Portfolio — Probex',
  description: 'Track performance, exposure, and edge alignment across the capital the engine manages.',
}

export default function PortfolioRoutePage() {
  return <PortfolioPage />
}
