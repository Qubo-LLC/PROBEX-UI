import type { Metadata } from 'next'
import { SurvivalConsole } from '@/components/survival/SurvivalConsole'

export const metadata: Metadata = {
  title: 'Survival',
  description: 'Capital protection — survival state machine, burn rate, runway, and targets.',
}

export default function SurvivalPage() {
  return <SurvivalConsole />
}
