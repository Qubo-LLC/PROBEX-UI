import { redirect } from 'next/navigation'

// Legacy route — the market catalog was replaced by the Live Feed
export default function LegacyMarketsPage() {
  redirect('/dashboard/live')
}
