import type { Metadata } from 'next'
import { ResearchPage } from '@/components/research/ResearchPage'

export const metadata: Metadata = {
  title: 'Research — Probex',
  description: "Engine reasoning, opportunity summaries, and market intelligence.",
}

export default function ResearchRoutePage() {
  return <ResearchPage />
}
