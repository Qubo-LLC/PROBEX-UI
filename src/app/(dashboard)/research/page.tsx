import { redirect } from 'next/navigation'

// Research was absorbed into Strategy by the IA consolidation (16 routes -> 9
// domain pages) and its tab was retired on 2026-09-16: /api/research/reports
// regenerates one-line restatements of Survival/markets/edges on every
// request, which now render at the foot of Strategy › Mechanism. Kept as a
// redirect so existing bookmarks and in-app links keep resolving.
export default function ResearchRedirectPage() {
  redirect('/strategy')
}
