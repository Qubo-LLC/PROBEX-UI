'use client'

// Portfolio — the engine's sleeve-based paper trading: capital per sleeve, the
// reserve, combined, equity curves, open positions and activity, all from the
// sleeve ledgers (/api/runway). The PaperTrader-fed views that lived here
// (/api/portfolio*, /api/balance, the paper capital and trade ledger) are
// removed from the dashboard.

import { ProvenanceScope } from '@/components/shared/ProvenanceScope'
import { SleevesPage } from '@/components/runway/SleevesPage'

export function PortfolioDomain() {
  return (
    <ProvenanceScope detail="tooltip">
      <SleevesPage title="Portfolio" />
    </ProvenanceScope>
  )
}
