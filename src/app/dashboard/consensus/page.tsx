import { redirect } from 'next/navigation'

// Legacy route — the Consensus Engine concept was replaced by the Strategy
// Layer (PROBEX_PRODUCT_SPEC.md §3 terminology). Removed entirely in M5.
export default function LegacyConsensusPage() {
  redirect('/dashboard/strategy')
}
