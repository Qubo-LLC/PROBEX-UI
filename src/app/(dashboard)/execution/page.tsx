import type { Metadata } from 'next'
import { ExecutionDomain } from '@/components/execution/ExecutionDomain'

export const metadata: Metadata = {
  title: 'Execution',
  description: 'Execution engine quality — trading record, latency, retries, and rate limiting.',
}

export default function ExecutionPage() {
  return <ExecutionDomain />
}
