import type { Metadata } from 'next'
import { SleevesPage } from '@/components/runway/SleevesPage'
import { LivePositionsSection } from '@/components/positions/LivePositionsSection'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata: Metadata = {
  title: 'Positions',
  description: 'Open positions and settlements in the engine’s sleeves (paper, research sizing).',
}

// LivePositionsSection leads: mark price, unrealized P&L, and edge alignment
// per open position (Financial Performance & Trade Transparency redesign,
// Phase 4) — none of which SleevesPage's own inline position table (below,
// unedited) carries. Closed-trade history lives on /ledger, not here — an
// open position and a completed trade are distinct records and stay on
// distinct sections.
export default function PositionsPage() {
  return (
    <>
      <div className="page-container animate-fade-in-up">
        <PageHeader title="Open positions" subtitle="The engine's sleeve positions — mark price, unrealized P&L, and live edge alignment" />
        <LivePositionsSection />
      </div>
      <div style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <SleevesPage title="Capital & book" />
      </div>
    </>
  )
}
