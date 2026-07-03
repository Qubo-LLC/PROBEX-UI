import { redirect } from 'next/navigation'

// Legacy route — watchlists have no backend and no meaning for 5-minute
// markets (PROBEX_PRODUCT_SPEC.md §7 P4-05). Removed entirely in M5.
export default function LegacyWatchlistPage() {
  redirect('/dashboard')
}
