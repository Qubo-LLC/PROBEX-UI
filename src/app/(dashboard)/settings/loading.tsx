import { PageHeaderSkeleton, Skeleton } from '@/components/ui/LoadingState'

/** Route-level loading skeleton for Settings: three stacked sections. */
export default function Loading() {
  return (
    <div className="page-container flex flex-col gap-6 pb-8">
      <PageHeaderSkeleton />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton height={16} width="40%" />
          <Skeleton height={44} width="100%" />
          <Skeleton height={44} width="100%" />
        </div>
      ))}
    </div>
  )
}
