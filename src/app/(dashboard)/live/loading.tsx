import { PageHeaderSkeleton, Skeleton, TableSkeleton } from '@/components/ui/LoadingState'

/** Route-level loading skeleton for the Live Markets page. */
export default function Loading() {
  return (
    <div className="page-container flex flex-col gap-4 pb-8">
      <PageHeaderSkeleton withActions />
      {/* Ticker strip */}
      <Skeleton height={40} width="100%" />
      <TableSkeleton columns={6} rows={10} />
    </div>
  )
}
