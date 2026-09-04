export default function AppLoading() {
  return (
    <main aria-busy="true" aria-label="Loading" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-surface-2" />
      <div className="mt-3 h-5 w-72 max-w-full animate-pulse rounded bg-surface-2" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="card p-4">
            <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
            <div className="mt-3 h-4 w-24 animate-pulse rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </main>
  )
}
