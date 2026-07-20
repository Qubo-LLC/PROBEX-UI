import { PageHeaderSkeleton, PillRowSkeleton, TableSkeleton } from '@/components/ui/LoadingState'

/** Route-level loading skeleton for the Positions page. */
export default function Loading() {
  return (
    <div className="page-container flex flex-col gap-4 pb-8">
      <PageHeaderSkeleton withActions />
      <PillRowSkeleton count={3} />
      <TableSkeleton columns={7} rows={8} />
    </div>
  )
}
