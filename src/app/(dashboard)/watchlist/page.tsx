import { redirect } from 'next/navigation'

// Watchlist was absorbed into Markets › Watchlist by the IA consolidation
// (16 routes -> 9 domain pages). Kept as a redirect so existing bookmarks and
// in-app links keep resolving. Tab state lives in the URL, so this lands on
// the right tab rather than the domain's default.
export default function WatchlistRedirectPage() {
  redirect('/markets?view=watchlist')
}
