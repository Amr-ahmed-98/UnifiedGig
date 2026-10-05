export default function Loading() {
  return (
    <main className="w-full bg-canvas pb-24">
      <div className="mx-auto mt-10 grid max-w-6xl gap-5 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-60 animate-pulse rounded-3xl bg-panel-2/60" />
        ))}
      </div>
    </main>
  )
}
