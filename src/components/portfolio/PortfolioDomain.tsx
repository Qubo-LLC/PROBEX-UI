'use client'

// Portfolio domain — API group "Portfolio & Balance" plus "Trade Ledger".
//
//   Overview → /api/portfolio/{summary,history,performance}, /api/positions
//   Capital  → /api/balance, survival targets (was the Wallet page)
//
// Wallet was always a view of the same capital these endpoints describe; as a
// separate sidebar entry it split one subject across two destinations.

import { DomainPage } from '@/components/layout/DomainPage'
import { PortfolioPage } from './PortfolioPage'
import { WalletPage } from '@/components/wallet/WalletPage'
import type { TabDef } from '@/components/ui/Tabs'

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'capital',  label: 'Capital & Ledger' },
]

export function PortfolioDomain() {
  return (
    <DomainPage
      title="Portfolio"
      subtitle="Performance, exposure, and the capital the engine is managing"
      tabs={TABS}
      render={(active) =>
        active === 'capital' ? <WalletPage embedded /> : <PortfolioPage embedded />
      }
    />
  )
}
