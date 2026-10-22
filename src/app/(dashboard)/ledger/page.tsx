import type { Metadata } from 'next'
import { SleevesPage } from '@/components/runway/SleevesPage'
import { TradeLedgerTable } from '@/components/ledger/TradeLedgerTable'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata: Metadata = {
  title: 'Ledger',
  description: 'Every order, fill, cancel and settlement in the engine’s sleeve ledgers.',
}

// The sleeve ledgers replace the retired PaperTrader's trade ledger.
//
// TradeLedgerTable leads: the individual completed-trade records (search,
// filter, sort, row-detail) that answer "show me the actual trades", which
// nothing on this page did before (Financial Performance & Trade
// Transparency redesign). SleevesPage below it is untouched — it still owns
// the capital/book summary, the real-sizer toggle and the raw activity feed,
// none of which this duplicates.
export default function LedgerPage() {
  return (
    <>
      <div className="page-container animate-fade-in-up">
        <PageHeader title="Trade ledger" subtitle="Individual completed sleeve trades — search, filter, and inspect each record" />
        <TradeLedgerTable />
      </div>
      {/* SleevesPage brings its own page-container — a sibling block, not
          nested, so it isn't double-wrapped. */}
      <div style={{ borderTop: '1px solid var(--synatra-border)' }}>
        <SleevesPage title="Capital & book" />
      </div>
    </>
  )
}
