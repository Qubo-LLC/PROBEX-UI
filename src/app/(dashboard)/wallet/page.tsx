import { redirect } from 'next/navigation'

// Wallet was absorbed into Portfolio › Capital & Ledger by the IA consolidation
// (16 routes -> 9 domain pages). Kept as a redirect so existing bookmarks and
// in-app links keep resolving. Tab state lives in the URL, so this lands on
// the right tab rather than the domain's default.
export default function WalletRedirectPage() {
  redirect('/portfolio?view=capital')
}
