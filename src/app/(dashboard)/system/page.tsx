import type { Metadata } from 'next'
import { SystemDomain } from '@/components/system/SystemDomain'

export const metadata: Metadata = {
  title: 'System',
  description: 'Engine health, runtime components, and infrastructure observability.',
}

export default function SystemPage() {
  return <SystemDomain />
}
