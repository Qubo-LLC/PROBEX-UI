import { redirect } from 'next/navigation'

// The retired PaperTrader console is removed from the dashboard. Paper trading
// now runs in the engine's sleeves; its runway, activity and current windows are
// on the Overview. Kept as a redirect so old bookmarks still resolve.
export default function PaperRedirectPage() {
  redirect('/')
}
