export default function Loading() {
  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full h-full animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 border-b border-railmind-border pb-5">
        <div className="h-10 w-64 bg-surface-2 rounded-lg animate-pulse" />
        <div className="h-5 w-96 bg-surface-2 rounded-lg animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-surface-2 border border-railmind-border rounded-xl animate-pulse" />
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 mt-4">
        <div className="flex-1 h-[500px] bg-surface-2 border border-railmind-border rounded-xl animate-pulse" />
        <div className="w-full xl:w-[400px] flex flex-col gap-4">
          <div className="h-64 bg-surface-2 border border-railmind-border rounded-xl animate-pulse" />
          <div className="flex-1 bg-surface-2 border border-railmind-border rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}
