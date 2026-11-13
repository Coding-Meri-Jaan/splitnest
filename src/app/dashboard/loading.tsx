export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="h-16 w-full max-w-md sn-skeleton rounded-2xl" />
      <div className="h-28 w-full sn-skeleton rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 sn-skeleton rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-80 sn-skeleton rounded-2xl xl:col-span-2" />
        <div className="h-80 sn-skeleton rounded-2xl" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="h-80 sn-skeleton rounded-2xl xl:col-span-2" />
        <div className="h-80 sn-skeleton rounded-2xl" />
      </div>
    </div>
  );
}
