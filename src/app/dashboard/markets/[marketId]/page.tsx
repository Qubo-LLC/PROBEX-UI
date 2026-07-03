import { redirect } from 'next/navigation'

// Legacy route — per-market detail has no backend endpoint (P2-05, ARCHIVED).
// Removed entirely in M5.
export default function LegacyMarketDetailPage() {
  redirect('/dashboard/live')
}
