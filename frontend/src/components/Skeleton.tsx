export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card space-y-3">
      <div className="skeleton h-4 w-1/3 rounded" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3 rounded" style={{ width: `${65 + i * 10}%` }} />
      ))}
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-slate-800/50">
      <div className="skeleton w-9 h-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-40 rounded" />
        <div className="skeleton h-3 w-24 rounded" />
      </div>
      <div className="skeleton h-5 w-16 rounded-full" />
      <div className="skeleton h-4 w-12 rounded" />
    </div>
  )
}

export function SkeletonMetric() {
  return (
    <div className="metric-card space-y-3">
      <div className="skeleton h-3 w-24 rounded" />
      <div className="skeleton h-8 w-32 rounded" />
      <div className="skeleton h-2.5 w-20 rounded" />
    </div>
  )
}
