import { PageHeaderSkeleton, Skeleton, CardSkeleton } from '@/components/ui/LoadingState'

/** Route-level loading skeleton for the Settings platform. */
export default function Loading() {
  return (
    <div className="page-container flex flex-col gap-6 pb-8">
      <PageHeaderSkeleton />
      <div className="flex flex-col md:flex-row gap-5 md:gap-8 items-start">
        <div className="flex md:flex-col gap-2 w-full md:w-[208px] md:flex-shrink-0">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={32} width="100%" />)}
        </div>
        <div className="flex-1 w-full flex flex-col gap-4">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={5} />
        </div>
      </div>
    </div>
  )
}
