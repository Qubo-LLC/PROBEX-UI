import { Skeleton, StatCardSkeleton, CardSkeleton } from '@/components/ui/LoadingState'

/** Route-level loading skeleton for the dashboard overview/home. */
export default function Loading() {
  return (
    <div className="page-container flex flex-col gap-4 pb-8">
      {/* Hero / consensus bar */}
      <Skeleton height={56} width="100%" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3">
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
      </div>
    </div>
  )
}
