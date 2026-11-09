import { EdgeScannerPanel } from '@/components/runway/EdgeScannerPanel'

// Universal edge scanner (master scope v8.4 §5.5): research ledger, read-only, never books.
export default function ScannerPage() {
  return (
    <main className="p-4">
      <h1 className="t-page-title mb-1">Edge scanner</h1>
      <p className="t-description mb-4">
        Every active market, p from the best available source; taker and maker net edge at p_lcb for YES and NO.
        Research (not trading): rows book into a sleeve only through the recommendation gate.
      </p>
      <EdgeScannerPanel />
    </main>
  )
}
