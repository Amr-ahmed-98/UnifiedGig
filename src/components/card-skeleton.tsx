export function CardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-edge/10 bg-panel/70 p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-panel-2" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/3 rounded-full bg-panel-2" />
          <div className="h-3 w-1/3 rounded-full bg-panel-2" />
        </div>
        <div className="h-6 w-20 rounded-full bg-panel-2" />
      </div>
      <div className="mt-6 flex gap-2">
        <div className="h-7 w-24 rounded-full bg-panel-2" />
        <div className="h-7 w-20 rounded-full bg-panel-2" />
        <div className="h-7 w-16 rounded-full bg-panel-2" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}