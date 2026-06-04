export default function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="px-4 space-y-4 pt-5">
      {/* Header skeleton */}
      <div className="pb-3">
        <div className="skeleton h-6 w-48 mb-1.5" />
        <div className="skeleton h-3 w-32" />
      </div>

      {/* Card skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card-dark p-4">
          <div className="skeleton h-4 w-24 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-16 rounded-xl" />
            <div className="skeleton h-16 rounded-xl" />
          </div>
        </div>
      ))}

      {/* Chart skeleton */}
      <div className="card-dark p-4">
        <div className="skeleton h-4 w-36 mb-3" />
        <div className="skeleton h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
