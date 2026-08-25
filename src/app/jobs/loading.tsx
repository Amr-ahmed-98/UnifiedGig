import { SkeletonList } from '@/components/card-skeleton'

export default function Loading() {
  return (
    <main className="relative w-full bg-canvas pb-24">
      <div className="mx-auto mt-10 max-w-6xl px-5 sm:px-8">
        <SkeletonList count={4} />
      </div>
    </main>
  )
}