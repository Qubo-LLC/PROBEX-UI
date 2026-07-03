import { redirect } from 'next/navigation'

// Legacy route — the capital story lives on Overview and Survival
// (PROBEX_PRODUCT_SPEC.md §3). Removed entirely in M5.
export default function LegacyPortfolioPage() {
  redirect('/dashboard')
}
