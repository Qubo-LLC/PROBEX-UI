import type { Metadata } from 'next'
import { SystemConsole } from '@/components/system/SystemConsole'

export const metadata: Metadata = {
  title: 'System',
  description: 'Engine health, runtime components, and infrastructure observability.',
}

export default function SystemPage() {
  return <SystemConsole />
}
