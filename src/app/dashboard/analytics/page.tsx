import { redirect } from 'next/navigation'

// Legacy route — historical analytics require backend persistence (P2)
// and are ARCHIVED until then (PROBEX_PRODUCT_SPEC.md §7). Removed in M5.
export default function LegacyAnalyticsPage() {
  redirect('/dashboard')
}
