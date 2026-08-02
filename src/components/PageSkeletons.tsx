import { Skeleton } from './Skeleton'

export function WeightPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
      <Skeleton className="h-[80px] w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[80px] w-full" />
        <Skeleton className="h-[80px] w-full" />
        <Skeleton className="h-[80px] w-full" />
        <Skeleton className="h-[80px] w-full" />
      </div>
      <Skeleton className="h-[250px] w-full" />
    </div>
  )
}

export function MeasurementsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
      <div className="flex justify-center">
        <Skeleton className="h-[120px] w-[120px] rounded-full" />
      </div>
      <Skeleton className="h-[50px] w-full" />
      <Skeleton className="h-[250px] w-full" />
    </div>
  )
}

export function WorkoutsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
      <Skeleton className="h-[100px] w-full" />
      <div className="flex justify-between gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-10 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[80px] w-full" />
        <Skeleton className="h-[80px] w-full" />
        <Skeleton className="h-[80px] w-full" />
      </div>
    </div>
  )
}

export function ProgressPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[150px] w-full" />
      <Skeleton className="h-[250px] w-full" />
    </div>
  )
}

export function ProductsPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
      <Skeleton className="h-[45px] w-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[60px] w-full" />
      </div>
    </div>
  )
}

export function SettingsPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-[50px] w-full" />
      ))}
    </div>
  )
}
