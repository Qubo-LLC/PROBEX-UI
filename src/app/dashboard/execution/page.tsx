import type { Metadata } from 'next'
import { ExecutionConsole } from '@/components/execution/ExecutionConsole'

export const metadata: Metadata = {
  title: 'Execution',
  description: 'Execution engine quality — trading record, latency, retries, and rate limiting.',
}

export default function ExecutionPage() {
  return <ExecutionConsole />
}
