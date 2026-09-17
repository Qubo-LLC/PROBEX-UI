import { redirect } from 'next/navigation'

// Events was absorbed into System › Event Log by the IA consolidation
// (16 routes -> 9 domain pages). Kept as a redirect so existing bookmarks and
// in-app links keep resolving. Tab state lives in the URL, so this lands on
// the right tab rather than the domain's default — and a type filter carried
// on the old address (`/events?type=trade`) is forwarded, since the log reads
// its filter from the URL too.
export default async function EventsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { type } = await searchParams
  const single = Array.isArray(type) ? type[0] : type
  redirect(single ? `/system?view=events&type=${encodeURIComponent(single)}` : '/system?view=events')
}
