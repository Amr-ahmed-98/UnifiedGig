export default function Loading() {
  return (
    <main className="w-full bg-canvas pb-24">
      <div className="mx-auto mt-10 max-w-6xl space-y-4 px-5 sm:px-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-3xl bg-panel-2/60" />
        ))}
      </div>
    </main>
  )
}
